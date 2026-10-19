# Comprehensive Implementation Plan: YouPI PG Subscription Billing Engine (Revised v5)

**Branch:** `feat/youpi-subscription-billing`  
**Status:** REVISED (v5) / AWAITING USER APPROVAL BEFORE PHASE 0 & 1  
**Feature Flag Storage:** Database Settings Table (`public.platform_settings -> billing_config`)

---

## 1. Executive Summary & Architecture Overview

This project introduces server-verified subscription billing for the CrestFlow freelancing platform using the self-hosted **YouPI PG (UPI gateway)**. Because UPI collection via YouPI cannot perform recurring auto-debit, subscriptions operate on **prepaid fixed duration periods** (Monthly ₹49 = 4,900 paise, Annual ₹499 = 49,900 paise).

### Core Architectural Invariants
1. **Supabase-Only Single-Store Architecture**: All application domain tables (`clients`, `invoices`, `work_items`, `profiles`, `sticky_notes`, `client_reviews`, `service_requests`) and billing tables (`plans`, `subscriptions`, `payments`, `subscription_audit_logs`, `subscription_whitelist`, `platform_settings`) live **exclusively** in Supabase PostgreSQL. Firebase is completely eliminated.
2. **Single Authoritative Store (PostgreSQL Only)**:
   - **Supabase PostgreSQL is the sole ACID-compliant system of record** for all domain entities and all billing entities.
   - **Real-Time Synchronization**: Live UI synchronization is powered exclusively by Supabase Realtime channels on PostgreSQL tables (`supabase_realtime` publication).
   - **Postgres RLS Paywall**: The paywall is enforced 100% server-side via PostgreSQL Row-Level Security (RLS) policies (`private.has_active_access((select auth.uid()))`) and backend Express middleware. No client write can bypass the paywall.
3. **Dual-Tier Write Path Architecture (Option A)**:
   - **Domain Entities (`clients`, `invoices`, `work_items`, `profiles`, `sticky_notes`, `client_reviews`, `service_requests`)**: Written directly by the SPA browser via authenticated user JWT, strictly governed by PostgreSQL Row-Level Security (RLS) policies. Write operations (`INSERT`, `UPDATE`) are guarded by the restrictive `private.has_active_access()` paywall check. `SELECT` and `DELETE` remain unrestricted for user-owned records.
   - **Billing & Ledger Entities (`plans`, `subscriptions`, `payments`, `subscription_audit_logs`, `subscription_whitelist`, `platform_settings`, `webhook_deliveries`)**: Written **exclusively by the backend Express server** using `SUPABASE_SERVICE_ROLE_KEY`. Authenticated users in the browser have strictly read-only access (own subscription, active plans, safe payment columns). Direct client writes fail with Postgres error `42501` (`insufficient_privilege`). The service-role key is never prefixed with `VITE_` and never bundled into client assets.
4. **UUID Foreign Keys & Financial Data Integrity**: User references across all subscription tables strictly use `user_id UUID REFERENCES auth.users(id)`. Financial ledger rows (`payments`, `subscription_audit_logs`) use `ON DELETE RESTRICT` to ensure transaction history is immutable and never erased if a user profile is deleted.
5. **Server-Side Paywall & Dynamic DB Feature Flag**: Access is enforced at both PostgreSQL RLS level (`(select private.has_active_access((select auth.uid())))`) and Express middleware (`requireActiveSubscription`). The feature flag lives in `public.platform_settings`: when disabled or outside the rollout cohort, `has_active_access()` returns `TRUE`.
6. **Anti-DoS Single-Slot Queue Protection & Alerting**: The YouPI single-slot FIFO queue is protected from denial-of-service via email verification checks, short 5-minute TTLs, a global queue-depth cap (max 5 open orders), threshold alerting at $\ge 4$ orders, per-user and per-IP rate limits, live status reconciliation, manual fallback, and automatic slot release.
7. **Webhook Idempotency on Signed Fields**: Idempotency is keyed strictly on signed fields (`paymentId`, `orderId`) with an atomic `SELECT FOR UPDATE` state transition. Unsigned headers (`delivery_id`, `timestamp`) are used for logging only.
8. **Private Network Containment**: YouPI PG and CrestFlow Express reside on a private network mesh. Webhooks are dispatched via an internal URL (`http://crestflow-backend:5000/api/youpi-webhook`), exposing **zero** public webhook endpoints.

