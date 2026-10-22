# CrestFlow Billing Specification

This specification is the authoritative source of truth for CrestFlow's billing architecture, Firestore security controls, lifecycle states, and anti-bypass enforcement.

---

## 1. Plans and Tiers

CrestFlow offers four distinct operational tiers designed for freelance video editors, motion designers, and creative professionals:

| Plan | Tier Key | Billing Interval | Price (INR) | Features & Limits |
| :--- | :--- | :--- | :--- | :--- |
| **Free / Trial** | `trial` | 7 Days | ₹1 today (non-refundable) | Full Pro feature access for 7 days, up to 3 active clients, unlimited invoices, direct UPI QR generation. |
| **Pro Monthly** | `pro_monthly` | Monthly | ₹79 / mo | Unlimited clients, unlimited invoices, automated 6 AM delivery, client portal, review collection, direct UPI payment tracking. |
| **Pro Quarterly** | `pro_quarterly` | 3 Months | ₹199 / quarter | All Pro Monthly features, quarterly billing (~₹66/mo). |
| **Pro 6-Month** | `pro_half` | 6 Months | ₹449 / 6 mo | All Pro features, 6-month locked pricing (~₹75/mo). |
| **Pro Annual** | `pro_yearly` | Annual | ₹899 / yr | All Pro features, annual billing (~₹75/mo). |

Configurable Application Origin: `BASE_URL` (e.g. `https://crestflow.app` or custom domain via Worker env `BASE_URL`).

---

## 2. Trial Flow & Anti-Abuse Trial Ledger

### 2.1 Collection: `trial_ledger/{hash}`
- **Purpose**: Prevent repeated free-trial exploitation by churning Google accounts or disposable credentials.
- **Document Key (`hash`)**: SHA-256 hash of normalized phone number (`sha256(e164_phone)`) or normalized primary email address.
- **Fields**:
  - `hash`: `string` (SHA-256 hex digest)
  - `claimedByUid`: `string` (Firebase Auth UID)
  - `claimedAt`: `timestamp`
  - `trialEnd`: `timestamp`
- **Security Rule**:
  - `allow read, write: if false;` (Clients can NEVER read or write the trial ledger directly. Managed strictly via Cloud Functions / Cloudflare Worker service role).

---

## 3. Subscription Document & State Machine

### 3.1 Collection: `subscriptions/{uid}`
- **Purpose**: Authoritative document representing a freelancer's current subscription status and access entitlement.
- **Document Key (`uid`)**: Firebase Auth User UID (`request.auth.uid`).
- **Fields**:
  - `userId`: `string` (Firebase UID)
  - `plan`: `string` (`trial`, `pro_monthly`, `pro_annual`)
  - `status`: `string` (`trialing`, `active`, `past_due`, `canceled`, `expired`)
  - `accessUntil`: `timestamp` (Absolute expiration timestamp; grants write access if `accessUntil > request.time`)
  - `currentPeriodStart`: `timestamp`
  - `currentPeriodEnd`: `timestamp`
  - `cancelAtPeriodEnd`: `boolean`
  - `razorpaySubscriptionId`: `string` (optional)
  - `updatedAt`: `timestamp`
- **Security Rule**:
  - `allow read: if isOwner(userId) || isAdmin();`
  - `allow write: if false;` (Clients can NEVER write, mutate, or forge their own subscription doc).

### 3.2 Lifecycle States
1. `trialing`: User has completed the ₹1 trial verification fee payment. `trialEndsAt` is set strictly equal to the subscription's `start_at` (epoch timestamp). `accessUntil` equals `trialEndsAt`.
2. `active`: User has a confirmed, active paid plan. `accessUntil` set to `currentPeriodEnd`.
3. `past_due`: Recurring payment failed. `graceUntil` is set ONCE (`currentPeriodEnd + 3 days`) upon first failure. Subsequent payment failure retries DO NOT extend `graceUntil`. `accessUntil` equals `graceUntil`.
4. `canceled`: Auto-renewal canceled by user, but access remains granted until `currentPeriodEnd`.
5. `expired`: `accessUntil < request.time`. Account locks into **Read-Only Mode**.

