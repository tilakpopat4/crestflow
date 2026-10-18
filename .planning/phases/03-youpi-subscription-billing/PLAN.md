# Comprehensive Implementation Plan: YouPI PG Subscription Billing Engine

**Branch:** `feat/youpi-subscription-billing`  
**Status:** DRAFT / READY FOR EXECUTION  
**Feature Flag:** `BILLING_ENABLED` (Default: `false`)

---

## 1. Executive Summary & Architecture Overview

This project introduces server-verified subscription billing for the CrestFlow freelancing platform using the self-hosted **YouPI PG (UPI gateway)**. Because UPI collection via YouPI cannot perform recurring auto-debit, subscriptions operate on **prepaid fixed duration periods** (e.g., Monthly ₹49 = 4,900 paise, Annual ₹499 = 49,900 paise). 

### High-Level Component Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    CRESTFLOW CLIENT                                     |
|  - Paywall on Signup/Login (Mandatory ₹49 Pro or VIP Whitelist)                         |
|  - Entitlement Guard (Read-only on expiry, never deletes invoices/clients)              |
|  - YouPI Modal / QR Checkout UI                                                         |
+-----------------------------------------------------------------------------------------+
                                      |
                                      | REST / JSON
                                      v
+-----------------------------------------------------------------------------------------+
|                             CRESTFLOW BACKEND (Node/Express)                            |
|  - Feature Flag Guard (BILLING_ENABLED)                                                 |
|  - PaymentProvider Interface -> YouPiPaymentProvider Adapter                            |
|  - Server-Decided Pricing (from DB, never client input)                                 |
|  - Authoritative HMAC-SHA256 Webhook Receiver (/api/youpi-webhook)                      |
|  - Idempotency & Replay Window (X-Gateway-Timestamp, Delivery ID)                       |
|  - Scheduled Reconciliation & Expiry / Grace Period Cron Engine                         |
+-----------------------------------------------------------------------------------------+
            |                                           ^
            | POST /api/v1/payments                     | POST Webhook (X-Gateway-Signature)
            v                                           |
+-------------------------------------------------------+---------------------------------+
|                                 YOUPI PG V2 GATEWAY                                     |
|  - QR Code Generation / Intent                                                          |
|  - Banking SMS / Gmail Observer Realtime Parsing                                        |
|  - Cryptographic HMAC-SHA256 Webhook Dispatcher                                         |
+-----------------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------------+
|                               SUPABASE POSTGRESQL DATABASE                              |
|  - plans (code, price_paise, period_days, entitlement_limits)                           |
|  - subscriptions (user_email, plan_id, status: active|grace|expired, period_end)         |
|  - payments (provider_order_id UNIQUE, amount_paise, status, raw_payload)               |
|  - subscription_audit_logs (append-only ledger of all state transitions)                |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Phased Implementation Roadmap

### Phase 1: Database Schema & Reversible Migrations
**Goal:** Create normalized, idempotent tables for plans, subscriptions, payments, and audit logs with strict database-level constraints.

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
     - `user_email` TEXT NOT NULL UNIQUE
     - `plan_id` UUID NOT NULL REFERENCES public.plans(id)
     - `status` TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'grace', 'expired', 'canceled'))
     - `current_period_start` TIMESTAMPTZ
     - `current_period_end` TIMESTAMPTZ
     - `grace_period_end` TIMESTAMPTZ
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now(), `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  3. `public.payments`:
     - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
     - `user_email` TEXT NOT NULL
     - `plan_id` UUID NOT NULL REFERENCES public.plans(id)
     - `provider_order_id` TEXT NOT NULL UNIQUE
     - `provider_payment_id` TEXT
     - `internal_reference` TEXT NOT NULL UNIQUE
     - `amount_paise` BIGINT NOT NULL
     - `status` TEXT NOT NULL CHECK (status IN ('INITIATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'SUSPICIOUS', 'EXPIRED', 'CANCELLED'))
     - `utr` TEXT
     - `raw_provider_payload` JSONB
     - `paid_at` TIMESTAMPTZ
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  4. `public.subscription_audit_logs`:
     - `id` BIGSERIAL PRIMARY KEY
     - `user_email` TEXT NOT NULL
     - `previous_status` TEXT
     - `new_status` TEXT NOT NULL
     - `reason` TEXT NOT NULL
     - `actor` TEXT NOT NULL -- 'webhook', 'cron', 'admin:email', 'user'
     - `metadata` JSONB DEFAULT '{}'::jsonb
     - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- **Verification Criteria:**
  - Clean reversible migration script with UP and DOWN sections.
  - Unique constraint on `provider_order_id` and `internal_reference`.

---

### Phase 2: Express Backend Server & PaymentProvider Abstraction Layer
**Goal:** Setup secure server environment, provider interface, and order creation API.

- **Files:**
  - `server/index.ts`: Express application with raw body parsing for webhooks, CORS, and rate limiting.
  - `server/providers/PaymentProvider.ts`: Provider-agnostic interface (`createOrder`, `verifyWebhook`, `queryStatus`).
  - `server/providers/YouPiPaymentProvider.ts`: YouPI PG concrete implementation communicating with `http://localhost:7000` or production gateway URL.
  - `server/routes/billing.ts`:
    - `POST /api/billing/create-order`: Validates user auth, fetches plan price from DB (never client), generates idempotent order ID, calls provider, stores `INITIATED` record in `payments`.
    - `GET /api/billing/status`: Returns user's current subscription, period end, and entitlements.