```
+-----------------------------------------------------------------------------------------+
|                                    CRESTFLOW CLIENT                                     |
|  - Paywall on Signup/Login (Mandatory ₹49 Pro or VIP Whitelist)                         |
|  - RLS-Restricted Browser: SELECT-only queries via Supabase Anon Key                    |
|  - Queue UX: Shows queue position, 5-min timeout counter, explicit "Cancel" slot-release|
|  - "Paid but Not Activated" claim flow with 12-digit UTR submission                     |
|  - Post-Payment: Poll /api/billing/status -> Refresh Supabase Session -> Dismiss Paywall|
+-----------------------------------------------------------------------------------------+
                                      |
                                      | REST / JSON (Authenticated with Supabase JWT)
                                      v
+-----------------------------------------------------------------------------------------+
|                             CRESTFLOW BACKEND (Node/Express)                            |
|  - Hosted on Private Mesh / Local Port 5000                                             |
|  - Dedicated Merchant Configuration (Explicit UUID; default merchant disabled)          |
|  - trust proxy configured for accurate IP rate limiting                                 |
|  - Service-Role Supabase Client (Exclusive Write Authority)                             |
|  - Abuse Controls: email_confirmed_at check, Account-age/CAPTCHA, Max 1 open order,     |
|    Global queue-depth cap (max 5 open orders), Alert at >= 4 orders                     |
|  - Server-Side only returnUrl & metadata (autoActivate NEVER set by adapter)            |
|  - Atomic Webhook Receiver (SELECT FOR UPDATE on signed paymentId) + Out-of-Band GET    |
|  - Paid-but-unactivated reconciliation handler + Postgres Advisory Lock Cron Engine     |
+-----------------------------------------------------------------------------------------+
            |                                           ^
            | POST /api/v1/payments (Internal Mesh)     | POST /api/youpi-webhook (Internal Mesh)
            v                                           |
+-------------------------------------------------------+---------------------------------+
|                                 YOUPI PG V2 GATEWAY                                     |
|  - Network-Isolated: Bound strictly to 127.0.0.1 or internal private mesh (Port 6100)   |
|  - Default-Deny Reverse Proxy: Blocks /api/v1/payments* and /api/v1/admin* from public  |
|  - Single-Slot FIFO Queue (Protected against DoS via 5m auto-cancel & short TTL)        |
|  - Realtime Banking SMS / Gmail Observer Parsing                                        |
|  - HMAC-SHA256 Signed Webhook Engine (Dispatched over internal private network)         |
+-----------------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------------+
|                               SUPABASE POSTGRESQL DATABASE                              |
|  - platform_settings (billing_config: enabled, rollout_percentage, beta_cohorts)        |
|  - plans (code, price_paise, period_days, entitlement_limits)                           |
|  - subscriptions (user_id UUID, plan_id, status: active|grace|expired, period_end)      |
|  - payments (provider_order_id UNIQUE, amount_paise, status, raw_payload)               |
|  - Partial unique index on payments(utr) WHERE status IN ('SUCCESS', 'PENDING...')      |
|  - subscription_audit_logs (append-only ledger of all state transitions)                |
|  - RLS Guard: has_active_access(UUID) computes dynamically from period_end + grace      |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Source-Code Verification & Merchant API Security Audit

### 2.1 Merchant API Authentication Audit (YouPI Source Citations & Blocker Flag)

A critical security analysis of the YouPI PG codebase reveals the following authentication mechanisms:

1. **Order Creation (`POST /api/v1/payments`)**:
   - Quoted from [`youpi-pg/apps/payment-api/src/routes/payments.routes.js:34-41`](file:///d:/crestflow/youpi-pg/apps/payment-api/src/routes/payments.routes.js#L34-L41):
     ```javascript
     // Resolve merchant (default to first/demo merchant if none passed in header)
     const merchantId = req.headers['x-merchant-id'] || body.merchantId;
     let merchant;
     if (merchantId) {
       merchant = ctx.merchantRepo.findById(merchantId);
     } else {
       merchant = ctx.merchantRepo.getDefault ? ctx.merchantRepo.getDefault() : (ctx.merchantRepo.findById('00000000-0000-0000-0000-000000000001') || ctx.merchantRepo.findAll()[0]);
     }
     ```
   - **Finding**: There is **no API secret key, bearer token, or cryptographic signature check**. It only accepts `X-Merchant-Id` (UUID) or body `merchantId`, and if omitted, automatically falls back to the default merchant.

2. **Payment Status Inquiry (`GET /api/v1/payments/:id`)**:
   - Quoted from [`youpi-pg/apps/payment-api/src/routes/payments.routes.js:270-275`](file:///d:/crestflow/youpi-pg/apps/payment-api/src/routes/payments.routes.js#L270-L275):
     ```javascript
     // GET /api/v1/payments/:id
     server.get('/api/v1/payments/:id', async (req, res, params) => {
       const session = ctx.sessionRepo.findById(params.id);
       if (!session) {
         HttpServer.json(res, 404, { error: `Payment session not found: ${params.id}` });
         return;
       }
     ```
   - **Finding**: **Completely unauthenticated**. Any client possessing a `paymentId` UUID can inspect payment status and order metadata.

3. **Session Cancellation (`POST /api/v1/checkout/:id/cancel`)**:
   - Quoted from [`youpi-pg/apps/payment-api/src/routes/checkout.routes.js:943-948`](file:///d:/crestflow/youpi-pg/apps/payment-api/src/routes/checkout.routes.js#L943-L948):
     ```javascript
     // POST /api/v1/checkout/:id/cancel
     server.post('/api/v1/checkout/:id/cancel', async (req, res, params) => {
       const session = ctx.sessionRepo.findById(params.id);
       if (!session) {
         HttpServer.json(res, 404, { error: `Payment session not found: ${params.id}` });
         return;
       }
     ```
   - **Finding**: **Completely unauthenticated**. Any client possessing an active `paymentId` can cancel an in-flight payment session.

> [!CAUTION]
> ### ARCHITECTURAL BLOCKER & MANDATORY NETWORK CONTAINMENT
> Because YouPI's merchant API endpoints lack cryptographic authentication, **exposing YouPI's HTTP port (6100) directly to the public internet is an absolute security blocker**.
> **Network Restriction Architecture**:
> - The YouPI PG container/process **MUST strictly bind to `127.0.0.1` (loopback)** or live inside an isolated internal Docker bridge network (`crestflow_private_mesh`) with **zero public host port publishing**.
> - The CrestFlow Express backend communicates with YouPI strictly over `http://127.0.0.1:6100` (or `http://youpi-service:6100` on the private bridge).
> - Dedicated Merchant Setup: CrestFlow uses an explicit merchant UUID (`YOUPI_MERCHANT_ID`). In production, the default/demo merchant (`00000000-0000-0000-0000-000000000001`) is deleted/disabled.
> - The public reverse proxy (Nginx/Cloudflare) strictly enforces a **default-deny allowlist**, blocking all external requests matching `/api/v1/payments*` and `/api/v1/admin/*`.

---

### 2.2 YouPI Checkout Portal Route Inventory & Default-Deny Proxy Allowlist

The YouPI Checkout Portal frontend (`apps/checkout-portal/src/views/checkout.html` & `server.js`) calls the following routes. Every route is classified below:

| HTTP Method & Route Pattern | Functionality in Checkout Portal | Public Internet Accessibility | Reverse Proxy Rule |
| :--- | :--- | :--- | :--- |
| `GET /checkout/:id` | Renders HTML checkout page with branding | **PUBLIC** | Allowed (`proxy_pass`) |
| `GET /checkout/:id/qr.svg` | Dynamic SVG QR code generation | **PUBLIC** | Allowed (`proxy_pass`) |
| `GET /youpi.js`, `/sdk/youpi.js` | Official merchant SDK client script | **PUBLIC** | Allowed (`proxy_pass`) |
| `GET /icons/*` | Payment method brand icons | **PUBLIC** | Allowed (`proxy_pass`) |
| `GET /health` | Health check probe | **PUBLIC** | Allowed (`proxy_pass`) |
| `GET /api/v1/checkout/:id/state` | Live payment session state | **PUBLIC** | Allowed (`proxy_pass`) |
| `GET /api/v1/checkout/:id/stream` | Server-Sent Events (SSE) status stream | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/checkout/:id/cancel` | User clicks "Cancel" (releases slot!) | **PUBLIC** | **Allowed (Guarantees cancel works)** |
| `POST /api/v1/checkout/:id/payment-done` | User clicks "I have paid" | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/checkout/:id/retry-new-payment`| User retries cancelled session | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/checkout/:id/end-and-restart-payment` | Resolves device collision | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/checkout/:id/expire` | Client auto-expire on countdown 0 | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/customer/check-user` | Checks customer phone number | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/customer/send-otp` | Sends WhatsApp 6-digit OTP | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/customer/verify-otp` | Verifies WhatsApp OTP and returns token | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/customer/logout` | Clears customer token | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/checkout/:id/bind-customer` | Binds customer token to session | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/devices/register` | Registers device fingerprint | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/checkout/:id/select-method` | Selects payment modality | **PUBLIC** | Allowed (`proxy_pass`) |
| `POST /api/v1/payments` | **Order Creation** | **INTERNAL ONLY** | **DENIED (403 Forbidden)** |
| `GET /api/v1/payments/:id` | **Order Details Inquiry** | **INTERNAL ONLY** | **DENIED (403 Forbidden)** |
| `GET /api/v1/orders/:orderId/cod` | COD Order details | **INTERNAL ONLY** | **DENIED (403 Forbidden)** |
| `POST /api/v1/checkout/:id/confirm-cod`| Cashier confirmation | **INTERNAL ONLY** | **DENIED (403 Forbidden)** |
| `* /api/v1/admin/*` | Gateway administration | **INTERNAL ONLY** | **DENIED (403 Forbidden)** |
| `* /api/v1/devices/admin/*` | Admin device management | **INTERNAL ONLY** | **DENIED (403 Forbidden)** |

- **Confirmation**: The portal's cancel button (`POST /api/v1/checkout/:id/cancel`) is explicitly retained in the public proxy allowlist, ensuring that users can immediately free the YouPI single-slot concurrency lock.
- **Session ID Unguessability**: In `packages/db/src/repositories/payment-session.repository.js:13`, sessions are initialized with `crypto.randomUUID()`. Standard UUID v4 provides 122 bits of cryptographically secure pseudorandom entropy, making brute-force discovery of active session IDs impossible.
- **Concrete Hosting Topology**:
  - Express backend and YouPI run on the **same private host or private Docker network mesh (`crestflow_private_mesh`)**.
  - Internal Webhook: YouPI dispatches webhooks directly to Express over the private network: `http://crestflow-backend:5000/api/youpi-webhook`.
  - **No public webhook route is exposed to the internet**. External attackers cannot directly POST to the webhook handler.

---

### 2.3 Exact HMAC Computation & Idempotency Specification

Quoted from [`youpi-pg/packages/core/src/webhook-engine.js:45-56`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L45-L56):
```javascript
const payloadString = JSON.stringify(payloadObj);
const signature = generateHmac(payloadString, merchant.webhookSecret);
const deliveryId = crypto.randomUUID();
const timestamp = Date.now().toString();

const headers = {
  'Content-Type': 'application/json',
  'X-Gateway-Event': publicOutcome,
  'X-Gateway-Signature': `sha256=${signature}`,
  'X-Gateway-Delivery-Id': deliveryId,
  'X-Gateway-Timestamp': timestamp
};
```
And quoted from [`youpi-pg/packages/common/src/crypto.js:71-73`](file:///d:/crestflow/youpi-pg/packages/common/src/crypto.js#L71-L73):
```javascript
export function generateHmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}
```

- **Signed String**: `payloadString = JSON.stringify(payloadObj)`. Raw unparsed UTF-8 JSON body.
- **Timestamp Unit**: Integer milliseconds as string (`Date.now().toString()`).
- **Unsigned Headers**: Neither `X-Gateway-Delivery-Id` nor `X-Gateway-Timestamp` is included in the HMAC digest. Therefore, **they are treated as metadata for diagnostics/logging only**.
- **Atomic Idempotency on Signed Fields**:
  - Webhook processing locks the payment row via `SELECT FOR UPDATE` on signed `payload.paymentId` (or `payload.orderId`).
  - Activation logic executes **only if** the payment row transitions from a pending status (`INITIATED`, `ACTIVE`, `QUEUED`, `PROCESSING`) to `SUCCESS` in the **exact same database transaction** as the subscription period extension:
    ```sql
    BEGIN;
    SELECT id, user_id, plan_id, status FROM public.payments WHERE provider_order_id = $1 FOR UPDATE;
    -- If status == 'SUCCESS', COMMIT and return 200 without second period extension.
    -- If status IN ('INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING'):
    UPDATE public.payments SET status = 'SUCCESS', paid_at = now() WHERE provider_order_id = $1;
    UPDATE public.subscriptions SET current_period_end = GREATEST(now(), COALESCE(current_period_end, now())) + (plan_period_days || ' days')::INTERVAL ...;
    INSERT INTO public.subscription_audit_logs ...;
    COMMIT;
    ```
- **Evaluation of Adding Timestamp to HMAC**:
  - We evaluate updating YouPI core (`webhook-engine.js:46`) to compute `generateHmac(`${timestamp}.${payloadString}`, secret)`. Because modifying YouPI PG core source code requires explicit user confirmation, this plan marks it as an optional hardened improvement and will ask before modifying.

---

### 2.4 Payload Reconciliation, `autoActivate` & Dedicated Merchant

Quoted from [`youpi-pg/packages/merchant-sdk/src/client.js:51-61`](file:///d:/crestflow/youpi-pg/packages/merchant-sdk/src/client.js#L51-L61):
```javascript
const payload = {
  orderId: params.orderId,
  amount: params.amount,
  currency: params.currency || 'INR',
  returnUrl: params.returnUrl,
  customer: params.customer,
  metadata: params.metadata
};
if (params.autoActivate === true) {
  payload.autoActivate = true;
}
```
And quoted from [`youpi-pg/apps/payment-api/src/routes/payments.routes.js:210-213`](file:///d:/crestflow/youpi-pg/apps/payment-api/src/routes/payments.routes.js#L210-L213):
```javascript
// The only exception for UPI auto-activation is explicit developer test suite flag: body.autoActivate === true.
const isExplicitTestAutoActivate = body.autoActivate === true || body.autoActivate === 'true';
const shouldActivateNow = isCounterPayment || isExplicitTestAutoActivate;
const initialStatus = isCounterPayment ? PaymentStatus.ACTIVE : PaymentStatus.INITIATED;
```

- **Reconciliation of `description`**: The SDK does not support top-level `description`. Context is stored in `metadata.description`.
- **`autoActivate` Safety Rule**: `autoActivate: true` is an internal test flag that bypasses customer login and immediately claims the UPI concurrency slot before the user visits the page. **The CrestFlow adapter strictly omits `autoActivate` or sets it to `false`**.
- **Server-Side Security**: `returnUrl` and `metadata: { userId, planCode }` are strictly attached by the Express backend and rejected from client requests.
- **Dedicated Merchant**: Production uses explicit `CRESTFLOW_MERCHANT_ID` with default merchant disabled.

---

### 2.5 Auto-Activation Criteria, Flagged States & Red-Team Testing

Quoted from [`youpi-pg/packages/core/src/state-machine.js:78-90`](file:///d:/crestflow/youpi-pg/packages/core/src/state-machine.js#L78-L90):
```javascript
export function toPublicOutcome(status) {
  switch (status) {
    case PaymentStatus.SUCCESS: return PublicPaymentOutcome.SUCCESS;
    case PaymentStatus.FAILED: return PublicPaymentOutcome.FAILED;
    case PaymentStatus.EXPIRED: return PublicPaymentOutcome.EXPIRED;
    case PaymentStatus.CANCELLED: return PublicPaymentOutcome.CANCELLED;
    default: throw new Error(`Status '${status}' is an internal non-terminal state and cannot be mapped to a public outcome.`);
  }
}
```
And quoted from [`youpi-pg/apps/payment-api/src/routes/payments.routes.js:287-293`](file:///d:/crestflow/youpi-pg/apps/payment-api/src/routes/payments.routes.js#L287-L293):
```javascript
status: publicStatus,
internalStatus: session.status,
verificationTag: session.verificationTag || 'UNVERIFIED',
verificationLevel: session.verificationLevel || 0,
verificationSources: session.verificationSources || [],
```

#### Strict Auto-Activation Criteria:
Automated subscription activation occurs **ONLY IF ALL** of the following conditions are met:
1. Out-of-band `GET /api/v1/payments/:id` reports `status === 'SUCCESS'`.
2. `verificationLevel >= 1` (at least one valid bank SMS or Gmail observer source verified).
3. `verificationTag` is a recognized verified source (e.g. `'Single Verification'`, `'Dual Verification'`, `'SMS'`, `'GMAIL'`), and is **NOT** `'UNVERIFIED'` or `'DEFAULT'`.
4. `amountPaise` matches the expected plan price in paise.
5. `metadata.userId` matches the local user ID.

#### Low / UNVERIFIED & Flagged Payment Handling:
- If `status === 'SUCCESS'` but `verificationTag === 'UNVERIFIED'` or `verificationLevel === 0`:
  Payment is updated to `PENDING_MANUAL_REVIEW`. **Subscription is NOT activated.**
- Flagged sessions (e.g. `status === 'FLAGGED_SUSPICIOUS'`, `outcomeStatus === 'SUSPICIOUS'`) are recorded as `SUSPICIOUS_MANUAL_REVIEW`, with admin alerting.
- **Error Handling**: If out-of-band GET returns 4xx/5xx or network times out, the webhook handler returns HTTP 500/503. YouPI's retry engine (`maxRetries = 5`) retries later. **Errors NEVER activate subscriptions.**
- **Pre-Launch Red-Team Test**: Add test in `tests/integration/observerSecurity.test.ts` proving that forged bank SMS (fake sender ID, mismatched VTR) and spoofed emails sent to observers are rejected by YouPI's Security Engine (`Stage 5`) and never emit `SUCCESS`.

---

## 3. Database Schema & Single-Store Architecture (PostgreSQL Only)

### 3.1 Data Store Entity Distribution & Authority
- **Supabase PostgreSQL (Authoritative Core & Billing)**:
  - `public.profiles`: Master user profile data.
  - `public.clients` & `public.sub_clients`: Client accounts and sub-clients.
  - `public.invoices`: Invoices and line items.
  - `public.work_items`: Work logs and deliverables.
  - `public.reviews`: Client ratings and reviews.
  - `public.platform_settings`: System configuration and billing rollout flags.
  - `public.plans`, `public.subscriptions`, `public.payments`, `public.subscription_audit_logs`, `public.subscription_whitelist`, `public.admin_users`, `public.webhook_deliveries`.
- **Single Source of Truth**:
  - PostgreSQL is the sole source of truth for all tables.
  - Zero dual-writing or mirroring to Firestore.
- **Supabase Realtime Sync**:
  - Client state reactivity is handled directly by subscribing to PostgreSQL changes via `@supabase/supabase-js` Realtime channels.

### 3.2 Write-Path Architecture & Access Control (Option A)
1. **Domain Entities (SPA Direct Write via PostgreSQL RLS)**:
   - Tables: `public.clients`, `public.invoices`, `public.work_items`, `public.profiles`, `public.sticky_notes`, `public.client_reviews`, `public.service_requests`.
   - Written directly by the SPA browser using the Supabase client under the user's authenticated JWT.
   - Permissive policies enforce ownership: `user_id = (select auth.uid())`.
   - **RESTRICTIVE Paywall Guard**: Applied `AS RESTRICTIVE` on `INSERT` and `UPDATE` via `(select private.has_active_access((select auth.uid())))`.
   - **Unrestricted Read & Delete**: `SELECT` and `DELETE` have NO paywall restriction. Expired accounts can freely read, view, search, export PDF/CSV, and delete their historical records.
2. **Billing Entities (Server-Only Writes via Service-Role)**:
   - Tables: `public.plans`, `public.subscriptions`, `public.payments`, `public.subscription_audit_logs`, `public.subscription_whitelist`, `public.platform_settings`, `public.webhook_deliveries`.
   - Written **strictly by the backend Express server** using `SUPABASE_SERVICE_ROLE_KEY`.
   - Authenticated client roles have zero write privileges (`REVOKE ALL FROM anon, authenticated`).
   - Client read access is strictly limited:
     - `public.plans`: SELECT active plans only (`is_active = true`).
     - `public.subscriptions`: SELECT own subscription row (`user_id = (select auth.uid())`).
     - `public.payments`: Column-level SELECT on safe columns (`id, user_id, plan_id, provider_order_id, provider_payment_id, amount_paise, currency, status, reason, method, utr, paid_at, created_at`). `raw_provider_payload` and `internal_reference` are never exposed to the client.
     - `public.subscription_audit_logs`: SELECT own audit rows.
     - `public.subscription_whitelist`: Zero client access (VIP status is learned via `/api/billing/status`).

### 3.3 Whitelist and Access Revocation (Instantaneous via PostgreSQL)
1. **Whitelist Implementation**:
   - VIPs are assigned an explicit record in `public.subscription_whitelist` (or entered into `public.subscriptions` with an extended period).
   - Reading the whitelist table is revoked from `anon` and `authenticated`; clients learn VIP status via the backend `/api/billing/status` endpoint.
2. **Instant Revocation (Zero Token Window)**:
   - Because authorization is checked live in PostgreSQL RLS on every database query, deleting or expiring a whitelist entry or subscription takes effect immediately on the next query.
   - No cached JWT custom claims or 1-hour token windows exist.
3. **Post-Payment Refresh**:
   - Frontend polls `/api/billing/status` every 2s until `active`.
   - Once activated, the client refreshes its Supabase session / subscription state and dismisses the paywall modal.

---

## 4. "Paid but Not Activated" Flow & Admin Reconciliation

### 4.1 UTR Claims Hardening
1. **Partial Unique Index on UTR**:
   ```sql
   CREATE UNIQUE INDEX payments_utr_unique_idx ON public.payments (utr) 
   WHERE utr IS NOT NULL AND status IN ('SUCCESS', 'PENDING_MANUAL_RECONCILIATION');
   ```
   Ensures that an in-flight or approved UTR can never be claimed more than once.
2. **Terminal Row Preservation**:
   The `claim-payment` endpoint **never overwrites terminal payment rows** (`SUCCESS`, `CANCELLED`). If an order is `EXPIRED`, it transitions status to `PENDING_MANUAL_RECONCILIATION` only for the owning user.

### 4.2 User Claim Flow
- UI in `SubscriptionModal.tsx` provides *"Already paid? Claim activation with UPI Reference (UTR)"*.
- User submits 12-digit numeric UTR. `POST /api/billing/claim-payment` validates UTR format (`/^\d{12}$/`), checks unique index, sets status to `PENDING_MANUAL_RECONCILIATION`.

### 4.3 Admin Reconciliation Queue
- Located at `src/components/admin/AdminReconciliationQueue.tsx`.
- Displays pending claims side-by-side with observer bank logs (raw SMS text, Gmail observer snippet, amount, sender VPA).
- 1-click **"Approve & Activate"** runs an atomic PostgreSQL transaction extending the subscription in `public.subscriptions`, marking the payment `SUCCESS`, and recording an audit log in `public.subscription_audit_logs`.

---

## 5. Queue Cap, Anti-DoS & WhatsApp OTP Strategy

### 5.1 Short TTLs & Queue Cap
- Short TTL: 5 minutes (300 seconds) with YouPI timing engine.
- Queue Cap: Max 5 concurrent orders. Returns HTTP 429 (`SYSTEM_QUEUE_FULL`) when saturated.
- Alerting: Triggers Slack/Discord/console alert when active orders $\ge 4$.
- Manual Fallback: When busy, UI provides direct static admin QR or directs to UTR claim.
- Residual Risk: Multi-account queue DoS documented with multi-tier rate limiting mitigations.

### 5.2 WhatsApp OTP & Baileys Failure Fallback
- **CrestFlow Checkout Behavior**:
  - CrestFlow users are pre-authenticated via Supabase Auth with verified emails.
  - The Express backend passes customer details on `createPayment`, allowing the portal to pre-bind the customer where possible.
- **Fallback when Baileys Fails**:
  - If Baileys socket is disconnected or fails to deliver the 6-digit WhatsApp OTP, users will be unable to pass the phone gate.
  - **Fallback Mitigation**: The checkout UI presents a link: *"Having trouble with WhatsApp OTP? Click here to pay directly via UPI"*, displaying a direct UPI URI link / static QR and routing to the "Claim with UTR" flow for immediate manual reconciliation.

---

## 6. Phased Implementation Roadmap

### Phase 0: Complete Firebase Elimination & Data Parity Backfill
**Goal:** Eliminate all Firebase dependencies across the codebase, migrate legacy data to PostgreSQL, and achieve 100% operational parity on Supabase.

- **Scope & Execution Steps:**
  1. **PostgreSQL Schema Extension:** Add `public.blocked_users` table to Supabase with RLS to replace Firestore `blocked_users`.
  2. **Reroute Active Client Writes to Supabase:**
     - Update `ClientFeedbackForm.tsx` to insert reviews directly into `public.client_reviews`.
     - Update `PublicFreelancerProfile.tsx` to insert inquiries into `public.service_requests` and query clients/profiles from Supabase.
     - Update `ClientPortal.tsx` to replace direct Firestore listeners on `clients`, `invoices`, `workItems`, `reviews` with Supabase Realtime channel subscriptions.
     - Update `youpiService.ts` to remove dual-writing to Firestore `subscription_payments`, `profiles`, and `subscription_plans`.
     - Update `fcmService.ts` and `paymentUtils.ts` to eliminate Firestore device token logging in favor of browser Notification API.
  3. **Complete Data Backfill & Parity Verification:**
     - Run backfill script copying all historical records from Firestore to PostgreSQL with `user_id` mapping.
     - Execute parity verification query across all entities (`clients`, `invoices`, `work_items`, `profiles`, `sticky_notes`, `client_reviews`, `service_requests`, `subscription_payments`, `blocked_users`).
  4. **Authentication Cutover:**
     - Remove Firebase Auth listener and popup fallback in `src/App.tsx`.
     - Update `src/lib/gmailService.ts` and `src/lib/driveService.ts` to source Google OAuth tokens from `supabase.auth.getSession()` instead of launching a Firebase Auth popup.
     - Replace `import { User } from 'firebase/auth'` in all component prop interfaces with `AppUser`.
  5. **Read-Only Soak Period:** Set `firestore.rules` to read-only (`allow write: if false`) and verify zero write attempts fail.
  6. **Asset & SDK Cleanup:**
     - Remove `firebase` package from `package.json`.
     - Delete `src/firebase.ts`, `src/hooks/useFirestore.ts`, `firestore.rules`, `firebase.json`, `firebase-applet-config.json`, `firebase-blueprint.json`, and `public/firebase-messaging-sw.js`.
     - Remove `'vendor-firebase'` manual chunk from `vite.config.ts`.
     - Clean `.env` and `.env.example`.

- **Phase 0 Acceptance Criteria**:
  1. `npm run lint` and `npm run build` pass with zero Firebase imports.
  2. Parity verification query confirms zero missing records in Supabase.
  3. Authentication, profile editing, work logging, invoicing, client portal, and admin tabs operate without errors.

---

### Phase 1: Database Schema, Dynamic Feature Flags & Reversible Migrations
**Goal:** Create normalized Supabase Postgres tables with UUID foreign keys, strict RLS, dynamic settings, grandfathering launch script, and `private.has_active_access()` helper.

- **Artifacts:**
  - `supabase/migrations/20261018_subscription_billing.sql`
  - `scripts/launch_grandfathering.ts`

#### Complete Phase 1 Migration Specification:

```sql
-- ==============================================================================
-- UP MIGRATION: Subscription Billing Engine (PostgreSQL Schema & Security)
-- ==============================================================================

-- 1. Private Security Schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- 2. Utility Trigger Functions
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'subscription_audit_logs is append-only and cannot be modified or deleted';
END;
$$;

-- 3. Dynamic Feature Flag & System Configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (key, value)
VALUES (
  'billing_config',
  '{
    "enabled": false,
    "rollout_percentage": 0,
    "beta_cohort_user_ids": [],
    "beta_cohort_emails": [],
    "gst_registered": false,
    "pricing_inclusive_gst": true,
    "sac_code": "998313"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  notes TEXT DEFAULT 'Platform Administrator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  period_days INT NOT NULL DEFAULT 30 CHECK (period_days > 0),
  period_label TEXT NOT NULL DEFAULT '/ month',
  badge TEXT,
  description TEXT,
  entitlement_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.plans (code, name, price_paise, currency, period_days, period_label, entitlement_limits, is_active, sort_order)
VALUES 
  ('pro_monthly', 'CrestFlow Pro (Monthly)', 4900, 'INR', 30, '/ month', '{"max_clients": -1, "max_invoices": -1, "clean_pdf": true}'::jsonb, true, 1),
  ('pro_annual', 'CrestFlow Pro (Annual)', 49900, 'INR', 365, '/ year', '{"max_clients": -1, "max_invoices": -1, "clean_pdf": true}'::jsonb, true, 2)
ON CONFLICT (code) DO NOTHING;

-- 6. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'grace', 'expired', 'canceled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_period_days INT NOT NULL DEFAULT 3 CHECK (grace_period_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Authoritative Gateway Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_payment_id TEXT,
  internal_reference TEXT NOT NULL UNIQUE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
    'INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'SUSPICIOUS', 'SUSPICIOUS_LATE_SUCCESS', 'PENDING_MANUAL_RECONCILIATION', 'REJECTED', 'EXPIRED', 'CANCELLED'
  )),
  reason TEXT,
  method TEXT NOT NULL DEFAULT 'UPI',
  utr TEXT CHECK (utr IS NULL OR utr ~ '^[0-9]{12}$'),
  raw_provider_payload JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_paid_at_check CHECK ((status = 'SUCCESS' AND paid_at IS NOT NULL) OR (status != 'SUCCESS'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_open_order_per_user 
  ON public.payments (user_id) 
  WHERE status IN ('INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING');

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_utr 
  ON public.payments (utr) 
  WHERE utr IS NOT NULL AND status IN ('SUCCESS', 'PENDING_MANUAL_RECONCILIATION');

-- 8. Subscription Audit Logs (Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Subscription Whitelist (VIP Management)
CREATE TABLE IF NOT EXISTS public.subscription_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'Approved by Admin',
  expires_at TIMESTAMPTZ,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Webhook Deliveries (Replay Prevention)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  delivery_id UUID PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'SUCCESS',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Triggers
CREATE TRIGGER audit_logs_append_only 
  BEFORE UPDATE OR DELETE ON public.subscription_audit_logs 
  FOR EACH ROW EXECUTE FUNCTION private.prevent_audit_log_mutation();

CREATE TRIGGER set_plans_updated_at 
  BEFORE UPDATE ON public.plans 
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_platform_settings_updated_at 
  BEFORE UPDATE ON public.platform_settings 
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- 12. Server-Side Paywall Guard Function
CREATE OR REPLACE FUNCTION private.has_active_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  config_val JSONB;
  user_email_val TEXT;
  confirmed_at_val TIMESTAMPTZ;
  is_globally_enabled BOOLEAN;
  rollout_pct INT;
  is_beta_cohort BOOLEAN;
BEGIN
  -- 1. Read dynamic settings
  SELECT value INTO config_val FROM public.platform_settings WHERE key = 'billing_config';
  is_globally_enabled := COALESCE((config_val->>'enabled')::boolean, false);
  
  -- If billing is globally OFF (dark launch), full access is granted
  IF NOT is_globally_enabled THEN
    RETURN TRUE;
  END IF;

  -- 2. Fetch authenticated user attributes
  SELECT email, email_confirmed_at INTO user_email_val, confirmed_at_val 
  FROM auth.users 
  WHERE id = user_uuid;

  -- 3. Check explicit beta cohorts (by UUID or email)
  is_beta_cohort := (config_val->'beta_cohort_user_ids') ? user_uuid::text
    OR (user_email_val IS NOT NULL AND (config_val->'beta_cohort_emails') ? user_email_val);
    
  IF is_beta_cohort THEN
    -- In active beta cohort; proceed to entitlement checks
    NULL;
  ELSE
    -- 4. Rollout percentage check with bigint masking
    rollout_pct := COALESCE((config_val->>'rollout_percentage')::int, 0);
    IF (((('x' || substr(md5(user_uuid::text), 1, 8))::bit(32)::bigint & 4294967295) % 100) >= rollout_pct) THEN
      -- User is outside current rollout percentage cohort; grant access
      RETURN TRUE;
    END IF;
  END IF;

  -- 5. Whitelist check: matches lowercase email against confirmed emails ONLY, respecting expiry
  IF user_email_val IS NOT NULL AND confirmed_at_val IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscription_whitelist 
    WHERE LOWER(email) = LOWER(user_email_val)
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- 6. Dynamic active subscription check
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND (current_period_end + (grace_period_days || ' days')::INTERVAL) > now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.has_active_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_active_access(UUID) TO authenticated, service_role;

-- 13. Enable RLS and Configure Explicit Grants
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE 
  public.plans,
  public.subscriptions,
  public.payments,
  public.subscription_audit_logs,
  public.subscription_whitelist,
  public.admin_users,
  public.platform_settings,
  public.webhook_deliveries 
FROM PUBLIC, anon, authenticated;

-- Plans: Public can view active plans
GRANT SELECT ON public.plans TO anon, authenticated;
CREATE POLICY "allow_read_active_plans" ON public.plans 
  FOR SELECT USING (is_active = true);

-- Subscriptions: Authenticated user can read own row
GRANT SELECT ON public.subscriptions TO authenticated;
CREATE POLICY "allow_read_own_subscription" ON public.subscriptions 
  FOR SELECT USING (user_id = (select auth.uid()));

-- Payments: Column-level SELECT on safe columns (no internal_reference or raw_payload)
GRANT SELECT (id, user_id, plan_id, provider_order_id, provider_payment_id, amount_paise, currency, status, reason, method, utr, paid_at, created_at) 
  ON public.payments TO authenticated;
CREATE POLICY "allow_read_own_payments_safe" ON public.payments 
  FOR SELECT USING (user_id = (select auth.uid()));

-- Audit Logs: User can read own history
GRANT SELECT ON public.subscription_audit_logs TO authenticated;
CREATE POLICY "allow_read_own_audit_logs" ON public.subscription_audit_logs 
  FOR SELECT USING (user_id = (select auth.uid()));

-- Whitelist: Zero client grants/policies. Checked via backend status endpoint only.

-- Platform Settings: Public can read settings
GRANT SELECT (key, value, updated_at) ON public.platform_settings TO anon, authenticated;
CREATE POLICY "allow_read_platform_settings" ON public.platform_settings 
  FOR SELECT USING (true);

-- Admin Users: Authenticated user can read own admin flag
GRANT SELECT ON public.admin_users TO authenticated;
CREATE POLICY "allow_read_own_admin_status" ON public.admin_users 
  FOR SELECT USING (user_id = (select auth.uid()));

-- 14. Restrictive Paywall Policies on Domain Tables (clients, invoices, work_items)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paywall_restrictive_clients_insert" ON public.clients;
CREATE POLICY "paywall_restrictive_clients_insert" ON public.clients
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_clients_update" ON public.clients;
CREATE POLICY "paywall_restrictive_clients_update" ON public.clients
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_invoices_insert" ON public.invoices;
CREATE POLICY "paywall_restrictive_invoices_insert" ON public.invoices
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_invoices_update" ON public.invoices;
CREATE POLICY "paywall_restrictive_invoices_update" ON public.invoices
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_work_items_insert" ON public.work_items;
CREATE POLICY "paywall_restrictive_work_items_insert" ON public.work_items
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_work_items_update" ON public.work_items;
CREATE POLICY "paywall_restrictive_work_items_update" ON public.work_items
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((select private.has_active_access((select auth.uid()))));

-- ==============================================================================
-- DOWN MIGRATION: Reversible Rollback
-- ==============================================================================
-- DROP POLICY IF EXISTS "paywall_restrictive_clients_insert" ON public.clients;
-- DROP POLICY IF EXISTS "paywall_restrictive_clients_update" ON public.clients;
-- DROP POLICY IF EXISTS "paywall_restrictive_invoices_insert" ON public.invoices;
-- DROP POLICY IF EXISTS "paywall_restrictive_invoices_update" ON public.invoices;
-- DROP POLICY IF EXISTS "paywall_restrictive_work_items_insert" ON public.work_items;
-- DROP POLICY IF EXISTS "paywall_restrictive_work_items_update" ON public.work_items;
--
-- DROP TABLE IF EXISTS public.webhook_deliveries CASCADE;
-- DROP TABLE IF EXISTS public.subscription_whitelist CASCADE;
-- DROP TABLE IF EXISTS public.subscription_audit_logs CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- DROP TABLE IF EXISTS public.subscriptions CASCADE;
-- DROP TABLE IF EXISTS public.plans CASCADE;
-- DROP TABLE IF EXISTS public.admin_users CASCADE;
-- DROP TABLE IF EXISTS public.platform_settings CASCADE;
--
-- DROP FUNCTION IF EXISTS private.prevent_audit_log_mutation() CASCADE;
-- DROP FUNCTION IF EXISTS private.set_updated_at() CASCADE;
-- DROP FUNCTION IF EXISTS private.has_active_access(UUID) CASCADE;
--
-- DROP SCHEMA IF EXISTS private CASCADE;
```

#### Launch Runbook: Grandfathering Script (`scripts/launch_grandfathering.ts`)
Grandfathering existing users is explicitly decoupled from the static database migration DDL. At production launch:
1. The script connects using `SUPABASE_SERVICE_ROLE_KEY`.
2. Queries all confirmed users: `SELECT id, email FROM auth.users WHERE email_confirmed_at IS NOT NULL`.
3. Sets `current_period_end = now() + INTERVAL '30 days'` computed from the exact moment of launch execution.
4. Atomically upserts an `active` subscription row in `public.subscriptions` and appends an entry to `public.subscription_audit_logs` (`previous_status: null, new_status: 'active', reason: 'Launch Grandfathering Grant (30 Days Pro)', actor: 'launch_script'`).
5. Unconfirmed or deleted accounts are skipped.

- **Phase 1 Acceptance Criteria**:
  1. Migration executes cleanly and idempotently on Supabase PostgreSQL with verified UP and DOWN scripts.
  2. `has_active_access()` returns `TRUE` when billing is globally disabled, and dynamically computes access when enabled.
  3. Client `SELECT` queries succeed on own rows; direct client-side `INSERT`, `UPDATE` attempts on billing tables fail with `42501` (insufficient_privilege).
  4. Client `SELECT` queries on `public.payments` succeed for safe columns and fail on `internal_reference` or `raw_provider_payload`.
  5. RESTRICTIVE policies on `clients`, `invoices`, `work_items` permit `SELECT` and `DELETE` without subscription, but block `INSERT` and `UPDATE` when access is expired.
  6. Partial unique index on `payments(utr)` rejects duplicate active or completed UTR entries.

---

### Phase 2: Express Backend Server & Anti-DoS Order Creation
**Goal:** Setup secure Express backend with verified-email gating, single open order lock, global queue depth cap (5), threshold alerts ($\ge 4$), and rate limiting.

- **Files:**
  - `server/index.ts`: Express application on port 5000 with `app.set('trust proxy', 1)`.
  - `server/middleware/auth.ts`: Validates Supabase JWT using server-side `supabase.auth.getUser()`, asserts `user.email_confirmed_at IS NOT NULL`.
  - `server/middleware/adminAuth.ts`: Asserts user is in `public.admin_users` table or `app_metadata.role === 'admin'`.
  - `server/providers/PaymentProvider.ts`: Provider-agnostic interface (`createOrder`, `verifyWebhook`, `queryStatus`, `cancelOrder`).
  - `server/providers/YouPiPaymentProvider.ts`: YouPI PG adapter interacting over **internal private mesh** (`http://127.0.0.1:6100`).
    - **Origin Rewriting**: The adapter rewrites `checkoutUrl` returned by YouPI from the internal container mesh origin to the public customer domain configured in `YOUPI_PUBLIC_CHECKOUT_DOMAIN`.
    - **Metadata Privacy**: Verifies YouPI public checkout endpoints (`/api/v1/checkout/:id/state` and `/api/v1/checkout/:id/stream`) do not expose internal user UUIDs, customer email, or gateway secrets.
  - `server/routes/billing.ts`:
    - `POST /api/billing/create-order`: Gated on email confirmation; global queue cap 5; alert at 4; attaches server-only `returnUrl` and `metadata`; `autoActivate` strictly omitted.
    - `POST /api/billing/cancel-order`: Cancels session to release YouPI queue slot.
    - `POST /api/billing/claim-payment`: Records UTR claims; preserves terminal rows.
    - `GET /api/billing/status`: Returns current subscription status, VIP status, and active plan details without exposing raw whitelist rows.

- **Phase 2 Acceptance Criteria**:
  1. Unconfirmed email accounts are rejected with HTTP 403.
  2. Users with an active pending order cannot create duplicate orders; existing order is returned.
  3. Global queue cap rejects order creation with HTTP 429 when open orders $\ge 5$; emits alert when $\ge 4$.
  4. The adapter never sets `autoActivate: true` on order creation.
  5. Dedicated `CRESTFLOW_MERCHANT_ID` is used for all order requests.
  6. The `checkoutUrl` returned to the client contains strictly the public domain, with no internal container or private IP leaks.

---

### Phase 3: Authoritative Webhook Receiver & Dual-Verification Engine
**Goal:** Zero-trust webhook handler verifying HMAC-SHA256 signatures, atomic row state transition, out-of-band GET confirmation, and auto-activation criteria.

- **Files:**
  - `server/routes/webhook.ts`: Mounted on internal route `/api/youpi-webhook`.
  - `server/services/confirmationService.ts`: Core atomic transaction handler.
- **Security Checkpoints & Transaction Isolation**:
  1. **HMAC-SHA256 Verification First**: Verified over raw unparsed body bytes using `crypto.timingSafeEqual`.
  2. **Out-of-Band GET Outside Any Database Transaction**:
     - Performs `GET http://127.0.0.1:6100/api/v1/payments/{paymentId}` to confirm authoritative status before opening a database transaction. Prevents blocking database connection pools during network I/O.
  3. **Timestamp Logging**: The unsigned `X-Gateway-Timestamp` header is recorded for observability and latency metrics; webhooks are NOT rejected on timestamp variations. Idempotency and replay defense are guaranteed by the signed payload fields and DB state locks.
  4. **Short Database Locking Transaction**:
     - Begins PostgreSQL transaction and locks row: `SELECT * FROM public.payments WHERE provider_order_id = $1 FOR UPDATE`.
     - Compares `amountPaise == plan.price_paise` and checks status.
     - Extends period in `public.subscriptions` atomically: `GREATEST(now(), COALESCE(current_period_end, now())) + (plan.period_days || ' days')::INTERVAL`.
     - Updates payment to `SUCCESS` and records row in `public.subscription_audit_logs`.
  5. **Authoritative Verification Tag Allowlist**:
     - Quoted from YouPI core verification engine ([`attribution-engine.js`](file:///d:/crestflow/youpi-pg/packages/core/src/attribution-engine.js) & [`payment-session.repository.js`](file:///d:/crestflow/youpi-pg/packages/db/src/repositories/payment-session.repository.js)):
     ```typescript
     const AUTHORITATIVE_VERIFICATION_TAGS = new Set([
       'Single Verification (SMS)',
       'Single Verification (Gmail)',
       'Dual Verification (SMS + Gmail)',
       'Dual Verification (Gmail + SMS)'
     ]);
     ```
     - If `verificationTag` is not in the allowlist (e.g. `UNVERIFIED`, `DEFAULT`, `COD_ORDER_PLACED`), payment is flagged as `PENDING_MANUAL_RECONCILIATION` or `SUSPICIOUS` and does NOT grant Pro access.

- **Phase 3 Acceptance Criteria**:
  1. Valid webhook with authorized verification tag extends subscription period by exactly 30 or 365 days.
  2. Replaying the exact same signed body with a new `delivery_id` extends the period **exactly once**.
  3. Webhook with `verificationTag === 'UNVERIFIED'` flags manual review and does **not** activate.
  4. Forged HMAC signature returns HTTP 401.
  5. Out-of-band GET failure returns HTTP 500 to trigger gateway retry without opening DB locks.

---

### Phase 4: Entitlement Engine & Paywall UX (Queue Feedback & Polling)
**Goal:** Enforce mandatory paywall with clear queue feedback, polling, and claim options.

- **Files:**
  - `src/lib/entitlements.ts` & `server/services/entitlements.ts`: `getEntitlements(userId)`.
  - `src/components/SubscriptionModal.tsx`:
    - Shows queue position & 5-minute countdown.
    - Explicit "Cancel" button to free slot.
    - "Paid but Not Activated? Claim with UTR" link.
    - Post-Payment: Polls `/api/billing/status` every 2s after payment; refreshes Supabase session and refetches local subscription state upon success before closing the modal.
    - Baileys fallback: Direct UPI link/QR option if WhatsApp OTP fails to arrive within 60s.
  - `src/components/PaywallGate.tsx`: Protects core tool features while preserving data exports.

- **Phase 4 Acceptance Criteria**:
  1. Unsubscribed users without VIP whitelist cannot create or update clients/invoices.
  2. Clicking "Cancel" frees the YouPI concurrency slot immediately.
  3. Successful payment triggers client polling $\to$ Supabase state refresh $\to$ immediate paywall dismissal without re-login.
  4. Existing user data remains fully readable and downloadable even if subscription is expired.

---

### Phase 5: Automated Renewal Reminders, Grace Period & Reconciliation Cron
**Goal:** Background jobs for advance renewal alerts, grace periods, and pending order reconciliation.

- **Files:**
  - `server/cron/subscriptionCron.ts`: Wrapped in `SELECT pg_try_advisory_lock(88992211)`.
    - Daily 6:00 AM renewal alerts (7, 3, 1 days).
    - Grace period transitions.
    - Hourly reconciliation of pending orders older than 15 minutes.

- **Phase 5 Acceptance Criteria**:
  1. Cron executes on only one backend instance under advisory lock.
  2. Subscriptions entering grace period retain access for exactly `grace_period_days`.
  3. Missed webhooks for verified orders are recovered during hourly reconciliation.

---

### Phase 6: Admin Review Console & GST-Compliant Tax Invoices
**Goal:** Admin VIP whitelist management, reconciliation queue with observer comparison, and tax invoices.

- **Files:**
  - `server/config/billing.ts`: Configuration constants for `GST_REGISTERED`, `PRICING_INCLUSIVE_GST`, and default SAC code `"998313"`.
    > [!NOTE]
    > **Tax Advisory Note**: SAC code `"998313"` (Information technology software services) is configured as a business setting. Prior to issuing live tax invoices, the legal entity's Chartered Accountant (CA) must confirm GST registration applicability, state threshold rules, and HSN/SAC code classification.
  - `server/routes/admin.ts`: Endpoints for whitelist CRUD and claim approval/rejection.
  - `src/components/admin/AdminReconciliationQueue.tsx`: Table for `PENDING_MANUAL_RECONCILIATION` and `SUSPICIOUS_LATE_SUCCESS`, showing bank observer logs next to claimed UTRs with 1-click approval.
  - `server/services/subscriptionInvoiceService.ts`: Generates GST tax invoice or receipt with configured SAC code.

- **Phase 6 Acceptance Criteria**:
  1. Admin reconciliation queue displays claimed UTR and matching observer log text side-by-side.
  2. 1-click approval atomically activates subscription, updates payment status in PostgreSQL, and logs audit trail.
  3. Removing a whitelist email immediately denies write access in PostgreSQL RLS (`has_active_access`).
  4. Configured SAC code is applied to generated PDF invoices when `GST_REGISTERED = true`.

---

### Phase 7: Automated Test Suite & Security Hardening
**Goal:** 100% test coverage for security invariants, RLS paywall rules, abuse controls, and red-team tests.

- **Test Files:**
  - `tests/unit/entitlements.test.ts`: Entitlement rules, VIP bypass, grace period limits.
  - `tests/unit/periodMath.test.ts`: Dynamic period calculation and atomic extension logic.
  - `tests/integration/rlsBypass.test.ts`: Proves direct client Supabase writes to billing tables fail with `42501`.
  - `tests/integration/rlsPaywall.test.ts` (PostgreSQL RLS Paywall Test Suite):
    - Expired user rejected on `INSERT` and `UPDATE` into `clients`, `invoices`, `work_items`.
    - Active subscription user permitted to write.
    - Whitelisted user permitted to write.
    - Non-owner read rejected.
    - Delete on expired account permitted.
  - `tests/integration/checkoutDomain.test.ts`:
    - Asserts no internal hostnames (`youpi-core`, `localhost:6100`, `127.0.0.1`) reach client in `checkoutUrl`.
    - Asserts public checkout state endpoints do not leak customer metadata.
  - `tests/integration/webhook.test.ts`:
    - Signed body replay with fresh delivery_id extends period exactly once.
    - Low/UNVERIFIED success flags manual review without activating.
  - `tests/integration/observerSecurity.test.ts` (Pre-Launch Red-Team Test):
    - Forged bank SMS (fake sender, wrong amount, forged UTR) rejected by Security Engine.
    - Spoofed Gmail forwarding rejected; never produces `SUCCESS`.
  - `tests/integration/abuseControls.test.ts`: Gating, queue cap at 5, threshold alert at 4.

- **Phase 7 Acceptance Criteria**:
  1. 100% of test suite passes.
  2. Forged SMS/email injections fail red-team test.
  3. Client RLS bypass test confirms zero unauthorized writes.
  4. Checkout domain test confirms zero internal network leakage.

---

### Phase 8: Rollout Runbook & Feature Flag Control
**Goal:** Controlled dark launch managed via database settings.

- **Configuration:**
  - Default: `billing_config.enabled = false` in `platform_settings` (Paywall disabled).
  - Step 1: Admin account verification via email whitelist.
  - Step 2: Cohort rollout via `beta_cohort_user_ids` or `rollout_percentage`.
  - Step 3: Full production rollout (`enabled = true`, `rollout_percentage = 100`).
  - Instant rollback: Update `platform_settings` setting `enabled = false`.

- **Phase 8 Acceptance Criteria**:
  1. Setting `enabled = false` immediately restores full free access across the platform.
  2. Cohort rollout percentage correctly gates users based on masked hash of user UUID.

---

## 7. Definition of Done
1. All unit, integration, RLS bypass, and red-team tests pass.
2. The threat-model checklist confirms all 18 security invariants are verified.
3. YouPI API port is network-isolated on private mesh and accessible only by Express backend.
4. Subscriptions activate **only** via server-verified HMAC webhooks with out-of-band GET confirmation or admin manual reconciliation.
5. Setting `billing_config.enabled = false` in `platform_settings` restores existing behavior with zero regressions.
