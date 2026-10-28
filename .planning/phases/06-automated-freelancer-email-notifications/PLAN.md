# Phase 6: Automated Freelancer Lifecycle Email Notifications System

## Executive Objective
Implement a robust, automated, and customized transactional email notification system powered by **Resend** and the **Cloudflare Worker** backend. The system will greet and notify freelancers on **every key lifecycle occasion**:
1. **Sign-up & Workspace Initialization**: A customized welcome greeting guiding the freelancer through UPI setup, public onboarding link, and logging their first project.
2. **Monthly Payment Cycle**: Automated payment confirmation & receipt upon recurring subscription renewal (`subscription.charged`) or invoice cycle settlement, with transparent breakdown of dates, plan details, and receipt reference.
3. **Working Days Milestones & Streaks**: Automated celebratory milestones when completing notable days of freelancing (30 days, 60 days, 100 days, 180 days, 240 days, 1 year, etc.), congratulating their dedication with personalized stats.
4. **New Client Onboarding Requests**: Instant notification email sent to the freelancer whenever a prospective client submits a service request on their public profile (`/?freelancerId=:id`), providing client contact info, proposed rate, project scope, and direct workspace link.

---

## 1. System Architecture & Email Event Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NOTIFIABLE OCCASIONS                             │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│  1. Sign-Up       │  2. Monthly Cycle │  3. Days Worked   │  4. Client Lead │
│  (Welcome Mail)   │  (Payment Receipt)│  (Milestone Mail) │  (New Lead Mail)│
└─────────┬─────────┴─────────┬─────────┴─────────┬─────────┴─────────┬───────┘
          │                   │                   │                   │
          ▼                   ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ POST /api/notify/ │ │ Razorpay Webhook  │ │ Daily Reconcile   │ │ Public Onboarding │
│ welcome           │ │ subscription.     │ │ Cron or Trigger   │ │ Form Submission   │
│ (First-time user) │ │ charged           │ │ (Anniversary/Days)│ │ (serviceRequests) │
└─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
          │                   │                   │                   │
          └───────────────────┼───────────────────┼───────────────────┘
                              ▼
            ┌───────────────────────────────────┐
            │   Cloudflare Worker Notification  │
            │   Router & Service (Resend API)   │
            │   - Idempotency & Deduplication   │
            │   - Restrained HTML Templates     │
            │   - GEMINI.md Strict Design Rules │
            └─────────────────┬─────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────┐
            │  Freelancer's Inbox (HTML + Text) │
            │  - Clean typography & hierarchy   │
            │  - No emojis or neon pills        │
            │  - Clear direct actionable CTAs   │
            └───────────────────────────────────┘
```

---

## 2. Work Breakdown & Implementation Tasks

### Task 1: Core Lifecycle Email Templates (`worker/resend.ts`)
- **File**: `worker/resend.ts`
- **Actions**:
  - Implement four dedicated, customized email generator and sender functions:
    1. `sendWelcomeFreelancerEmail(env, { toEmail, name, workspaceUrl })`:
       - Welcoming freelancer to CrestFlow.
       - Highlighting key next steps: completing UPI details for one-click invoice QR generation, sharing public client intake URL, and logging their active clients.
    2. `sendMonthlyPaymentChargedEmail(env, { toEmail, name, planName, amountFormatted, periodStart, periodEnd, nextBillingDate, invoiceId })`:
       - Professional payment confirmation for recurring billing cycles.
       - Clean table/breakdown showing amount charged, access coverage dates, and next renewal date.
    3. `sendWorkMilestoneEmail(env, { toEmail, name, milestoneTitle, daysWorked, durationFormatted, celebrationMessage })`:
       - Congratulatory milestone note (30 days, 60 days, 100 days, 180 days, 240 days, 1 year, etc.).
       - Acknowledges consistency and independent freelancing journey.
    4. `sendNewClientRequestEmail(env, { toEmail, freelancerName, clientName, contactName, contactEmail, contactPhone, instagram, proposedRate, projectDetails, reviewUrl })`:
       - Immediate actionable lead alert.
       - Clear itemized briefing with client details and project description.
  - Strict compliance with `GEMINI.md`:
    - No emoji characters in email titles, subjects, headers, or body copy.
    - Colors: `#F8FAFC` background, `#FFFFFF` card, `#0F172A` text, `#475569` muted text, `#4F46E5` action button.
    - Plain text fallback alongside responsive HTML.

### Task 2: Dedicated Notification Routes & Controller (`worker/routes/notifications.ts` & `worker/index.ts`)
- **Files**: `worker/routes/notifications.ts`, `worker/index.ts`
- **Actions**:
  - Create `worker/routes/notifications.ts` (< 250 lines):
    - `handleNotifyWelcome(request, env)`: Validates authenticated user via Bearer token. Checks Firestore `profiles/{uid}/private/settings` or profile doc for `welcomeEmailSent`. If false, dispatches `sendWelcomeFreelancerEmail` and sets `welcomeEmailSent: true`.
    - `handleNotifyNewClientRequest(request, env)`: Receives `{ freelancerId, requestId, clientName, contactName, contactEmail, contactPhone, instagram, proposedRate, projectDetails }`. Fetches freelancer's profile document from Firestore to obtain freelancer's email address and name. Dispatches `sendNewClientRequestEmail`. Rate-limited / sanitized to prevent abuse.
  - Update `worker/index.ts`:
    - Mount `POST /api/notify/welcome`.
    - Mount `POST /api/notify/new-client-request`.

