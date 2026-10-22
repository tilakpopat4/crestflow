# CrestFlow Go-Live Verification Checklist

Authoritative pre-launch deployment checklist for CrestFlow subscription billing, security rules, webhook integrations, and database hygiene.

---

## 1. Plan Configurations & Verified Live Pricing

Verify all user-facing pages, disclosures, and gateway plans use strictly these 4 tiers:

| Tier | Interval | Live Price (INR) | Effective Rate | Razorpay Plan Key |
| :--- | :--- | :--- | :--- | :--- |
| **Trial** | 7 Days | **₹1 today** (non-refundable) | Trial verification fee | N/A (Addon on auth) |
| **Pro Monthly** | Monthly | **₹79 / month** | ₹79 / mo | `PLAN_ID_MONTHLY` |
| **Pro Quarterly** | 3 Months | **₹199 / quarter** | ~₹66 / mo | `PLAN_ID_QUARTERLY` |
| **Pro 6-Month** | 6 Months | **₹449 / 6 months** | ~₹75 / mo | `PLAN_ID_HALF` |
| **Pro Yearly** | Annual | **₹899 / year** | ~₹75 / mo | `PLAN_ID_YEARLY` |

> [!IMPORTANT]
> The only valid production prices are **₹79, ₹199, ₹449, and ₹899** (with non-refundable **₹1** trial verification). No legacy amounts (499, 1299, 2399, 4499, 799, 4999) are permitted anywhere in code, configuration, or documentation.

---

## 2. Cloudflare Worker Secrets Configuration

Provision all required production secrets via `npx wrangler secret put <SECRET_NAME>`:

- [ ] `RAZORPAY_KEY_ID`: Live Razorpay Key ID (`rzp_live_...`)
- [ ] `RAZORPAY_KEY_SECRET`: Live Razorpay Key Secret
- [ ] `RAZORPAY_WEBHOOK_SECRET`: Live Razorpay Webhook Secret for HMAC-SHA256 signature verification
- [ ] `FIREBASE_SERVICE_ACCOUNT`: Full Firebase Admin Service Account JSON string
- [ ] `CRON_SECRET`: High-entropy bearer secret required for `/api/reconcile-cron`
- [ ] `TRIAL_LEDGER_PEPPER`: Secret salt used when computing SHA-256 digests of emails and VPAs
- [ ] `PLAN_ID_MONTHLY`: Razorpay Plan ID for ₹79/month
- [ ] `PLAN_ID_QUARTERLY`: Razorpay Plan ID for ₹199/3 months
- [ ] `PLAN_ID_HALF`: Razorpay Plan ID for ₹449/6 months
- [ ] `PLAN_ID_YEARLY`: Razorpay Plan ID for ₹899/year
- [ ] `RESEND_API_KEY`: API key for automated lifecycle emails
- [ ] `BASE_URL`: Application origin (e.g. `https://crestflow.app`) configured in `wrangler.jsonc` and Worker environment

---

## 3. Razorpay Live Webhook Configuration

In the Razorpay Dashboard, configure a live webhook with the following parameters:

- **Webhook URL**: `<BASE_URL>/api/razorpay-webhook`
- **Secret**: Must exactly match `RAZORPAY_WEBHOOK_SECRET`
- **Active Subscription Events**:
  - `subscription.authenticated`
  - `subscription.activated`
  - `subscription.charged`
  - `payment.captured`
  - `payment.failed`
  - `subscription.cancelled`
  - `subscription.halted`
  - `subscription.completed`
  - `refund.processed`

---

## 4. Security Rules Deployment

Deploy the locked Firestore security rules:
```bash
npx firebase deploy --only firestore:rules
```
Verify client write denial on sensitive collections:
- `trial_ledger/{hash}`: `allow read, write: if false;`
- `subscriptions/{uid}`: `allow write: if false;`
- `webhook_events/{id}`: `allow read, write: if false;`

---

## 5. Real ₹1 Test Verification & Test Ledger Cleanup

- [ ] Initiate a trial subscription using a live card / UPI account on production frontend.
- [ ] Confirm ₹1 addon capture succeeds.
- [ ] Confirm Firestore `subscriptions/{uid}` receives `status: 'trialing'` and `trialEndsAt` equals subscription `start_at`.
- [ ] Confirm `trial_ledger/{hash}` records salted email and VPA digests.
- [ ] **CRITICAL DATABASE CLEANUP**:
  1. Open Firebase Admin Console / Firestore.
  2. Locate and delete all test documents in `trial_ledger/` created during the ₹1 live test.
  3. Locate and delete test records in `subscriptions/` for the test user UID.
  4. Cancel the test subscription in Razorpay dashboard so recurring billing does not trigger.
  5. Verify the production ledger is pristine before opening registration to customers.

---

## 6. Daily Reconciliation Cron Setup

- [ ] Ensure Cloudflare cron trigger `["0 0 * * *"]` is registered in `wrangler.jsonc`.
- [ ] Verify manual trigger protection: `POST /api/reconcile-cron` requires `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>` via constant-time comparison.
