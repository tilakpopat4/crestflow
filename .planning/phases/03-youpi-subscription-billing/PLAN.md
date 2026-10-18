# Comprehensive Implementation Plan: YouPI PG Subscription Billing Engine (Revised v2)

**Branch:** `feat/youpi-subscription-billing`  
**Status:** REVISED / AWAITING USER APPROVAL  
**Feature Flag Storage:** Database Settings Table (`public.platform_settings -> billing_config`)

---

## 1. Executive Summary & Architecture Overview

This project introduces server-verified subscription billing for the CrestFlow freelancing platform using the self-hosted **YouPI PG (UPI gateway)**. Because UPI collection via YouPI cannot perform recurring auto-debit, subscriptions operate on **prepaid fixed duration periods** (Monthly ₹49 = 4,900 paise, Annual ₹499 = 49,900 paise).

### Core Architectural Invariants
1. **Supabase-Only Billing State**: All billing tables (`plans`, `subscriptions`, `payments`, `subscription_audit_logs`, `subscription_whitelist`, `platform_settings`) live **exclusively** in Supabase PostgreSQL. Firestore stores **zero** billing records.
2. **Strict RLS & Service-Role Isolation**: Authenticated client browsers receive `SELECT`-only privileges on their own rows (`auth.uid() = user_id`). **All database writes** (`INSERT`, `UPDATE`, `DELETE`) are performed exclusively by the backend Express server using `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is never prefixed with `VITE_` and never bundled into client assets.
3. **UUID Foreign Keys Everywhere**: User references across all subscription tables strictly use `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
4. **Server-Side Paywall & Dynamic DB Feature Flag**: Access is enforced at both PostgreSQL RLS level (`has_active_access(user_id)`) and Express middleware (`requireActiveSubscription`). The feature flag lives in `public.platform_settings`: when disabled or outside the rollout cohort, `has_active_access()` returns `TRUE`.
5. **Anti-DoS Single-Slot Queue Protection**: The YouPI single-slot FIFO queue is protected from denial-of-service via email verification checks, a global queue-depth cap, account-age/CAPTCHA gates, a max of 1 open payment session per user, per-IP rate limiting, live status reconciliation, and automatic slot release.