- **Security Invariants:**
  - Rate limiting on `/api/billing/create-order` (max 10 requests per user per minute).
  - Server decides price and duration strictly from `plans` table.
- **Verification Criteria:**
  - Calling `create-order` with modified client price is impossible (server ignores client price).
  - Calling `create-order` creates `INITIATED` record and returns YouPI checkout URL.

---

### Phase 3: Authoritative Webhook Receiver & Confirmation Engine
**Goal:** Implement zero-trust server-to-server webhook handler verifying HMAC-SHA256 signatures, timestamps, idempotency, and extending subscriptions atomically.

- **Files:**
  - `server/routes/webhook.ts`: Raw body endpoint mounted at `/api/youpi-webhook`.
  - `server/services/confirmationService.ts`: Core atomic transaction handler.
- **Security Checkpoints:**
  1. **Raw Body Buffer:** Verifies HMAC-SHA256 signature against unparsed payload bytes using `crypto.timingSafeEqual`.
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

### Phase 4: Entitlement Engine & Mandatory Paywall Guard
**Goal:** Single source of truth helper governing tool access, watermarking, and invoice creation limits.

- **Files:**
  - `src/lib/entitlements.ts` (Client) & `server/services/entitlements.ts` (Server):
    - `getEntitlements(userEmail)` returns `{ hasActiveSubscription, canCreateInvoice, canExportCleanPdf, maxClients, isWhitelisted, isInGracePeriod }`.
  - `src/components/PaywallGate.tsx` / `src/App.tsx`:
    - Enforces mandatory subscription: Unsubscribed users without VIP whitelist cannot create clients, log work, or issue invoices; directed to the ₹49 checkout flow.
- **Data Preservation Guarantee:**
  - Expired subscriptions NEVER delete client or invoice data; users retain read-only / export access to past records.
- **Verification Criteria:**
  - Unsubscribed user is blocked from tool actions with clean paywall.
  - Whitelisted email bypasses paywall seamlessly.

---

### Phase 5: Automated Renewal Reminders, Grace Period & Reconciliation Cron
**Goal:** Background jobs for advance renewal alerts, grace period handling, and pending order reconciliation.

- **Files:**
  - `server/cron/subscriptionCron.ts`:
    - **Renewal Reminder Job (Daily):** Identifies subscriptions expiring in 7, 3, and 1 days; schedules email/WhatsApp notifications.
    - **Grace Period Handler:** When `current_period_end < now()`, moves status to `grace` for 3 days; after grace period, sets status to `expired`.
    - **Reconciliation Job (Hourly):** Queries YouPI PG (`GET /api/v1/payments/{paymentId}`) for pending orders older than 15 minutes to reconcile missed webhooks or flag unresolved items.
- **Verification Criteria:**
  - Automated grace period transition occurs without data disruption.
  - Reconciliation recovers pending payments that succeeded at the gateway.

---

### Phase 6: Admin Review Console & GST-Compliant Tax Invoices
**Goal:** Admin interface for manual verification/rejection and automatic GST invoice generation for every subscription payment.

- **Files:**
  - `src/components/admin/AdminPaymentApprovals.tsx`: Updates verification queue to display detailed provider payload, bank UTR, observer confidence level, and one-click manual approve/reject with audit logging.
  - `server/services/subscriptionInvoiceService.ts`: Automatically generates a GST-compliant tax invoice PDF (reusing CrestFlow's existing invoice generation engine) with HSN code (998311 - SaaS), GST breakdown (CGST/SGST 18%), and downloadable receipt.
- **Verification Criteria:**
  - Approving a suspicious payment in Admin triggers audit log and activates subscription.
  - Generated subscription invoice displays correct GST breakdown and serial number.

---

### Phase 7: Automated Test Suite & Security Hardening
**Goal:** Rigorous test coverage for all security requirements and edge cases.

- **Test Files:**
  - `tests/unit/entitlements.test.ts`: Entitlement rules, VIP bypass, grace period limits.
  - `tests/unit/periodMath.test.ts`: Atomic period extension logic (`GREATEST(now(), current_period_end) + days`).
  - `tests/integration/webhook.test.ts`:
    - Valid signature -> 200 OK + period extended.
    - Invalid signature -> 401 Unauthorized.
    - Replayed webhook (stale timestamp) -> 400 Bad Request.
    - Duplicate delivery ID -> 200 OK, no duplicate extension.
    - Amount mismatch -> 422 Unprocessable + marked SUSPICIOUS.
    - Order expired/failed -> marked FAILED, no access granted.
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

## 3. Definition of Done
1. All unit and integration tests pass.
2. The threat-model checklist confirms all 15 non-negotiable security requirements are verified.
3. Subscriptions activate **only** via server-verified HMAC webhooks or admin manual override.
4. Setting `BILLING_ENABLED=false` restores existing behavior with zero regressions.
