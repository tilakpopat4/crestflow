# CrestFlow Billing & Access Architecture Specification

Authoritative technical specification for CrestFlow's server-governed `entitlements` model, cardless 7-day trial, Razorpay checkout/webhooks, Firestore rules, and public invoice sharing.

---

## 1. Plans and Pricing (`src/shared/pricing.ts`)

CrestFlow has **no free tier** (previous 2-client / 3-invoice limits are retired). Signed-in users without a plan explore safely with in-memory sample data (`Explorer Mode`).

| Tier | Plan Code | Billing Interval | Price (INR) | Effective Rate / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Free Trial** | `pro_trial` | 7 Days | ₹0 today | 7-day free trial, no card needed, no automatic charge. One per person. |
| **Pro Monthly** | `pro_monthly` | Monthly (30 days) | ₹79 / mo | ₹79 / mo · Billed ₹79 today |
| **Pro Quarterly** | `pro_quarterly` | 3 Months (90 days) | ₹199 / quarter | ~₹66 / mo · Save 16% vs monthly |
| **Pro Yearly** | `pro_yearly` | 1 Year (365 days) | ₹699 / yr | ~₹58 / mo · Best value · Save 26% vs monthly |
| **Lifetime** | `lifetime` | Unlimited | Admin SDK only | Internal/admin provisioned (`validUntil = 2099-12-31T23:59:59.000Z`) |

Configurable origin: `BASE_URL` (e.g. `https://crestflow.space`).

---

## 2. Server-Written Entitlements (`entitlements/{uid}`)

- Clients can **read** their own document `entitlements/{uid}`; **all client writes are denied** (`allow write: if false;`).
- Effective entitlement never relies on a cron job: Firestore Rules and Worker endpoints evaluate:
  `status in ['trialing', 'active', 'grace'] && validUntil > request.time`.
- Core fields: `userId`, `status` (`none` | `trialing` | `active` | `grace` | `expired` | `suspended`), `plan`, `billingCycle`, `validUntil`, `graceUntil`, `trialStartedAt`, `trialUsed`, `cancelAtPeriodEnd`, `checkoutMode` (`subscription` | `order`), `razorpayCustomerId`, `razorpaySubscriptionId`, `razorpayOrderId`, `razorpayPaymentId`, `lastEventTimestamp`, `updatedAt`.

---

## 3. Cardless Single-Use Trial (`trialClaims/{claimKey}`)

- Activated exclusively by `POST /api/activate-trial` (verifies Firebase ID token, no card/Razorpay needed).
- Atomically writes `trialClaims/uid_<uid>`, `trialClaims/email_<sha256(normalizedEmail)>`, and `entitlements/{uid}` (`status: 'trialing'`, `validUntil: now + 7d`) via Firestore `:commit`.
- Gmail/Googlemail dot-stripping and `+tag` removal prevent creating multiple accounts to farm trials.
- Account deletion preserves `trialClaims` so deleting and recreating an account does not reset trial eligibility.

---

## 4. Razorpay Subscriptions & Order Fallback

- **Paid subscriptions** (`/api/create-subscription`): Auto-renewing Razorpay Subscriptions when `RAZORPAY_PLAN_MONTHLY`, `RAZORPAY_PLAN_QUARTERLY`, and `RAZORPAY_PLAN_YEARLY` are configured; falls back cleanly to one-time Razorpay Orders (`mode: 'order'`) with clear non-auto-renew disclosure (`Pay once, valid until <date>, no auto-renewal.`).
- **Mid-period plan switches**: Disabled while an active paid period is running (`400 PLAN_SWITCH_DISABLED`).
- **Verification & Webhooks**:
  - `POST /api/verify-payment` verifies HMAC-SHA256 signatures and queries Razorpay REST payment amount/status before activating `entitlements/{uid}`.
  - `POST /api/razorpay-webhook` verifies `x-razorpay-signature`, deduplicates via `webhook_events/{eventId}`, enforces monotonic ordering (`lastEventTimestamp`), handles full refunds (`expired`), partial refunds (retained access), renewal failures (`grace` for 3 days set once), cancellations (`cancelAtPeriodEnd: true`), and halts (`expired`).

---

## 5. Firestore Rules & Public Access

- **Owner Read & Export Always Allowed**: Expired users can read all existing clients, work items, invoices, and reviews and export JSON/CSV backups anytime without entitlement.
- **Mutations & Worker Actions**: Creating/updating/deleting clients, work items, invoices, reviews moderation, AI summarize (`/api/ai/authorize`), invoice sharing/sending, and Drive session mutations require `entitled(uid)` and return `{ code: 'ENTITLEMENT_REQUIRED' }` on Workers.
- **Safe Profile Edits**: Updating name, bio, avatar remains allowed signed-in; `username`, `sampleWorks`, and protected billing fields stay locked after expiry.
- **Public Token-Scoped Invoices (`/invoice/:id?t=...`)**: 192-bit CSPRNG share token stored SHA-256 hashed in `invoice_shares/{invoiceId}`, revocable, rate-limited, `noindex`, non-enumerable, and stays viewable/payable even after freelancer expiry. Client `"I've paid"` claim records a pending claim requiring freelancer confirmation.
- **Public Onboarding Requests (`/:username/onboarding`)**: Active and recently expired freelancers (`<= 30 days`) continue receiving `serviceRequests` and `reviews`; after 30 days expired, `/api/public-profile` returns `acceptingRequests: false`.

---

## 6. Safe Deployment Order

1. Create `entitlements` structure + deploy application code (reads `entitlements/{uid}`, keeps fallback compatibility).
2. Run migration dry-run first (`npx tsx scripts/migrate-entitlements.ts --dry-run`) and inspect report before `--execute`.
3. Deploy stricter `firestore.rules` (enforcing `entitlements/{uid}` writes).
4. Deploy updated Cloudflare Worker (`npx wrangler deploy`) after confirming TEST mode Razorpay env vars.
