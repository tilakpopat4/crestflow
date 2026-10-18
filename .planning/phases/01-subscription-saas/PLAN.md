# Phase Plan: 14-Day Free Trial & Subscription SaaS (with YouPI-PG)

## 1. Objective
Transform CrestFlow from an open tool into a subscription-based SaaS model featuring:
- **14-Day Full-Access Free Trial** starting upon initial account creation.
- **Paywall / Access Guard** upon trial expiration (allowing read-only or renewal prompt).
- **Self-Hosted YouPI-PG Integration** to generate UPI payment intents, handle callbacks, and activate/renew subscriptions.
- **Billing & Subscription Management UI** in user profile/settings.

---

## 2. Architecture & Data Model

### Firestore User Subscription Schema (`users/{uid}`)
```typescript
export interface UserSubscription {
  status: 'trialing' | 'active' | 'expired' | 'canceled';
  trialStartedAt: number;     // timestamp (ms)
  trialEndsAt: number;        // timestamp (ms) - trialStartedAt + 14 days
  plan: 'monthly' | 'yearly';
  currentPeriodStart?: number;
  currentPeriodEnd?: number;  // timestamp (ms) of subscription expiry
  lastPaymentId?: string;
  lastPaymentAmount?: number;
  updatedAt: number;
}
```

### Entitlement Logic (`useSubscription` Hook)
- `isTrialActive`: `Date.now() < trialEndsAt`
- `isSubscriptionActive`: `status === 'active' && Date.now() < currentPeriodEnd`
- `hasAccess`: `isTrialActive || isSubscriptionActive`
- `daysRemaining`: Calculated countdown of trial or active subscription.

---

## 3. Implementation Tasks Breakdown

### Task 1: Subscription State & Entitlement Hook
- Extend `UserProfile` and Firestore user document with `UserSubscription` fields.
- Auto-provision 14-day free trial on first login in `useFirestore` / `Auth` flow.
- Create `useSubscription()` hook:
  - Returns `{ hasAccess, isTrial, daysLeft, subscription, showPaywall }`.
  - Injects a trial banner (e.g. *"Trial: 9 days remaining • Upgrade to Pro"*).

### Task 2: Paywall & Access Guards
- Soft Lock vs Hard Lock:
  - Allow read-only access (viewing existing clients, reviewing past work, exporting CSV).
  - Gate write operations (adding new clients, generating new invoices, automated 6:00 AM auto-invoicing) behind `hasAccess`.
- Show high-conversion Upgrade Modal when trial expires or when clicking locked actions.

### Task 3: Self-Hosted YouPI-PG Gateway Integration
- **YouPI-PG API Client**:
  - Endpoint to initiate subscription payment order:
    - `POST /api/create-subscription-order` (User ID, Plan, Amount, Callback URL).
    - Communicates with self-hosted YouPI-PG instance.
  - Webhook / Verification endpoint:
    - `POST /api/youpi-webhook`: Verifies transaction signature/hash from YouPI-PG.
    - Updates Firestore `users/{uid}/subscription` to `status: 'active'`, extending `currentPeriodEnd` by 30 days (or 365 days).
    - Logs transaction in `subscription_invoices` collection.

### Task 4: Billing & Checkout UI
- Pricing Modal:
  - Monthly Plan (e.g., ₹299/mo) & Annual Plan (e.g., ₹2,499/yr).
  - Feature highlights (Unlimited Clients, Automated 6 AM Invoicing, Dynamic UPI QR Invoices, Gmail Auto-Send, Client Portal).
- Checkout Flow:
  - Generates instant UPI Intent / dynamic QR code powered by YouPI-PG.
  - Live polling or webhook acknowledgment that refreshes status to active upon payment.
- Subscription Tab in `ProfileModal`:
  - View current plan, renewal date, and billing history.

---

## 4. Verification & Testing
1. **New User Registration Test**: Verify 14-day trial correctly timestamps `trialEndsAt`.
2. **Expired Trial Test**: Simulate expired timestamp; verify write actions trigger paywall.
3. **Payment Initiation Test**: Verify order generation payload to YouPI-PG instance.
4. **Webhook Activation Test**: Simulate YouPI-PG callback; verify instant account unfreeze.
