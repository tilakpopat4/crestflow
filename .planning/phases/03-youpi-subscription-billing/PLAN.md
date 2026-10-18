# Comprehensive Implementation Plan: YouPI PG Subscription Billing Engine (Revised)

**Branch:** `feat/youpi-subscription-billing`  
**Status:** REVISED / AWAITING USER APPROVAL  
**Feature Flag:** `BILLING_ENABLED` (Default: `false`)

---

## 1. Executive Summary & Architecture Overview

This project introduces server-verified subscription billing for the CrestFlow freelancing platform using the self-hosted **YouPI PG (UPI gateway)**. Because UPI collection via YouPI cannot perform recurring auto-debit, subscriptions operate on **prepaid fixed duration periods** (e.g., Monthly ₹49 = 4,900 paise, Annual ₹499 = 49,900 paise).

### Core Architectural Invariants
1. **Supabase-Only Billing State**: All billing tables (`plans`, `subscriptions`, `payments`, `subscription_audit_logs`, `subscription_whitelist`) live **exclusively** in Supabase PostgreSQL. Firestore stores **zero** billing data.
2. **Strict RLS & Service-Role Isolation**: Authenticated client browsers receive `SELECT`-only privileges on their own rows (`auth.uid() = user_id`). **All database writes** (`INSERT`, `UPDATE`, `DELETE`) are performed exclusively by the backend Express server using `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is never prefixed with `VITE_` and never bundled into client assets.
3. **UUID Foreign Keys**: User references across all subscription tables strictly use `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
4. **Server-Side Paywall Enforcement**: Protected write actions (`clients`, `invoices`, `work_items`) are blocked at both PostgreSQL RLS level (`has_active_access(user_id)`) and Express middleware (`requireActiveSubscription`), rendering client-side bypass impossible.
5. **Anti-DoS Single-Slot Queue Protection**: The YouPI single-slot FIFO queue is protected from denial-of-service via email verification checks, a max of 1 open payment session per user, per-IP rate limiting, 5-minute session timeouts, and automatic slot release.

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
|  - Service-Role Supabase Client (Exclusive Write Authority)                             |
|  - Abuse Controls: Verified-email required, Max 1 open order, IP & User Rate Limits     |
|  - PaymentProvider Interface -> YouPiPaymentProvider Adapter                            |
|  - Authoritative HMAC-SHA256 Webhook Receiver (/api/youpi-webhook)                      |
|  - In-Process node-cron Engine + Protected /api/cron HTTP Fallback                      |
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
|  - plans (code, price_paise, period_days, entitlement_limits)                           |
|  - subscriptions (user_id UUID, plan_id, status: active|grace|expired, period_end)      |
|  - payments (provider_order_id UNIQUE, amount_paise, status, raw_payload)               |
|  - subscription_audit_logs (append-only ledger of all state transitions)                |
|  - RLS Guard: has_active_access(UUID) enforced on clients, work_items, invoices writes  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Source-Code Verification Matrix (YouPI PG Source Cross-Check)

Every endpoint, header, payload field, and state name has been cross-checked against the active YouPI PG codebase in this repository:

