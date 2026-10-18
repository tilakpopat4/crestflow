# Phase 02 Plan: Secure Backend, Subscription Administration & Fraud-Proof Verification System

## 1. Objective
Establish an airtight, non-bypassable backend security layer for CrestFlow subscriptions, an Admin Management Portal with manual email whitelist approval, and a reliable payment verification workflow preventing spoofed UTRs or client-side tampering.

---

## 2. Architecture & Security Specifications

### 2.1 Zero-Bypass PostgreSQL Row-Level Security (RLS)
Client-side checks (`localStorage`, state) are strictly for UI presentation. Authoritative protection is enforced directly in PostgreSQL:
- Create helper function `public.has_active_access(user_uuid UUID)`:
  - Returns `TRUE` if user's email is present in `public.subscription_whitelist`.
  - Returns `TRUE` if `public.profiles.subscription_status = 'active'` AND `now() < public.profiles.current_period_end`.
  - Otherwise returns `FALSE`.
- Secure `clients`, `work_items`, and `invoices` with `WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()))`:
  - **Result**: Any unauthorized attempt to inject or create clients, log work, or generate invoices without active subscription or whitelist approval will be rejected by the PostgreSQL engine with an immediate permission denial (`42501`), completely immunizing against browser tampering or dev tools bypass.

### 2.2 Email Whitelist Schema (`public.subscription_whitelist`)
```sql
CREATE TABLE IF NOT EXISTS public.subscription_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT 'Approved by Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Fraud-Proof Payment Verification & UTR De-duplication
- Prevent duplicate UTR re-use:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payments_unique_utr 
    ON public.subscription_payments(utr) 
    WHERE utr IS NOT NULL AND utr != '';
  ```
- Payment verification lifecycle:
  - `INITIATED`: Order generated, QR displayed.
  - `PENDING_VERIFICATION`: User submitted 12-digit UTR or transaction reference.
  - `SUCCESS`: Verified by YouPI-PG bank observation engine OR approved by Admin in Admin Tab.
  - `REJECTED`: Fake, mismatched, or invalid UTR.

---

## 3. Implementation Tasks Breakdown

### Task 1: Supabase Database Schema & RLS Guardrails
- Create `public.subscription_whitelist` table with admin management policies.
- Create PostgreSQL function `public.has_active_access(UUID)`.
- Enforce `has_active_access` on write policies for `clients`, `work_items`, and `invoices` (preserving read access for viewing/exporting existing records).
- Add unique constraint index on `utr` in `public.subscription_payments`.
- Add Realtime publication for `subscription_whitelist`.

### Task 2: Supabase-Powered Admin Management Portal (`AdminTab.tsx`)
- Migrate `AdminTab.tsx` data queries from Firebase to Supabase.
- Add **Subscription Management** workspace:
  - **Section A: User Subscriptions**: Searchable table of all registered users, email, current plan, status badge, renewal date, and action buttons (`Grant +30 Days`, `Revoke Access`).
  - **Section B: Payment Approvals Queue**: Live feed of submitted UTR payments (`PENDING_VERIFICATION`). Displays order ID, user, ₹49 amount, UTR number, and timestamp. Action buttons: `Approve & Activate` (instantly credits 30 days) and `Reject`.
  - **Section C: VIP Email Whitelist**: Form to add approved emails (free full access without payment) and table to view/remove whitelisted emails.

### Task 3: Verification Flow in `youpiService.ts` & `useSubscription.ts`
- Update `submitUtrForVerification`:
  - Checks duplicate UTRs in `subscription_payments`.
  - Records payment status as `PENDING_VERIFICATION`.
  - Queries `subscription_whitelist` by user email: if whitelisted, grants immediate VIP access.
- Update `useSubscription` to recognize whitelisted status (`isWhitelisted: true`, `hasAccess: true`).

### Task 4: UI Updates in `SubscriptionModal.tsx` & Headers
- Add "Verification in Progress" state in `SubscriptionModal.tsx` when a UTR has been submitted and is awaiting approval.
- Add VIP/Whitelisted badge in `GlobalHeader.tsx` ("VIP Member" or "Pro • Partner Access").

---

## 4. Verification & Testing Steps
1. **Bypass Resistance Test**: Attempt direct database insert via Supabase client without an active subscription; verify PostgreSQL throws RLS violation.
2. **Whitelist Test**: Add a test email in Admin Tab; verify logging in with that email grants immediate full access without payment prompt.
3. **UTR Verification Test**: Submit a 12-digit UTR in `SubscriptionModal`; verify it appears in the Admin Review Queue and approving it unlocks the user's account for 30 days.
4. **Duplicate UTR Test**: Submit the same UTR from a second account; verify system rejects duplicate reference.