---

## 4. Webhook Events Ledger & Deduplication

### 4.1 Collection: `webhook_events/{id}`
- **Purpose**: Idempotent webhook event processing for Razorpay, YouPI, or UPI gateway notifications.
- **Document Key (`id`)**: Unique provider event ID (e.g., `evt_rzp_123456789`).
- **Fields**:
  - `eventId`: `string`
  - `provider`: `string` (`razorpay`, `youpi`)
  - `eventType`: `string` (`subscription.charged`, `payment.captured`, `subscription.cancelled`)
  - `receivedAt`: `timestamp`
  - `processedAt`: `timestamp`
  - `status`: `string` (`processed`, `ignored`, `failed`)
  - `payloadSummary`: `map`
- **Security Rule**:
  - `allow read, write: if false;` (Client SDKs are completely blocked from reading or injecting fake webhook events).

---

## 5. Anti-Bypass Security Architecture

### 5.1 Enforcement Principles
1. **Server-Side Authority**:
   - `subscriptions/{uid}`, `trial_ledger/{hash}`, and `webhook_events/{id}` can **only** be modified through authenticated backend services using the Firebase Admin SDK / Service Account.
2. **Access Entitlement Check**:
   - Creating or updating clients and invoices requires:
     ```javascript
     get(/databases/$(database)/documents/subscriptions/$(request.auth.uid)).data.accessUntil > request.time
     ```
3. **Expired Users are Read-Only**:
   - When `accessUntil < request.time` or when no subscription document exists:
     - Users can **read** their existing clients, invoices, work items, and reviews.
     - Users **cannot create or mutate** new clients, invoices, or work items.
4. **Client Isolation**:
   - No user can read another user's subscription document (`request.auth.uid != userId` is denied).

---

## 6. Cancellation & Expiry Flow

1. **User requests cancellation**:
   - Backend calls payment gateway API and marks `cancelAtPeriodEnd: true` in `subscriptions/{uid}`.
   - `status` remains `active` (or `canceled`), and `accessUntil` remains set to the end of the paid billing period.
2. **Billing cycle completes**:
   - Webhook notifies termination; backend updates `status: 'expired'`.
   - Once `accessUntil <= request.time`, Firestore Security Rules immediately reject any further client or invoice creations.
3. **Read-Only Experience**:
   - Expired users can download past invoices, export client data, and view their dashboard.
   - An in-app upgrade banner prompts renewal to unlock write capabilities.

---

## 7. Refund Processing Rules (`refund.processed`)

1. **₹1 Trial Fee Refund**:
   - Non-abuse refunds of the ₹1 trial fee DO NOT terminate membership or trial access.
   - Abuse refunds (triggered by duplicate VPA or duplicate email detection) immediately revoke access, set status to `expired`, and terminate the subscription.
2. **Renewal / Plan Refunds**:
   - Full refunds of a plan cycle immediately terminate write access and transition status to `expired`.
   - Partial refunds are logged for accounting and do not revoke active user access.

---

## 8. Worker Secrets & Endpoint Security

### 8.1 Required Cloudflare Worker Secrets
All backend environment secrets must be provisioned via `wrangler secret put`:
- `RAZORPAY_KEY_ID`: Live Razorpay Key ID (`rzp_live_...`)
- `RAZORPAY_KEY_SECRET`: Live Razorpay Secret
- `RAZORPAY_WEBHOOK_SECRET`: Secret used to compute HMAC-SHA256 signature
- `FIREBASE_SERVICE_ACCOUNT`: Full Firebase Admin Service Account JSON string
- `CRON_SECRET`: High-entropy bearer secret required for `/api/reconcile-cron`
- `TRIAL_LEDGER_PEPPER`: Secret salt used when computing SHA-256 digests of emails and VPAs
- `PLAN_ID_MONTHLY`: Razorpay Plan ID for ₹79/month
- `PLAN_ID_QUARTERLY`: Razorpay Plan ID for ₹199/3 months
- `PLAN_ID_HALF`: Razorpay Plan ID for ₹449/6 months
- `PLAN_ID_YEARLY`: Razorpay Plan ID for ₹899/year
- `RESEND_API_KEY`: API key for lifecycle emails
- `BASE_URL`: Application origin (default: `https://crestflow.app`)

