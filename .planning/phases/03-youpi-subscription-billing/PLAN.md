# Phase 3: Subscription & Billing Architecture (Path A)

## Executive Summary
- **Domain Data**: Firebase Auth + Cloud Firestore remain the source of truth for all business entities (`clients`, `invoices`, `workItems`, `profiles`, `reviews`, `notes`, `service_requests`).
- **Billing Records**: PostgreSQL via Supabase stores billing plans, subscriptions, payments, and audit logs, keyed to `firebase_uid TEXT`.
- **Access Control & Paywall**: Firebase Custom Claims (`crestflow_tier`, `crestflow_status`, `crestflow_valid_until`) cached on user token, synced with Postgres via Express backend.

---

## 1. Firestore Hardening (v2)

### 1.1 Collections & Rules Model
1. **`clients`**:
   - `read`: `isOwner(resource.data.userId) || isClient(resource.data.email)`.
   - `write`: `isOwner(request.resource.data.userId) && isValidClient(request.resource.data)`.
   - Enforces lowercase `email` on write.
2. **`invoices`**:
   - `read`: `isOwner(resource.data.userId) || isClient(resource.data.clientEmail)`.
   - `write`: `isOwner(request.resource.data.userId) && isValidInvoice(request.resource.data)`.
   - Denormalized fields: `clientEmail` (lowercase), `payeeName`, `payeeUpiId`.
3. **`workItems`**:
   - `read`: `isOwner(resource.data.userId) || isClient(resource.data.clientEmail)`.
   - `write`: `isOwner(request.resource.data.userId) && isValidWorkItem(request.resource.data)`.
   - Denormalized fields: `clientEmail` (lowercase).
4. **`profiles` (Split Architecture)**:
   - Root document `/profiles/{userId}`: Public profile (`name`, `phone`, `upiId`, `professionalTitle`, `servicesDescription`, `freelanceStartDate`, `workExperienceBio`).
   - Root validation `isValidProfile(data)` rejects any presence of `geminiApiKey`, `accountNumber`, `ifscCode`, `bankName`.
   - Private subcollection `/profiles/{userId}/private/settings`: Restricted to `isOwner(userId)`. Stores `geminiApiKey`, `accountNumber`, `ifscCode`, `bankName`.
5. **`reviews`**:
   - `create`: Any authenticated user can submit a review with `isApproved == false`.
   - `update`: Only owner can update, strictly restricted to toggling `isApproved`.
   - `read`: Public if `resource.data.isApproved == true` or `isOwner(resource.data.userId)`.
6. **`platform_settings`**:
   - `/platform_settings/billing`: `read: false`, `write: false`. Client clients never read/write platform settings directly. Bypass permitted via Firebase custom claim `billing_required: false`.
7. **`blocked_users`**:
   - `get`: Any authenticated user can check if they are blocked (`isBlocked()`).
   - `list / write`: Admin claim only (`request.auth.token.admin == true`).

---

## 2. PostgreSQL Billing Schema (Path A)

- **Database**: PostgreSQL / Supabase
- **Key**: `firebase_uid TEXT NOT NULL CHECK (char_length(trim(firebase_uid)) > 0 AND char_length(firebase_uid) <= 128)`
- **Tables**:
  - `public.plans`: `id`, `slug`, `tier`, `interval`, `price_paise`, `currency`, `features`, `is_active`, `created_at`, `updated_at`.
  - `public.subscriptions`: `id`, `firebase_uid`, `plan_id`, `tier`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `canceled_at`, `ended_at`, `reason`, timestamps.
    - Unique partial index: `CREATE UNIQUE INDEX uq_sub_single_active ON public.subscriptions (firebase_uid) WHERE (status IN ('active', 'trialing'));`
  - `public.payments`: `id`, `subscription_id`, `firebase_uid`, `order_id`, `payment_id`, `utr_number`, `amount_paise`, `status`, `provider`, `paid_at`, `raw_provider_payload`, timestamps.
  - `public.subscription_audit_logs`: Immutable audit log populated via database trigger `fn_audit_subscriptions()` on every INSERT/UPDATE/DELETE.
- **RLS & Access**:
  - `ENABLE ROW LEVEL SECURITY` on all tables.
  - `REVOKE ALL` from `anon` and `authenticated`.
  - Accessible strictly via `service_role` from the Express billing server.

---

## 3. Express Billing API & Middleware

### 3.1 Firebase Token Authentication Middleware
```ts
import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  try {
    // checkRevoked = true ensures revoked tokens or blocked users fail immediately
    const decodedToken = await admin.auth().verifyIdToken(match[1].trim(), true);
    req.user = decodedToken;
    next();
  } catch (err: any) {
    if (err.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Token has been revoked. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}
```

### 3.2 Claim Re-synchronization (`/api/billing/status`)
1. User requests `GET /api/billing/status` carrying their Firebase ID token.
2. Express backend queries `public.subscriptions` in PostgreSQL for the user's latest active/trialing record.
3. If active, sets custom user claims:
   ```ts
   const claims = {
     crestflow_tier: subscription.tier,
     crestflow_status: subscription.status,
     crestflow_valid_until: Math.floor(new Date(subscription.current_period_end).getTime() / 1000) + GRACE_PERIOD_SECONDS
   };
   await admin.auth().setCustomUserClaims(decodedToken.uid, claims);
   ```
4. Returns `{ subscription, claims }` to the frontend, prompting the frontend to invoke `user.getIdToken(true)` to refresh cached client-side claims.

---

## 4. Migration & Maintenance Scripts

All scripts default to dry-run mode and require explicit `--execute` to apply changes:
- `scripts/split-profiles-migration.ts`: Splits sensitive bank credentials and Gemini API keys into `/profiles/{uid}/private/settings`.
- `scripts/lowercase-client-emails.ts`: Lowercases and trims all `clients.email` records.
- `scripts/backfill-client-emails.ts`: Denormalizes lowercase `clientEmail`, `payeeName`, and `payeeUpiId` onto `invoices` and `workItems`.
- `scripts/backfill-is-public-and-approved.ts`: Backfills review approval and visibility flags.
- `scripts/seed-platform-settings.ts`: Seeds `/platform_settings/billing` with `{ enabled: false }`.
- `scripts/grandfather-beta-users-firebase.ts`: Grants 30-day Pro claims to confirmed beta testers.