| Integration Element | Verified Value / Contract | YouPI PG Source Code Reference |
| :--- | :--- | :--- |
| **Order Creation Endpoint** | `POST /api/v1/payments` | [`youpi-pg/apps/payment-api/src/server.js`](file:///d:/crestflow/youpi-pg/apps/payment-api/src/server.js), [`youpi-pg/openapi.yaml:18`](file:///d:/crestflow/youpi-pg/openapi.yaml#L18) |
| **Order Creation Payload** | `{ orderId, amount, currency, customer, description, returnUrl, metadata }` | [`youpi-pg/packages/merchant-sdk/src/client.js:39`](file:///d:/crestflow/youpi-pg/packages/merchant-sdk/src/client.js#L39), [`youpi-pg/openapi.yaml:142`](file:///d:/crestflow/youpi-pg/openapi.yaml#L142) |
| **Payment Status Endpoint** | `GET /api/v1/payments/{id}` | [`youpi-pg/packages/merchant-sdk/src/client.js:94`](file:///d:/crestflow/youpi-pg/packages/merchant-sdk/src/client.js#L94), [`youpi-pg/openapi.yaml:78`](file:///d:/crestflow/youpi-pg/openapi.yaml#L78) |
| **Slot Release / Cancel** | `POST /api/v1/checkout/{id}/cancel` | [`youpi-pg/openapi.yaml:106`](file:///d:/crestflow/youpi-pg/openapi.yaml#L106), [`youpi-pg/apps/checkout-portal/src/views/checkout.html:4103`](file:///d:/crestflow/youpi-pg/apps/checkout-portal/src/views/checkout.html#L4103) |
| **Webhook Signature Header** | `X-Gateway-Signature: sha256=<64_hex_hash>` | [`youpi-pg/packages/core/src/webhook-engine.js:53`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L53) |
| **Webhook Event Header** | `X-Gateway-Event: SUCCESS` | [`youpi-pg/packages/core/src/webhook-engine.js:52`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L52) |
| **Webhook Delivery ID** | `X-Gateway-Delivery-Id: <uuid>` | [`youpi-pg/packages/core/src/webhook-engine.js:54`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L54) |
| **Webhook Timestamp Header** | `X-Gateway-Timestamp: <timestamp_ms>` | [`youpi-pg/packages/core/src/webhook-engine.js:55`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L55) |
| **Webhook Payload Fields** | `{ event, paymentId, orderId, amount, amountPaise, currency, method, completedAt, metadata }` | [`youpi-pg/packages/core/src/webhook-engine.js:33-43`](file:///d:/crestflow/youpi-pg/packages/core/src/webhook-engine.js#L33-L43) |
| **Order States Enum** | `INITIATED`, `ACTIVE`, `QUEUED`, `PROCESSING`, `SUCCESS`, `FAILED`, `EXPIRED`, `CANCELLED` | [`youpi-pg/packages/core/src/state-machine.js:8-31`](file:///d:/crestflow/youpi-pg/packages/core/src/state-machine.js#L8-L31) |

---

## 3. Hosting & Network Architecture

### Backend & Webhook Routing
- **Express Server Hosting**: Hosted on a Node.js process (e.g. Render / Railway / VPS / Docker container alongside Vite during development at `http://localhost:5000`).
- **Webhook Network Path**:
  - **Local Development**: Exposed via reverse proxy / tunnel (e.g. `ngrok http 5000` or Docker network bridge `http://host.docker.internal:5000/api/youpi-webhook`) configured in YouPI PG's merchant settings `webhook_url`.
  - **Production**: Public HTTPS URL `https://api.crestflow.com/api/youpi-webhook` terminated by Nginx / Cloudflare and reverse-proxied to Express port 5000.
- **Cron Jobs Engine**:
  - Primary: In-process `node-cron` daemon in the Express service executing hourly reconciliation and daily 6:00 AM renewal alerts.
  - Secondary / Redundant: Webhook fallback endpoint `POST /api/cron/reconcile` protected by `Authorization: Bearer CRON_SECRET` for external uptime pingers (cron-job.org / GitHub Actions).

### Entitlements Sync for Firestore Features
- Billing tables live **exclusively** in Supabase Postgres.
- The client-side entitlement hook (`useSubscription` / `useEntitlements`) queries Supabase `subscriptions` (or calls `/api/billing/status`).
- When a user logs in, the Express server confirms active subscription in Supabase and can write an `isSubscribed: true` claim to Firebase Auth tokens via Firebase Admin SDK. All React components check the authoritative Supabase entitlement hook before initiating Firestore work logs or clients.

---

## 4. Phased Implementation Roadmap

### Phase 1: Database Schema, RLS Policies & Reversible Migrations
**Goal:** Create normalized Supabase Postgres tables with UUID foreign keys, strict RLS, and zero-bypass functions.

- **Artifacts:**
  - `supabase/migrations/20261018_subscription_billing.sql`
- **Tables to Create:**
  1. `public.plans`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `code` TEXT NOT NULL UNIQUE ('pro_monthly', 'pro_annual')
     - `name` TEXT NOT NULL
     - `price_paise` BIGINT NOT NULL CHECK (price_paise >= 0)
     - `period_days` INT NOT NULL DEFAULT 30
     - `entitlement_limits` JSONB NOT NULL DEFAULT '{}'::jsonb
     - `is_active` BOOLEAN NOT NULL DEFAULT true
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  2. `public.subscriptions`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `user_id` UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
     - `plan_id` UUID NOT NULL REFERENCES public.plans(id)
     - `status` TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'grace', 'expired', 'canceled'))
     - `current_period_start` TIMESTAMPTZ
     - `current_period_end` TIMESTAMPTZ
     - `grace_period_end` TIMESTAMPTZ
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now(), `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  3. `public.payments`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
     - `plan_id` UUID NOT NULL REFERENCES public.plans(id)
     - `provider_order_id` TEXT NOT NULL UNIQUE
     - `provider_payment_id` TEXT
     - `internal_reference` TEXT NOT NULL UNIQUE
     - `amount_paise` BIGINT NOT NULL
     - `status` TEXT NOT NULL CHECK (status IN ('INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'SUSPICIOUS', 'EXPIRED', 'CANCELLED'))
     - `utr` TEXT
     - `raw_provider_payload` JSONB
     - `paid_at` TIMESTAMPTZ
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  4. `public.subscription_audit_logs`:
     - `id` BIGSERIAL PRIMARY KEY
     - `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
     - `previous_status` TEXT
     - `new_status` TEXT NOT NULL
     - `reason` TEXT NOT NULL
     - `actor` TEXT NOT NULL -- 'webhook', 'cron', 'admin:uuid', 'user'
     - `metadata` JSONB DEFAULT '{}'::jsonb
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  5. `public.subscription_whitelist`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `email` TEXT NOT NULL UNIQUE
     - `reason` TEXT NOT NULL DEFAULT 'Approved by Admin'
     - `added_by` UUID REFERENCES auth.users(id)
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- **RLS Configuration:**
  - `ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY "Users can read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);`
  - **Zero client writes**: No `INSERT`, `UPDATE`, or `DELETE` policy is granted to `anon` or `authenticated` roles. All writes occur via Supabase `service_role` on the Express backend.
  - Same pattern applied to `payments`, `subscription_audit_logs`, and `subscription_whitelist`.
- **Server-Side Paywall Guard Function:**
  ```sql
  CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
  RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    user_email_val TEXT;
  BEGIN
    -- Check 1: Whitelist bypass
    SELECT email INTO user_email_val FROM auth.users WHERE id = user_uuid;
    IF user_email_val IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.subscription_whitelist WHERE LOWER(email) = LOWER(user_email_val)
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check 2: Active or Grace subscription period
    RETURN EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = user_uuid
        AND status IN ('active', 'grace')
        AND (current_period_end > now() OR grace_period_end > now())
    );
  END;
  $$;
  ```
  Enforced via `WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()))` on `clients`, `work_items`, and `invoices`.

---

### Phase 2: Express Backend Server & Anti-DoS Order Creation
**Goal:** Setup secure Express backend with verified-email gating, single open order lock, and rate limiting.

- **Files:**
  - `server/index.ts`: Express application running on port 5000 with CORS, JSON and raw body parsing.
  - `server/middleware/auth.ts`: Validates Supabase JWT, asserts `email_verified === true`.
  - `server/providers/PaymentProvider.ts`: Provider-agnostic interface (`createOrder`, `verifyWebhook`, `queryStatus`, `cancelOrder`).
  - `server/providers/YouPiPaymentProvider.ts`: YouPI PG adapter interacting with `POST /api/v1/payments`, `GET /api/v1/payments/{id}`, and `POST /api/v1/checkout/{id}/cancel`.
  - `server/routes/billing.ts`:
    - `POST /api/billing/create-order`:
      - Requires verified email authentication.
      - **Anti-DoS Single-Slot Queue Lock**: Rejects if user already has an active order in `['INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING']` created within the last 15 minutes (returns existing session or error).
      - Per-user and per-IP rate limiting: Max 3 order attempts per 10 minutes.
      - Resolves price in paise strictly from `public.plans` DB table (ignores client amount).
      - Calls `YouPiPaymentProvider.createOrder()` and inserts `INITIATED` record via `service_role`.
    - `POST /api/billing/cancel-order`: Explicitly cancels active session via `POST /api/v1/checkout/{id}/cancel` to immediately free the YouPI single-slot queue.
- **Verification Criteria:**
  - Automated test confirms a user cannot create a second order while one is open.
  - Client cannot manipulate price.

---

### Phase 3: Authoritative Webhook Receiver & Confirmation Engine
**Goal:** Implement zero-trust server-to-server webhook handler verifying HMAC-SHA256 signatures, timestamps, idempotency, and extending subscriptions atomically.

- **Files:**
  - `server/routes/webhook.ts`: Mounted at `/api/youpi-webhook`.
  - `server/services/confirmationService.ts`: Core atomic transaction handler.
- **Security Checkpoints:**
  1. **Raw Body Buffer:** Verifies HMAC-SHA256 signature against unparsed payload bytes using `crypto.timingSafeEqual` with `YOUPI_WEBHOOK_SECRET`.
  2. **Timestamp Replay Check:** Reject any webhook where `X-Gateway-Timestamp` is older than 5 minutes (300,000ms).
  3. **Idempotency Guard:** If `provider_order_id` is already in state `SUCCESS`, return HTTP 200 without re-extending the subscription.
  4. **Amount & Plan Validation:** Validate `amountPaise == plan.price_paise`. If mismatched, flag payment as `SUSPICIOUS`, record in audit log, notify admin, and do NOT activate access.
  5. **Atomic Period Math in PostgreSQL Transaction:**
     ```sql
     current_period_end = GREATEST(now(), COALESCE(current_period_end, now())) + (plan.period_days || ' days')::INTERVAL
     ```
  6. **Audit Trail Logging:** Insert record into `subscription_audit_logs`.
- **Verification Criteria:**
  - Valid webhook extends period by exactly 30 or 365 days.
  - Duplicate webhook returns 200 without second extension.
  - Forged signature returns HTTP 401.

---

### Phase 4: Entitlement Engine & Paywall UX (Queue Feedback)
**Goal:** Enforce mandatory paywall across client and server with clear queue feedback.

- **Files:**
  - `src/lib/entitlements.ts` (Client) & `server/services/entitlements.ts` (Server):
    - `getEntitlements(userId)` returns `{ hasActiveSubscription, canCreateInvoice, canExportCleanPdf, isWhitelisted, isInGracePeriod }`.
  - `src/components/SubscriptionModal.tsx`:
    - Shows YouPI checkout modal with real-time `queuePosition` display (e.g., "Queue position #1 - Estimated wait: 45 seconds").
    - 5-minute visual countdown timer.
    - Explicit "Cancel Order" button invoking `/api/billing/cancel-order` to prevent queue deadlock.
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
    - **Renewal Reminder Job (Daily 6:00 AM):** Identifies subscriptions expiring in 7, 3, and 1 days; schedules email/WhatsApp notifications.
    - **Grace Period Handler:** When `current_period_end < now()`, moves status to `grace` for 3 days; after grace period, sets status to `expired`.
    - **Reconciliation Job (Hourly):** Queries YouPI PG (`GET /api/v1/payments/{paymentId}`) for pending orders older than 15 minutes to reconcile missed webhooks or flag unresolved items.
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
  - `server/routes/admin.ts`: Admin-only endpoints for whitelist CRUD and manual payment approve/reject, protected by server authentication and writing to `subscription_audit_logs`.
  - `src/components/admin/AdminPaymentApprovals.tsx`: Verification queue showing bank UTR, observer confidence level, and one-click manual approve/reject.
  - `server/services/subscriptionInvoiceService.ts`: Automatically generates a PDF tax invoice/receipt (reusing CrestFlow's invoice engine).

---

### Phase 7: Automated Test Suite & Security Hardening
**Goal:** Rigorous test coverage for all security requirements and edge cases.

- **Test Files:**
  - `tests/unit/entitlements.test.ts`: Entitlement rules, VIP bypass, grace period limits.
  - `tests/unit/periodMath.test.ts`: Atomic period extension logic (`GREATEST(now(), current_period_end) + days`).
  - `tests/integration/rlsBypass.test.ts`: **Proves that a direct client-side Supabase attempt to insert or update subscription status fails with `42501` (insufficient_privilege).**
  - `tests/integration/webhook.test.ts`:
    - Valid signature -> 200 OK + period extended.
    - Invalid signature -> 401 Unauthorized.
    - Replayed webhook (stale timestamp) -> 400 Bad Request.
    - Duplicate delivery ID -> 200 OK, no duplicate extension.
    - Amount mismatch -> 422 Unprocessable + marked SUSPICIOUS.
    - Order expired/failed -> marked FAILED, no access granted.
  - `tests/integration/abuseControls.test.ts`: Unverified email rejected, second concurrent order blocked, rate limits enforced.
- **Verification Criteria:**
  - 100% of test suite passes.
  - Zero PII in logs (masked phone numbers, emails, and transaction IDs).

---

### Phase 8: Rollout Runbook & Feature Flag Control
**Goal:** Controlled dark launch behind `BILLING_ENABLED`.

- **Configuration:**
  - Default: `BILLING_ENABLED=false` (App operates identically to current behavior; paywall disabled).
  - Step 1: Enable for platform admin account via email whitelist.
  - Step 2: Enable for beta cohort (10% users).
  - Step 3: Full production rollout.
  - Instant rollback procedure: set `BILLING_ENABLED=false` in environment variables.

---

## 5. Definition of Done
1. All unit and integration tests pass, including client RLS bypass test.
2. The threat-model checklist confirms all 15 non-negotiable security requirements are verified.
3. Subscriptions activate **only** via server-verified HMAC webhooks or admin manual override.
4. Setting `BILLING_ENABLED=false` restores existing behavior with zero regressions.