```
+-----------------------------------------------------------------------------------------+
|                                    CRESTFLOW CLIENT                                     |
|  - Paywall on Signup/Login (Mandatory ₹49 Pro or VIP Whitelist)                         |
|  - RLS-Restricted Browser: SELECT-only queries via Supabase Anon Key                    |
|  - Queue UX: Shows queue position, 5-min timeout counter, explicit "Cancel" slot-release|
+-----------------------------------------------------------------------------------------+
                                      |
                                      | REST / JSON (Authenticated with Supabase JWT)
                                      v
+-----------------------------------------------------------------------------------------+
|                             CRESTFLOW BACKEND (Node/Express)                            |
|  - Hosted on Node.js Runtime (Local port 5000 / Production VPS or PaaS)                 |
|  - trust proxy configured for accurate IP rate limiting                                 |
|  - Service-Role Supabase Client (Exclusive Write Authority)                             |
|  - Abuse Controls: email_confirmed_at check, Account-age/CAPTCHA, Max 1 open order,     |
|    Global queue-depth cap (max 5 open orders), Live status reconciliation               |
|  - PaymentProvider Interface -> YouPiPaymentProvider Adapter                            |
|  - Authoritative HMAC-SHA256 Webhook Receiver + Out-of-Band GET Verification            |
|  - Postgres Advisory Lock Cron Engine + Protected /api/cron HTTP Fallback              |
+-----------------------------------------------------------------------------------------+
            |                                           ^
            | POST /api/v1/payments                     | POST Webhook (Public HTTPS via Reverse Proxy)
            v                                           |
+-------------------------------------------------------+---------------------------------+
|                                 YOUPI PG V2 GATEWAY                                     |
|  - Single-Slot FIFO Queue (Protected against DoS via 5m auto-cancel)                   |
|  - Realtime Banking SMS / Gmail Observer Parsing                                        |
|  - HMAC-SHA256 Signed Webhook Engine (Header: X-Gateway-Signature)                      |
+-----------------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------------+
|                               SUPABASE POSTGRESQL DATABASE                              |
|  - platform_settings (billing_config: enabled, rollout_percentage, beta_cohorts)        |
|  - plans (code, price_paise, period_days, entitlement_limits)                           |
|  - subscriptions (user_id UUID, plan_id, status: active|grace|expired, period_end)      |
|  - payments (provider_order_id UNIQUE, amount_paise, status, raw_payload)               |
|  - subscription_audit_logs (append-only ledger of all state transitions)                |
|  - RLS Guard: has_active_access(UUID) computes dynamically from period_end + grace      |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Source-Code Verification Matrix (YouPI PG Source Cross-Check)

Every endpoint, header, payload field, and state name has been verified against the active YouPI PG codebase in this repository with exact file citations and quoted code:

| Integration Element | Verified Value / Contract | YouPI PG Source Code Citation | Quoted Source Code Snippet |
| :--- | :--- | :--- | :--- |
| **Order Creation Endpoint** | `POST /api/v1/payments` | [`youpi-pg/packages/merchant-sdk/src/client.js:38-40`](file:///d:/crestflow/youpi-pg/packages/merchant-sdk/src/client.js#L38-L40), [`youpi-pg/openapi.yaml:18`](file:///d:/crestflow/youpi-pg/openapi.yaml#L18) | `async createPayment(params) { const url = \`${this.apiUrl}/api/v1/payments\`;` |
| **Order Creation Payload** | `{ orderId, amount, currency, customer, description, returnUrl, metadata }` | [`youpi-pg/packages/merchant-sdk/src/client.js:51-58`](file:///d:/crestflow/youpi-pg/packages/merchant-sdk/src/client.js#L51-L58) | `const payload = { orderId: params.orderId, amount: params.amount, currency: params.currency \|\| 'INR', returnUrl: params.returnUrl, customer: params.customer, metadata: params.metadata };` |
| **Payment Status Endpoint** | `GET /api/v1/payments/{id}` | [`youpi-pg/packages/merchant-sdk/src/client.js:93-95`](file:///d:/crestflow/youpi-pg/packages/merchant-sdk/src/client.js#L93-L95), [`youpi-pg/openapi.yaml:78`](file:///d:/crestflow/youpi-pg/openapi.yaml#L78) | `async getPayment(paymentId) { const url = \`${this.apiUrl}/api/v1/payments/${paymentId}\`; const res = await fetch(url);` |
| **Slot Release / Cancel** | `POST /api/v1/checkout/{id}/cancel` | [`youpi-pg/openapi.yaml:106-111`](file:///d:/crestflow/youpi-pg/openapi.yaml#L106-L111) | `/api/v1/checkout/{id}/cancel: post: summary: Cancel Payment Session description: Explicitly cancels an active or queued payment session, immediately releasing the UPI concurrency slot.` |
| **Webhook Signature Header** | `X-Gateway-Signature: sha256=<64_hex_hash>` | [`youpi-pg/packages/core/src/webhook-engine.js:53`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L53) | `'X-Gateway-Signature': \`sha256=${signature}\`,` |
| **Webhook Event Header** | `X-Gateway-Event: SUCCESS` | [`youpi-pg/packages/core/src/webhook-engine.js:52`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L52) | `'X-Gateway-Event': publicOutcome,` |
| **Webhook Delivery ID** | `X-Gateway-Delivery-Id: <uuid>` | [`youpi-pg/packages/core/src/webhook-engine.js:54`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L54) | `'X-Gateway-Delivery-Id': deliveryId,` |
| **Webhook Timestamp Header** | `X-Gateway-Timestamp: <timestamp_ms>` | [`youpi-pg/packages/core/src/webhook-engine.js:55`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L55) | `'X-Gateway-Timestamp': timestamp` |
| **Webhook Payload Fields** | `{ event, paymentId, orderId, amount, amountPaise, currency, method, completedAt, metadata }` | [`youpi-pg/packages/core/src/webhook-engine.js:33-43`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L33-L43) | `const payloadObj = { event: publicOutcome, paymentId: session.id, orderId: session.orderId, amount: toRupeesString(session.amountPaise), amountPaise: Number(session.amountPaise), currency: session.currency \|\| 'INR', method: session.method \|\| 'UPI', completedAt: session.completedAt ? session.completedAt.toISOString() : new Date().toISOString(), metadata: session.metadata \|\| {} };` |
| **Order States Enum** | `INITIATED`, `ACTIVE`, `QUEUED`, `PROCESSING`, `SUCCESS`, `FAILED`, `EXPIRED`, `CANCELLED` | [`youpi-pg/packages/core/src/state-machine.js:8-31`](file:///d:/crestflow/youpi-pg/packages/core/src/state-machine.js#L8-L31) | `export const VALID_TRANSITIONS = Object.freeze({ [PaymentStatus.INITIATED]: [PaymentStatus.ACTIVE, PaymentStatus.QUEUED, PaymentStatus.CANCELLED], [PaymentStatus.QUEUED]: [PaymentStatus.ACTIVE, PaymentStatus.CANCELLED], [PaymentStatus.ACTIVE]: [PaymentStatus.PROCESSING, PaymentStatus.EXPIRED, PaymentStatus.CANCELLED], [PaymentStatus.PROCESSING]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED], ... });` |

---

## 3. Data Store Audit & Firestore Paywall Rules

### Data Store Entity Distribution
- **Supabase PostgreSQL (Authoritative Core & Billing)**:
  - `public.profiles`: Core user profile data.
  - `public.clients` & `public.sub_clients`: Client accounts and sub-clients.
  - `public.invoices`: Invoices and line items.
  - `public.work_items`: Work logs and deliverables.
  - `public.reviews`: Client ratings and reviews.
  - `public.platform_settings`: System configuration and billing rollout flags.
  - `public.plans`: Subscription tiers, pricing in paise, entitlement limits.
  - `public.subscriptions`: Subscription status, period timestamps.
  - `public.payments`: Payment transaction records, UTRs, raw gateway payloads.
  - `public.subscription_audit_logs`: Immutable audit trail of subscription events.
  - `public.subscription_whitelist`: VIP email whitelist.
  - `public.admin_users`: Explicit administrator UUID registry.
- **Firebase Firestore (Legacy / Real-Time Client Mirror)**:
  - `profiles`, `clients`, `invoices`, `workItems`, `notes`, `reviews`.
  - **Zero billing entities**: No subscriptions, payments, or plan tables exist in Firestore.

### Enforcing Paywall in Firestore Rules (`firestore.rules`)
To prevent paywall bypass on entities stored in Firestore:
1. **Expiry-Timestamp Custom Claim**: When a subscription is confirmed or extended, the Express server updates the user's Firebase Auth Custom Claims via the Firebase Admin SDK:
   ```typescript
   await admin.auth().setCustomUserClaims(firebaseUid, {
     supabase_uuid: supabaseUserUuid,
     pro_expiry_timestamp: Math.floor(currentPeriodEnd.getTime() / 1000), // integer seconds
     is_whitelisted: isWhitelisted ? 1 : 0
   });
   ```
2. **Forced Token Refresh**: Immediately following payment success confirmation, the client calls `await user.getIdToken(true)` to refresh its JWT and receive the updated timestamp claim.
3. **Firestore Security Rule**:
   ```javascript
   function hasActiveProAccess() {
     return request.auth != null && (
       request.auth.token.is_whitelisted == 1 ||
       (request.auth.token.pro_expiry_timestamp is int &&
        request.time < timestamp.date(request.auth.token.pro_expiry_timestamp * 1000))
     );
   }

   match /clients/{clientId} {
     allow read: if true;
     allow create: if isOwner(incoming().userId) && hasActiveProAccess() && isValidClient(incoming());
     allow update, delete: if isOwner(existing().userId);
   }

   match /invoices/{invoiceId} {
     allow read: if isSignedIn();
     allow create: if isOwner(incoming().userId) && hasActiveProAccess() && isValidInvoice(incoming());
     allow update, delete: if isOwner(existing().userId);
   }

   match /workItems/{workItemId} {
     allow read: if isSignedIn();
     allow create: if isOwner(incoming().userId) && hasActiveProAccess() && isValidWorkItem(incoming());
     allow update, delete: if isOwner(existing().userId);
   }
   ```
   **Data Preservation Guarantee**: `allow read`, `allow update`, and `allow delete` on existing records remain intact so expired users can always access, export, or manage existing data.

---

## 4. Hosting & Network Architecture

### Backend & Webhook Routing
- **Express Server Hosting**: Hosted on Node.js (port 5000 in local development; production VPS / containerized service).
- **Reverse Proxy & Trust Proxy**:
  - Express configured with `app.set('trust proxy', 1)` (or specified trusted CIDR subnet) to ensure `req.ip` reflects the genuine client IP rather than proxy headers.
- **Webhook Network Path**:
  - **Production**: Public HTTPS URL `https://api.crestflow.com/api/youpi-webhook` terminated by Nginx / Cloudflare and reverse-proxied to Express port 5000.
  - **Local Development**: Exposed via reverse proxy / tunnel (e.g. `ngrok http 5000`) configured in YouPI PG merchant settings.
- **Cron Jobs Engine & Advisory Locks**:
  - Primary: In-process `node-cron` daemon in the Express service. Every cron execution wraps its logic in a PostgreSQL advisory lock:
    ```sql
    SELECT pg_try_advisory_lock(88992211); -- Returns false if another instance is running
    ```
    If false, the instance cleanly exits without duplicate execution.
  - Secondary HTTP Fallback: Endpoint `POST /api/cron/reconcile` protected by constant-time comparison against `CRON_SECRET` using `crypto.timingSafeEqual`.

---

## 5. Phased Implementation Roadmap

### Phase 1: Database Schema, Dynamic Feature Flags & Reversible Migrations
**Goal:** Create normalized Supabase Postgres tables with UUID foreign keys, strict RLS, dynamic settings, and grandfathering migration.

- **Artifacts:**
  - `supabase/migrations/20261018_subscription_billing.sql`
- **Tables to Create:**
  1. `public.platform_settings`:
     - `key` TEXT PRIMARY KEY
     - `value` JSONB NOT NULL
     - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
     - `updated_by` UUID REFERENCES auth.users(id)
     - *Seed value:* `key = 'billing_config'`, `value = {"enabled": false, "rollout_percentage": 0, "whitelisted_user_ids": [], "beta_cohort_emails": []}`
  2. `public.plans`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `code` TEXT NOT NULL UNIQUE ('pro_monthly', 'pro_annual')
     - `name` TEXT NOT NULL
     - `price_paise` BIGINT NOT NULL CHECK (price_paise >= 0)
     - `period_days` INT NOT NULL DEFAULT 30
     - `entitlement_limits` JSONB NOT NULL DEFAULT '{}'::jsonb
     - `is_active` BOOLEAN NOT NULL DEFAULT true
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  3. `public.subscriptions`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `user_id` UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
     - `plan_id` UUID NOT NULL REFERENCES public.plans(id)
     - `status` TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'grace', 'expired', 'canceled'))
     - `current_period_start` TIMESTAMPTZ
     - `current_period_end` TIMESTAMPTZ
     - `grace_period_days` INT NOT NULL DEFAULT 3
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now(), `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  4. `public.payments`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
     - `plan_id` UUID NOT NULL REFERENCES public.plans(id)
     - `provider_order_id` TEXT NOT NULL UNIQUE
     - `provider_payment_id` TEXT
     - `internal_reference` TEXT NOT NULL UNIQUE
     - `amount_paise` BIGINT NOT NULL
     - `status` TEXT NOT NULL CHECK (status IN ('INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'SUSPICIOUS', 'SUSPICIOUS_LATE_SUCCESS', 'EXPIRED', 'CANCELLED'))
     - `utr` TEXT
     - `raw_provider_payload` JSONB
     - `paid_at` TIMESTAMPTZ
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  5. `public.subscription_audit_logs`:
     - `id` BIGSERIAL PRIMARY KEY
     - `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
     - `previous_status` TEXT
     - `new_status` TEXT NOT NULL
     - `reason` TEXT NOT NULL
     - `actor` TEXT NOT NULL -- 'webhook', 'cron', 'admin:uuid', 'user'
     - `metadata` JSONB DEFAULT '{}'::jsonb
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  6. `public.subscription_whitelist`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `email` TEXT NOT NULL UNIQUE
     - `reason` TEXT NOT NULL DEFAULT 'Approved by Admin'
     - `added_by` UUID REFERENCES auth.users(id)
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  7. `public.admin_users`:
     - `user_id` UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  8. `public.webhook_deliveries`:
     - `delivery_id` UUID PRIMARY KEY
     - `order_id` TEXT NOT NULL
     - `received_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- **Grandfathering Migration Step for Existing Users**:
  ```sql
  -- Grant all existing registered users a 30-day complimentary subscription period
  INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  SELECT 
    u.id,
    (SELECT id FROM public.plans WHERE code = 'pro_monthly' LIMIT 1),
    'active',
    now(),
    now() + INTERVAL '30 days'
  FROM auth.users u
  ON CONFLICT (user_id) DO NOTHING;
  ```
- **RLS Configuration**:
  - `ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY "Users can read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);`
  - **Zero client writes**: No `INSERT`, `UPDATE`, or `DELETE` policy is granted to `anon` or `authenticated` roles. All writes occur via Supabase `service_role` on the Express backend.
  - Same pattern applied to `payments`, `subscription_audit_logs`, and `subscription_whitelist`.
- **Hardened Server-Side Paywall Guard Function (`has_active_access`)**:
  ```sql
  CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  DECLARE
    config_val JSONB;
    user_email_val TEXT;
    confirmed_at_val TIMESTAMPTZ;
    is_globally_enabled BOOLEAN;
    rollout_pct INT;
    is_whitelisted_cohort BOOLEAN;
  BEGIN
    -- 1. Read dynamic settings
    SELECT value INTO config_val FROM public.platform_settings WHERE key = 'billing_config';
    is_globally_enabled := COALESCE((config_val->>'enabled')::boolean, false);
    
    -- If billing is globally OFF, grant full access
    IF NOT is_globally_enabled THEN
      RETURN TRUE;
    END IF;

    -- 2. Check cohort rollout
    rollout_pct := COALESCE((config_val->>'rollout_percentage')::int, 0);
    SELECT email, email_confirmed_at INTO user_email_val, confirmed_at_val FROM auth.users WHERE id = user_uuid;
    
    -- Check specific beta cohorts
    is_whitelisted_cohort := (config_val->'whitelisted_user_ids') ? user_uuid::text
      OR (user_email_val IS NOT NULL AND (config_val->'beta_cohort_emails') ? user_email_val);
      
    IF NOT is_whitelisted_cohort AND (abs(hashtext(user_uuid::text)) % 100) >= rollout_pct THEN
      -- User is not in active billing cohort; grant access
      RETURN TRUE;
    END IF;

    -- 3. Whitelist check: matches lowercase email against confirmed emails ONLY
    IF user_email_val IS NOT NULL AND confirmed_at_val IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.subscription_whitelist WHERE LOWER(email) = LOWER(user_email_val)
    ) THEN
      RETURN TRUE;
    END IF;

    -- 4. Dynamic period calculation (computed from current_period_end + grace, NOT stored status string)
    RETURN EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = user_uuid
        AND (current_period_end + (grace_period_days || ' days')::INTERVAL) > now()
    );
  END;
  $$;
  ```
  Enforced via `WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()))` on `clients`, `work_items`, and `invoices`.

---

### Phase 2: Express Backend Server & Anti-DoS Order Creation
**Goal:** Setup secure Express backend with verified-email gating, single open order lock, global queue depth cap, and rate limiting.

- **Files:**
  - `server/index.ts`: Express application running on port 5000 with `app.set('trust proxy', 1)`.
  - `server/middleware/auth.ts`: Validates Supabase JWT using server-side `supabase.auth.getUser()`, asserts `user.email_confirmed_at IS NOT NULL`.
  - `server/middleware/adminAuth.ts`: Asserts user is in `public.admin_users` table or `app_metadata.role === 'admin'`.
  - `server/providers/PaymentProvider.ts`: Provider-agnostic interface (`createOrder`, `verifyWebhook`, `queryStatus`, `cancelOrder`).
  - `server/providers/YouPiPaymentProvider.ts`: YouPI PG adapter interacting with `POST /api/v1/payments`, `GET /api/v1/payments/{id}`, and `POST /api/v1/checkout/{id}/cancel`.
  - `server/routes/billing.ts`:
    - `POST /api/billing/create-order`:
      - **Account-Age & Verification Gate**: Asserts `email_confirmed_at IS NOT NULL` and account is at least 1 hour old (`Date.now() - new Date(user.created_at).getTime() > 3600000`) or verifies CAPTCHA token.
      - **Global Queue-Depth Cap**: Queries `payments` count in `['ACTIVE', 'QUEUED', 'PROCESSING']`. If platform-wide open orders $\ge 5$, returns HTTP 429 (`SYSTEM_QUEUE_FULL`, "Payment gateway is processing high volume, please retry in 2 minutes").
      - **User Order Lock with Real-Time Reconciliation**: Queries user's latest open order. If found, queries YouPI PG via `GET /api/v1/payments/{paymentId}`. If YouPI reports it as terminal (`CANCELLED`, `EXPIRED`, `FAILED`), updates DB to terminal state immediately and allows user to proceed. If still active, returns existing checkout URL instead of duplicating orders.
      - **Per-User & Per-IP Rate Limiting**: Max 3 order attempts per 10 minutes.
      - Resolves price in paise strictly from `public.plans` DB table (ignores client amount).
      - Calls `YouPiPaymentProvider.createOrder()` and inserts `INITIATED` record via `service_role`.
    - `POST /api/billing/cancel-order`: Explicitly cancels active session via `POST /api/v1/checkout/{id}/cancel` to immediately free the YouPI single-slot queue.
- **Residual Risk Documentation**:
  - *Multi-Account DoS*: A coordinated attacker with multiple confirmed email accounts could cycle orders into the queue. Mitigated by global queue-depth cap (max 5 open orders platform-wide), IP velocity limits, account-age/CAPTCHA barriers, and YouPI's aggressive 5-minute session timeout with automatic slot cancellation.

---

### Phase 3: Authoritative Webhook Receiver & Dual-Verification Engine
**Goal:** Implement zero-trust server-to-server webhook handler verifying HMAC-SHA256 signatures, replay window, out-of-band GET confirmation, idempotency, and atomic period math.

- **Files:**
  - `server/routes/webhook.ts`: Mounted at `/api/youpi-webhook`.
  - `server/services/confirmationService.ts`: Core atomic transaction handler.
- **Security Checkpoints**:
  1. **Raw Body Buffer Verification**: Computes HMAC-SHA256 over raw unparsed payload bytes using `YOUPI_WEBHOOK_SECRET` and performs constant-time comparison (`crypto.timingSafeEqual`) against `X-Gateway-Signature`.
  2. **Timestamp Signature Coverage & Replay Window**:
     - *Cryptographic Fact*: In YouPI PG (`packages/core/src/webhook-engine.js:46-56`), the HMAC signature covers **only** the JSON body string, **not** the `X-Gateway-Timestamp` header.
     - *Defense*: Server strictly verifies that `|Date.now() - Number(timestamp)| < 300000` (5-minute window) **and** inserts `X-Gateway-Delivery-Id` into `public.webhook_deliveries(delivery_id)`. If delivery ID already exists, drops duplicate without re-processing.
  3. **Mandatory Out-of-Band GET Verification**:
     - Upon receiving webhook, the server issues `GET /api/v1/payments/{paymentId}` to the YouPI Gateway.
     - Asserts gateway status is strictly `SUCCESS`.
     - Asserts `amountPaise` (integers only) matches expected plan price in DB.
     - Asserts `orderId` matches DB record.
     - Asserts `metadata.userId` matches DB user.
  4. **Late-`SUCCESS` after `EXPIRED` Handling**:
     - If the order was already marked `EXPIRED` in CrestFlow (e.g., bank observer received SMS after customer timeout):
       - Do **NOT** auto-activate the subscription.
       - Transition status to `SUSPICIOUS_LATE_SUCCESS`.
       - Record in `subscription_audit_logs`.
       - Push to Admin Review Queue with visual banner so admin can verify bank credit and approve manually.
  5. **Idempotency Guard**: If `provider_order_id` is already in state `SUCCESS`, returns HTTP 200 without second period extension.
  6. **Atomic Period Math in PostgreSQL Transaction**:
     ```sql
     UPDATE public.subscriptions
     SET current_period_end = GREATEST(now(), COALESCE(current_period_end, now())) + (plan_period_days || ' days')::INTERVAL,
         status = 'active',
         updated_at = now()
     WHERE user_id = target_user_id;
     ```
  7. **Firebase Custom Claim Sync**: Express backend updates Firebase Auth custom claims (`pro_expiry_timestamp: Math.floor(newPeriodEnd.getTime()/1000)`).
- **Verification Criteria:**
  - Valid webhook extends period by exactly 30 or 365 days.
  - Duplicate webhook returns 200 without second extension.
  - Forged signature returns HTTP 401.
  - Late success after expiry flags `SUSPICIOUS_LATE_SUCCESS` without auto-activation.

---

### Phase 4: Entitlement Engine & Paywall UX (Queue Feedback)
**Goal:** Enforce mandatory paywall across client and server with clear queue feedback.

- **Files:**
  - `src/lib/entitlements.ts` (Client) & `server/services/entitlements.ts` (Server):
    - `getEntitlements(userId)` returns `{ hasActiveSubscription, canCreateInvoice, canExportCleanPdf, isWhitelisted, isInGracePeriod }`.
  - `src/components/SubscriptionModal.tsx`:
    - Shows YouPI checkout modal with real-time `queuePosition` display (e.g., "Queue position #1 - Estimated wait: 45 seconds").
    - 5-minute visual countdown timer.
    - Explicit "Cancel Order" button invoking `/api/billing/cancel-order` to immediately release YouPI queue slot.
  - `src/components/PaywallGate.tsx` / `src/App.tsx`:
    - Enforces mandatory subscription: Unsubscribed users without VIP whitelist cannot access tool features; prompted with ₹49 checkout modal.
- **Data Preservation Guarantee:**
  - Expired subscriptions NEVER delete client or invoice data; past invoices and client contact info remain strictly read-only and always downloadable.
- **Verification Criteria:**
  - Unsubscribed user is blocked from tool actions with clean paywall.
  - Whitelisted email bypasses paywall seamlessly.

---

### Phase 5: Automated Renewal Reminders, Grace Period & Reconciliation Cron
**Goal:** Background jobs for advance renewal alerts, grace period handling, and pending order reconciliation.

- **Files:**
  - `server/cron/subscriptionCron.ts`:
    - **Single-Execution Advisory Lock**: Every run requests `pg_try_advisory_lock(88992211)`. If locked, cleanly skips.
    - **Renewal Reminder Job (Daily 6:00 AM)**: Identifies subscriptions expiring in 7, 3, and 1 days; schedules email/WhatsApp notifications.
    - **Grace Period Handler**: Evaluates `current_period_end < now()` and `current_period_end + (grace_period_days || ' days')::INTERVAL > now()`.
    - **Reconciliation Job (Hourly)**: Queries YouPI PG (`GET /api/v1/payments/{paymentId}`) for pending orders older than 15 minutes to reconcile missed webhooks or flag unresolved items.
- **Verification Criteria:**
  - Automated grace period transition occurs without data disruption.
  - Reconciliation recovers pending payments that succeeded at the gateway.

---

### Phase 6: Admin Review Console & GST-Compliant Tax Invoices
**Goal:** Admin-only VIP whitelist management, manual payment override, and tax invoice generation with configurable GST rules.

- **Configuration Flags:**
  - `GST_REGISTERED`: boolean (`true` -> Generates official Tax Invoice; `false` -> Generates plain Payment Receipt).
  - `PRICING_INCLUSIVE_GST`: boolean (`true` -> ₹49 includes GST; `false` -> 18% GST added at checkout).
  - `SAC_CODE_DEFAULT`: string constant `"998313"` (Information Technology Software Services).
  - **Open Question for CA**: *"Confirm exact 6-digit SAC code (e.g. 998313 vs 998314) and whether MSME / composite exemption applies for under ₹20L/₹40L annual turnover."*
- **Files:**
  - `server/routes/admin.ts`: Admin-only endpoints for whitelist CRUD and manual payment approve/reject, protected by `adminAuth` middleware and writing to `subscription_audit_logs`.
  - `src/components/admin/AdminPaymentApprovals.tsx`: Verification queue showing bank UTR, observer confidence level, and one-click manual approve/reject.
  - `server/services/subscriptionInvoiceService.ts`: Automatically generates a PDF tax invoice/receipt (reusing CrestFlow's invoice engine).

---

### Phase 7: Automated Test Suite & Security Hardening
**Goal:** Rigorous test coverage for all security requirements and edge cases.

- **Test Files:**
  - `tests/unit/entitlements.test.ts`: Entitlement rules, VIP bypass, grace period limits.
  - `tests/unit/periodMath.test.ts`: Dynamic period calculation and atomic extension logic.
  - `tests/integration/rlsBypass.test.ts`: **Proves that a direct client-side Supabase attempt to insert or update subscription status fails with `42501` (insufficient_privilege).**
  - `tests/integration/webhook.test.ts`:
    - Valid signature + out-of-band GET success -> 200 OK + period extended.
    - Invalid signature -> 401 Unauthorized.
    - Replayed webhook (stale timestamp) -> 400 Bad Request.
    - Duplicate delivery ID -> 200 OK, no duplicate extension.
    - Amount mismatch -> 422 Unprocessable + marked SUSPICIOUS.
    - Late success after expiry -> marked SUSPICIOUS_LATE_SUCCESS, no auto-activate.
  - `tests/integration/abuseControls.test.ts`: Unconfirmed email rejected, second concurrent order blocked, global queue cap enforced, rate limits enforced.
- **Verification Criteria:**
  - 100% of test suite passes.
  - Zero PII in logs (masked phone numbers, emails, and transaction IDs).

---

### Phase 8: Rollout Runbook & Feature Flag Control
**Goal:** Controlled dark launch managed via database settings.

- **Configuration:**
  - Default: `billing_config.enabled = false` in `platform_settings` (App operates identically to current behavior; paywall disabled).
  - Step 1: Enable for platform admin account via email whitelist.
  - Step 2: Enable for beta cohort via `whitelisted_user_ids` or `rollout_percentage`.
  - Step 3: Full production rollout (`enabled = true`, `rollout_percentage = 100`).
  - Instant rollback procedure: update `platform_settings` setting `enabled = false`.

---

## 6. Definition of Done
1. All unit and integration tests pass, including client RLS bypass test.
2. The threat-model checklist confirms all 18 security invariants are verified.
3. Subscriptions activate **only** via server-verified HMAC webhooks with out-of-band GET confirmation or admin manual override.
4. Setting `billing_config.enabled = false` in `platform_settings` restores existing behavior with zero regressions.
