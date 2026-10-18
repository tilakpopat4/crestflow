# Rollout Runbook & Operations Guide: YouPI Subscription Billing

**Feature Flag:** `BILLING_ENABLED` (Boolean, default: `false`)

---

## 1. Staged Rollout Procedure

### Stage 0: Dark Deployment (Validation & Verification)
1. Deploy schema migration `supabase/migrations/20261018_subscription_billing.sql`.
2. Deploy backend service with `BILLING_ENABLED=false` and frontend bundle.
3. Verify that the platform continues functioning exactly as before:
   - Existing users can log in, create invoices, add clients without paywall prompt.
   - All tests in CI/CD pipeline pass (`npm run test`).

---

### Stage 1: Admin Account Verification (Dogfooding)
1. Add the administrator's email to `subscription_whitelist` in Supabase or Admin Console.
2. In local/staging environment, set `BILLING_ENABLED=true`.
3. Perform test payment flow using YouPI PG sandbox mode:
   - Create order for ₹49 Pro Monthly.
   - Complete UPI transaction in YouPI checkout portal.
   - Confirm authoritative webhook delivery at `/api/youpi-webhook`.
   - Verify `subscriptions` row updates to `status = 'active'` with `current_period_end = now() + 30 days`.
   - Verify tax invoice receipt generated with GST breakdown.

---

### Stage 2: Small Cohort (Beta / 10% Traffic)
1. In `server/routes/billing.ts`, configure cohort gating:
   ```typescript
   const isBetaUser = user.email.endsWith('@company.com') || betaList.has(user.email);
   ```
2. Enable billing gate for the beta cohort.
3. Monitor for 48 hours:
   - Webhook delivery latency (< 2 seconds).
   - Replay rejections and duplicate delivery logs.
   - Zero database locks or failed atomic updates.

---

### Stage 3: General Availability (100% Rollout)
1. Set `BILLING_ENABLED=true` in production environment variables (`.env`).
2. Restart backend service.
3. All new signups and users without active subscription or whitelist status will encounter the Pro subscription screen.

---

## 2. Emergency Rollback Procedure

If unexpected gateway behavior, bank observer outages, or critical bugs occur:

1. **Immediate Deactivation:** Set `BILLING_ENABLED=false` in the production environment variables and restart the server (or redeploy).
2. **Instant Bypass Effect:** When `BILLING_ENABLED=false`, the client and server bypass paywall checks, instantly restoring uninterrupted access for all freelancers.
3. **Data Integrity:** No data is deleted. Existing payments and audit logs remain intact in PostgreSQL.
4. **Post-Mortem Investigation:** Review `public.subscription_audit_logs` and server logs for failure reasons before re-enabling.

---

## 3. Configuration & Operations Reference

### Required Environment Variables

```bash
# Feature Flag (Default: false)
BILLING_ENABLED="false"
VITE_BILLING_ENABLED="false"

# YouPI PG Gateway Integration
YOUPI_GATEWAY_URL="http://localhost:7000"
YOUPI_MERCHANT_ID="00000000-0000-0000-0000-000000000001"
YOUPI_WEBHOOK_SECRET="sec_your_production_hmac_secret_key"

# Merchant Receiving Details
SUBSCRIPTION_UPI_ID="crestflow@upi"
MERCHANT_BUSINESS_NAME="CrestFlow Technologies"
MERCHANT_GSTIN="27AAAAA0000A1Z5" # Optional GSTIN for tax invoice receipt

# Database & Supabase Service Role (for backend server writes)
SUPABASE_URL="https://uukriftpinzoyjjzmvth.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="ey..."
```

### Operational Tasks
- **Inspect Pending Queue:** Open Admin Command Center -> *Payment Approvals* tab.
- **Manual Override / Mark Paid:** Click *Approve* next to any pending/suspicious payment to grant access and write an immutable audit log entry.
- **Run Manual Reconciliation:**
  ```bash
  npm run job:reconcile
  ```