### Task 3: Monthly Billing Cycle Email Integration (`worker/routes/webhook.ts`)
- **File**: `worker/routes/webhook.ts`
- **Actions**:
  - In `handleRazorpayWebhook`, on `eventType === 'subscription.charged'` or successful renewal:
    - Extract user email and name from `rzpSub.notes` or Firestore subscription record.
    - Format amount (`₹49` or plan rate), billing start/end dates, and subscription ID.
    - Dispatch `sendMonthlyPaymentChargedEmail` asynchronously via `ctx.waitUntil` or direct await.
    - Deduplicate against webhook event ID to prevent duplicate charge emails.

### Task 4: Work Days Milestone Trigger & Reconciliation (`worker/reconcile.ts` & `src/lib/anniversary.ts`)
- **Files**: `worker/reconcile.ts`, `worker/resend.ts`, `src/hooks/useAnniversaryCheck.ts`
- **Actions**:
  - Define canonical milestone triggers: 30 days (1 mo), 60 days (2 mos), 100 days, 180 days (6 mos), 240 days ("240 days worked"), 365 days (1 yr), 2 yrs, 3 yrs.
  - In `worker/reconcile.ts`:
    - Check active profiles during daily cron or add milestone evaluation helper.
    - Check user's `sentMilestones` array in private settings.
    - If user has completed a milestone and has not been notified yet, send `sendWorkMilestoneEmail` and record milestone ID in `sentMilestones`.
  - In `src/hooks/useAnniversaryCheck.ts`:
    - When anniversary or work journey milestone is active, check if milestone email trigger endpoint `/api/notify/milestone` should be notified, ensuring seamless delivery even if user is not in batch cron.

### Task 5: Client-Side Trigger Hooks (`useUserProfile.ts` & `PublicFreelancerProfile.tsx`)
- **Files**: `src/hooks/useUserProfile.ts`, `src/components/PublicFreelancerProfile.tsx`
- **Actions**:
  - **`useUserProfile.ts`**:
    - After user signs in and public profile is verified, if `welcomeEmailSent` is not set in local storage or profile, call `/api/notify/welcome` with ID token.
    - Set local cache flag to prevent duplicate checks.
  - **`PublicFreelancerProfile.tsx`**:
    - In `handleSubmit`, after `setDoc(reqRef, newRequest)` succeeds:
      - Call `/api/notify/new-client-request` with the client onboarding details and `freelancerId`.
      - Freelancer receives immediate email alert even if they are offline or away from WhatsApp.

### Task 6: Comprehensive Automated Test Suite (`tests/email-notifications.test.ts`)
- **Files**: `tests/email-notifications.test.ts`, `package.json`
- **Actions**:
  - Build automated integration test suite using `node:test` covering:
    1. Welcome email: Dispatched on first sign-in / profile init, idempotent on second call.
    2. Monthly cycle email: Dispatched on `subscription.charged` with correct plan details and receipt info.
    3. Work milestone email: Dispatched on milestone completion, verified against milestone deduplication list.
    4. New client request email: Dispatched with complete client payload and freelancer recipient address.
    5. Formatting & Brand compliance: Verify no emoji characters in sent emails, valid HTML and text bodies.
  - Update `package.json` test script to include `tests/email-notifications.test.ts`.
  - Validate with `npm run test` and `npm run lint`.

---

## 3. Design & Quality Constraints

1. **Brand & Email Design (`GEMINI.md`)**:
   - Palette: White `#FFFFFF`, slate `#F8FAFC`, `#E2E8F0` border, primary `#4F46E5`.
   - Typography: Clean system sans-serif (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif`).
   - No emojis or multicolor symbols anywhere in subject lines or body text.
   - Status indicators in email: Plain text with clean slate/steel blue color.
2. **File Size & Modularity (`AGENTS.md`)**:
   - Keep all files strictly under 300 lines.
   - Extract notification routes to `worker/routes/notifications.ts`.
   - Keep email templates modular in `worker/resend.ts`.
3. **Idempotency & Abuse Protection**:
   - All email triggers must be idempotent: welcome emails sent once per account; milestone emails sent once per milestone ID; payment emails deduplicated by event ID.
   - Rate limit and sanitize client onboarding notification inputs.

---

## 4. Verification Plan & Acceptance Criteria

| Criteria | Verification Procedure | Pass Threshold |
| :--- | :--- | :--- |
| **Welcome Email Trigger** | Trigger `/api/notify/welcome` with valid user auth token. | Resend receives email to user address with getting-started checklist; second request returns `already_sent: true`. |
| **Monthly Payment Cycle** | Post `subscription.charged` payload to `/api/razorpay-webhook`. | Status updates to `active`; Resend captures monthly payment receipt email with correct amount and period. |
| **Work Milestone Email** | Invoke milestone notification with days worked = 30 or 240. | Resend captures milestone celebration email with stats; duplicate call is ignored. |
| **New Client Request Email** | Submit onboarding request via `PublicFreelancerProfile` or `/api/notify/new-client-request`. | Service request saved in Firestore; freelancer receives email with client contact and scope. |
| **Brand Adherence** | Regex search on all email subjects and HTML templates for emoji or disallowed styles. | Zero emoji found, conforms 100% to `GEMINI.md`. |
| **File Size Audit** | Inspect line count of `worker/resend.ts`, `worker/routes/notifications.ts`, and modified files. | All files $\le 300$ lines. |
| **Automated Test Suite** | Run `npm run test`. | All test suites pass with 0 errors. |
