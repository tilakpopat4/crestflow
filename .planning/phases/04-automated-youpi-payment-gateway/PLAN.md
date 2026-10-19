# Phase 4: Automated Zero-Touch YouPI Payment Gateway Integration

## Executive Objective
Transform the CrestFlow subscription payment flow into a **100% automated, zero-touch payment gateway experience** powered by self-hosted **YouPI PG**. When a customer scans the QR code or pays via a UPI app (GPay / PhonePe / Paytm / Cred), the system automatically detects the bank credit via background observers, fetches the transaction details (UTR, payer info, timestamp), and activates the subscription in real-time—**with zero requirement for the user to copy or enter reference IDs, UTRs, or screenshots**.

---

## 1. System Architecture & Zero-Touch Data Flow

```
   ┌──────────────────────────────────────────────────────────────┐
   │                  1. User Initiates Payment                   │
   │  CrestFlow UI calls YouPI: POST /api/v1/checkout/create      │
   │  YouPI allocates single-active queue slot & returns QR + URI │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                  2. User Scans / Clicks Link                 │
   │  User approves payment in GPay / PhonePe / Paytm / Cred      │
   │  Funds transfer directly via P2P UPI to Merchant Bank        │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │              3. Instant Bank Credit Notification             │
   │  Merchant bank dispatches credit SMS / Gmail alert           │
   │  Gmail/SMS Observer captures alert & sends to YouPI Gateway  │
   │  POST /api/v1/pollers/events                                 │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │            4. Deterministic Auto-Attribution Match           │
   │  YouPI matches observed amount == active session amount      │
   │  Session transitions: ACTIVE -> SUCCESS                      │
   │  Stores bank UTR and timestamp automatically in DB           │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │           5. Real-Time Frontend Settlement (SSE / Poll)      │
   │  SubscriptionModal receives status: 'SUCCESS' via stream     │
   │  Modal auto-transitions to "Subscription Activated"          │
   │  Custom claims refreshed, full Pro access unlocked           │
   └──────────────────────────────────────────────────────────────┘
```

---

## 2. Work Breakdown & Implementation Tasks

### Task 1: Clean Gateway UX — Eliminate Manual UTR Entry
- **File**: `src/components/SubscriptionModal.tsx`
- **Actions**:
  - Remove the manual UTR input accordion, text field, and submit buttons (`showManualUtr`, `utrNumber`).
  - Implement a streamlined, premium gateway interface:
    1. Plan Summary & Amount (`₹49`).
    2. Dynamic Vector SVG QR Code with 5-minute slot countdown.
    3. One-click deep links for mobile UPI apps (`GPay`, `PhonePe`, `Paytm`, `Cred`).
    4. Clean, calm status indicator:
       - `Awaiting UPI payment... Scanning bank rails in real-time.`
    5. Automatic transition: As soon as the observer settles the session, the UI automatically transitions to the success screen and triggers `refreshSubscription()`.
- **Design Constraint**: Strictly adhere to `GEMINI.md` (no pastel badges, no bouncing animations, restrained slate/indigo styling).

### Task 2: High-Frequency Observer & Stream Poller
- **Files**: `src/lib/youpiService.ts`, `src/components/SubscriptionModal.tsx`
- **Actions**:
  - Implement Server-Sent Events (SSE) listener or fast 2-second polling to `GET /api/v1/checkout/:sessionId/stream` or `GET /api/v1/payments/:id/status`.
  - Handle session lifecycle gracefully:
    - `ACTIVE`: Display QR and listen for bank confirmation.
    - `SUCCESS`: Immediately resolve payment, save payment details (UTR, provider, timestamp), and activate subscription.
    - `EXPIRED` / `CANCELLED`: Notify user and offer a one-click retry.

### Task 3: YouPI Payment API Configuration & Gateway Connectivity
- **Directory**: `youpi-pg/apps/payment-api`
- **Actions**:
  - Configure `youpi-pg` environment:
    - `PORT=7000`
    - `DATABASE_URL` (SQLite WAL or PostgreSQL)
    - `MERCHANT_VPA`: Set to merchant receiving UPI ID (e.g. `tilakpopat2007-1@okaxis` or configured merchant VPA).
  - Ensure CORS permits requests from `http://localhost:3000`.
  - Validate that `POST /api/v1/checkout/create-session` and `GET /api/v1/payments/:id/status` return proper JSON schemas.

### Task 4: Bank Observer Integration & Simulator for Development
- **Directory**: `youpi-pg/apps/gmail-observer` & dev simulators
- **Actions**:
  - Provide configuration for `gmail-observer` using Gmail API or IMAP to listen for bank credit alerts (e.g., Axis Bank, HDFC, ICICI, SBI).
  - Enable development simulator endpoint:
    `POST /api/v1/checkout/:sessionId/simulate-observation`
    Allows instant local end-to-end testing of real-time auto-attribution without requiring live bank transactions during staging.

### Task 5: Backend Claim Synchronization & Verification
- **Files**: `src/lib/youpiService.ts`, Express server
- **Actions**:
  - Upon successful payment observation, record payment details (amount, order ID, auto-extracted UTR, paid_at timestamp) into `subscriptions` and `payments` tables.
  - Automatically update Firebase custom claims (`crestflow_tier: 'pro'`) so all Firestore paywalls recognize the user immediately.

---

## 3. Verification Plan & Pass Criteria

| Test Case | Procedure | Pass Criteria |
| :--- | :--- | :--- |
| **1. UI Zero-Touch Verification** | Open Subscription Modal at `http://localhost:3000/` | QR code appears with timer; **zero manual input fields** or UTR boxes visible. |
| **2. Gateway Connectivity** | Click plan and initiate payment session | YouPI API creates session, returns genuine UPI URI with merchant VPA and exact amount. |
| **3. Automated Attribution** | Trigger bank credit event (or simulation) | Gateway auto-matches amount; status transitions `ACTIVE -> SUCCESS` without user intervention. |
| **4. Instant Modal Transition** | Observe modal while payment settles | Modal auto-advances to "Subscription Activated" within $\le 3$ seconds of bank credit. |
| **5. Claim Refresh** | Check app state post-activation | Global Header updates to `Pro • 30d`; paywall restrictions lifted. |

---

## 4. Rollout & Safety Guarantees
- **No Manual Data Entry**: Zero risk of user typing incorrect 12-digit UTRs or confusing transaction numbers.
- **Single-Slot FIFO Concurrency**: Guaranteed zero attribution ambiguity via YouPI's deterministic single-active-slot queue.
- **Zero Aggregator Intermediary**: 100% direct settlement to merchant bank account with zero transaction cuts or settlement delays.
