# CrestFlow Billing Specification

This specification is the authoritative source of truth for CrestFlow's billing architecture, Firestore security controls, lifecycle states, and anti-bypass enforcement.

---

## 1. Plans and Tiers

CrestFlow offers three distinct operational tiers designed for freelance video editors, motion designers, and creative professionals:

| Plan | Tier Key | Billing Interval | Price (INR) | Features & Limits |
| :--- | :--- | :--- | :--- | :--- |
| **Free / Trial** | `trial` | 14 Days | ₹0 | Full Pro feature access for 14 days, up to 3 active clients, unlimited invoices, direct UPI QR generation. |
| **Pro Monthly** | `pro_monthly` | Monthly | ₹499 / mo | Unlimited clients, unlimited invoices, automated 6 AM delivery, client portal, review collection, direct UPI payment tracking. |
| **Pro Annual** | `pro_annual` | Annual | ₹4,999 / yr | All Pro Monthly features + 2 months free, priority roadmap requests, custom subdomain. |

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
1. `trialing`: User is in their 14-day evaluation window. `accessUntil` set to `signup + 14 days`.
2. `active`: User has a confirmed, active paid plan. `accessUntil` set to `currentPeriodEnd + gracePeriod`.
3. `past_due`: Recurring payment failed. Access maintained during 3-day grace period; email warning dispatched.
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