### 8.2 Cron Endpoint Protection (`POST /api/reconcile-cron`)
- Manual and external cron invocations must supply `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
- The worker executes a timing-safe constant-time string comparison (`crypto.subtle.timingSafeEqual`).
- Requests with missing or non-matching secrets are rejected with HTTP 401 Unauthorized.

---

## 9. Go-Live Checklist

This checklist must be executed and verified before routing live production traffic:

1. **Verify Official Pricing & Plans**:
   - Monthly Plan: **₹79 / month** (`pro_monthly`)
   - Quarterly Plan: **₹199 / quarter** (~₹66/month, `pro_quarterly`)
   - Half-Yearly Plan: **₹449 / 6 months** (~₹75/month, `pro_half`)
   - Yearly Plan: **₹899 / year** (~₹75/month, `pro_yearly`)
   - Free Trial: **₹1 today (non-refundable)** for a 7-day evaluation trial

2. **Configure Razorpay Live Plans**:
   - Create 4 recurring subscription plans in the live Razorpay Dashboard matching the exact prices above.
   - Note the resulting Plan IDs: `PLAN_ID_MONTHLY`, `PLAN_ID_QUARTERLY`, `PLAN_ID_HALF`, `PLAN_ID_YEARLY`.

3. **Provision Cloudflare Worker Secrets**:
   Run `npx wrangler secret put <NAME>` for each:
   - `RAZORPAY_KEY_ID`: Live Razorpay key (`rzp_live_...`)
   - `RAZORPAY_KEY_SECRET`: Live Razorpay secret
   - `RAZORPAY_WEBHOOK_SECRET`: Live Razorpay webhook secret
   - `FIREBASE_SERVICE_ACCOUNT`: Full Firebase Admin Service Account JSON string
   - `CRON_SECRET`: High-entropy bearer secret for `/api/reconcile-cron`
   - `TRIAL_LEDGER_PEPPER`: Secure random salt string for hashing emails & VPAs
   - `RESEND_API_KEY`: API key for automated billing reminder and grace period emails
   - `BASE_URL`: Application canonical origin (e.g. `https://crestflow.app`)

4. **Register Razorpay Webhooks**:
   - Webhook URL: `<BASE_URL>/api/razorpay-webhook`
   - Secret: Must match `RAZORPAY_WEBHOOK_SECRET`
   - Subscribed Events:
     - `subscription.authenticated`
     - `subscription.activated`
     - `subscription.charged`
     - `payment.captured`
     - `payment.failed`
     - `subscription.cancelled`
     - `subscription.halted`
     - `subscription.completed`
     - `refund.processed`

5. **Deploy Firestore Security Rules**:
   - Run `npx firebase deploy --only firestore:rules` to lock down `subscriptions/{uid}`, `trial_ledger/{hash}`, and `webhook_events/{id}` from direct client writes.

6. **Execute Real ₹1 Verification Flow & Cleanup Test Ledgers**:
   - Perform a live ₹1 test payment using a real UPI ID/card to verify end-to-end trial activation, webhook processing, and `trialEndsAt = start_at`.
   - **MANDATORY CLEANUP STEP**: Delete test ledger documents (`trial_ledger/{hash}`) and test subscription records (`subscriptions/{uid}`) created during the real ₹1 test via Firebase Admin Console so the production ledger is pristine before opening to the public.

