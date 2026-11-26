# CrestFlow Pre-Launch & Go-Live Checklist

Authoritative deployment, verification, and rollback checklist for `entitlements/{uid}`, cardless 7-day trial, Razorpay Subscriptions/Orders, and public token-scoped invoices.

---

## 1. Canonical Plans & Pricing

Only these plans are permitted across UI, Worker validation, metadata, and docs:

| Tier | Duration | Price (INR) | Effective Rate | Worker Plan Env Var |
| :--- | :--- | :--- | :--- | :--- |
| **Trial** | 7 Days | **₹0** | 7-day free trial, no card needed, no automatic charge. | N/A (`/api/activate-trial`) |
| **Pro Monthly** | 30 Days | **₹79 / mo** | ₹79 / mo | `RAZORPAY_PLAN_MONTHLY` |
| **Pro Quarterly** | 90 Days | **₹199 / quarter** | ~₹66 / mo (Save 16%) | `RAZORPAY_PLAN_QUARTERLY` |
| **Pro Yearly** | 365 Days | **₹699 / year** | ~₹58 / mo (Best value · Save 26%) | `RAZORPAY_PLAN_YEARLY` |

Legacy one-rupee trial fees and discontinued billing intervals are permanently removed across the app.

---

## 2. Cloudflare Worker Configuration (TEST Mode First)

Set required secrets (`npx wrangler secret put <KEY>`):
- `RAZORPAY_KEY_ID` (`rzp_test_...` for staging/TEST mode verification)
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `FIREBASE_SERVICE_ACCOUNT`
- `FIREBASE_PROJECT_ID`
- `CRON_SECRET`
- `TRIAL_LEDGER_PEPPER`
- `RAZORPAY_PLAN_MONTHLY`, `RAZORPAY_PLAN_QUARTERLY`, `RAZORPAY_PLAN_YEARLY` (optional if using one-time Orders fallback)
- `RESEND_API_KEY`, `BASE_URL`

---

## 3. Razorpay Webhook Events

Endpoint: `<BASE_URL>/api/razorpay-webhook`
Subscribed events:
- `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.cancelled`, `subscription.halted`, `subscription.completed`
- `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`

---

## 4. Mandatory Safe Rollout Order

1. **Application + Entitlement Support First**: Build and verify UI/Worker reading `entitlements/{uid}`.
2. **Data Migration (Dry-Run Mandatory First)**:
   - Run `npx tsx scripts/migrate-entitlements.ts --dry-run` against production backup/target to audit every `entitlements/{uid}` and `trialClaims/{key}` record (active ₹1 trials keep exact remaining days; `tilakpopat2007@gmail.com` maps to `plan: 'lifetime'`).
   - Only after explicit approval, run with `--execute`.
3. **Deploy Firestore Security Rules**: `npx firebase deploy --only firestore:rules`.
4. **Deploy Cloudflare Worker**: `npx wrangler deploy`.
5. **Post-Deploy Verification**: Verify TEST mode Razorpay checkout (`UpgradeSheet` -> `Activating your plan...`), Explorer Mode sample workspace, Expired JSON/CSV export, and `/invoice/:id?t=...` client share links.
