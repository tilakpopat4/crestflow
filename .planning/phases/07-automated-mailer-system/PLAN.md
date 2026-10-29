# Phase 7: Automated Freelancer Lifecycle Mailer & Notification System

## Executive Objective
Implement a production-grade, automated mailer system connecting all user notifications and customer touchpoints through `support.crestflow@gmail.com`, fulfilling five core operational requirements:
1. **Welcome Greeting Mail**: On first sign-up, every user receives a customized email celebrating *"Congrats You've Started Your Journey"* with actionable setup guidance.
2. **Career Milestone Celebrations**: Automated customized emails dispatched on notable freelancing milestones (e.g., 100 days worked, 6 months / 180 days, 1 year / 365 days).
3. **Client Payment Due Today Alerts**: An automated customized notification alerting the freelancer when a client has a payment or retainer cycle due today.
4. **Instant Contact Us Auto-Reply**: When anyone submits the Contact Us form, an immediate acknowledgment email is sent to them: *"Our Team Will Contact you within 48 Hours"*, while the inquiry is forwarded to CrestFlow support.
5. **Unified Sender & Support Identity**: All communications and reply-to channels are permanently unified under `support.crestflow@gmail.com`.

---

## 1. Architectural Architecture & Event Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MAILER EVENT TRIGGERS                            │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│  1. Sign-Up       │  2. Milestones    │  3. Payment Due   │  4. Contact Us  │
│  "Started Your    │  (100 Days,       │  (Client Due      │  (Dual Dispatch:│
│   Journey"        │   6 Mo, 1 Yr)     │   Today Alert)    │   48h Auto-Reply│
│                   │                   │                   │   + Support Fwd)│
└─────────┬─────────┴─────────┬─────────┴─────────┬─────────┴─────────┬───────┘
          │                   │                   │                   │
          ▼                   ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ POST /api/notify/ │ │ POST /api/notify/ │ │ POST /api/notify/ │ │ POST /api/notify/ │
│ welcome           │ │ milestone         │ │ payment-due-today │ │ contact           │
│ (Idempotent UID)  │ │ (Idempotent ID)   │ │ (1x/client/day)   │ │ (Auto-ack sender) │
└─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
          │                   │                   │                   │
          └───────────────────┼───────────────────┼───────────────────┘
                              ▼
            ┌───────────────────────────────────┐
            │    Cloudflare Worker / Resend     │
            │    Sender: support.crestflow@     │
            │            gmail.com              │
            │    Reply-To: support.crestflow@   │
            │              gmail.com            │
            │    Templates: Zero-Emoji, Flat    │
            │    Idempotency: Atomic Queue & DB │
            └─────────────────┬─────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────┐
            │ User & Client Inboxes             │
            │ - Restrained, clean formatting    │
            │ - Clear actionable next steps     │
            └───────────────────────────────────┘
```

---

## 2. Work Breakdown & Implementation Tasks

### Task 1: Email Template Registry Expansion (`worker/emailTemplates.ts`)
- **File**: `worker/emailTemplates.ts`
- **Actions**:
  - Update `renderWelcomeFreelancerTemplate`:
    - Subject: `Congrats You've Started Your Journey | CrestFlow`
    - Content: Celebrate taking the step into independent freelancing, outline three immediate steps (configuring UPI handle in profile, sharing client onboarding portfolio, logging first deliverables), and provide direct dashboard link.
  - Update `renderWorkMilestoneTemplate`:
    - Ensure support for 100 days worked, 6 months (180 days), 1 year (365 days), and custom day counts.
    - Subject: `Milestone Reached: [Milestone Title] | CrestFlow`
  - Add `renderPaymentDueTodayTemplate`:
    - Data: `{ freelancerName?: string; clientName: string; amountDueFormatted: string; paymentBasis: string; dueDateFormatted: string; invoiceId?: string; workspaceUrl?: string }`
    - Subject: `Payment Due Today: [Client Name] ([Amount])`
    - Content: Clear breakdown of the client, payment type, amount due, and direct CTA to review invoice and send friendly reminder.
  - Add `renderContactAutoReplyTemplate`:
    - Data: `{ senderName: string; subject: string; originalMessage: string }`
    - Subject: `We received your message — Our team will contact you within 48 hours | CrestFlow`
    - Content: Courteous acknowledgment confirming receipt, guaranteeing a human response within 48 business hours, and quoting a summary of their inquiry.
  - Update `wrapEmailHtml` and footer text to consistently reinforce `support.crestflow@gmail.com`.
  - Maintain strict `GEMINI.md` adherence: zero emojis, restrained color palette (`#F8FAFC`, `#FFFFFF`, `#E2E8F0`, `#0F172A`, `#4F46E5`).

### Task 2: Sender & Reply-To Unification (`worker/resend.ts`)
- **File**: `worker/resend.ts`
- **Actions**:
  - Configure default `fromEmail` to `CrestFlow <support.crestflow@gmail.com>` (or environment-configured domain email with sender display `CrestFlow Support`) and hardcode fallback `reply_to: 'support.crestflow@gmail.com'`.
  - Verify every outbound dispatch sets `reply_to: 'support.crestflow@gmail.com'`.

### Task 3: Worker Notification Endpoints & Dual Dispatch (`worker/routes/notifications.ts` & `worker/index.ts`)
- **Files**: `worker/routes/notifications.ts`, `worker/index.ts`
- **Actions**:
  - Update `handleNotifyContact`:
    - On valid submission, dispatch **two** email jobs:
      1. Internal notification to `support.crestflow@gmail.com` with sender details and inquiry payload.
      2. Instant auto-reply to `senderEmail` using `renderContactAutoReplyTemplate` confirming response within 48 hours.
  - Add `handleNotifyPaymentDueToday`:
    - Validate Firebase auth token.
    - Parse `{ clientId, clientName, amountDue, paymentBasis, invoiceId }`.
    - Check rate-limit & idempotency key: `due_today_${verifiedUser.uid}_${clientId}_${currentDateStr}` to prevent spamming the user multiple times on the same date.
    - Enqueue and dispatch `payment_due_today` email to `verifiedUser.email`.
  - Mount route `POST /api/notify/payment-due-today` in `worker/index.ts`.
  - Ensure `worker/routes/notifications.ts` remains modular and adheres to the max 300 lines limit (split helper functions if needed).

### Task 4: Client-Side Automated Triggers (`src/hooks/`)
- **Files**: `src/hooks/useAnniversaryCheck.ts`, `src/hooks/usePaymentDueNotifier.ts`, `src/App.tsx`
- **Actions**:
  - In `src/hooks/useAnniversaryCheck.ts`:
    - When `calculateWorkJourney` detects an active anniversary or milestone (including 100 days, 6 months, 1 year), check if an email has already been recorded for this milestone (`crestflow_milestone_email_${userId}_${milestone.id}`).
    - If not sent, trigger `POST /api/notify/milestone` with auth bearer token and milestone details, and mark locally.
  - Create `src/hooks/usePaymentDueNotifier.ts` (< 150 lines):
    - Observes `clients`, `invoices`, and `workItems`.
    - Evaluates `getPaymentStatusInfo(client, invoices, workItems)` for each active client.
    - If `status.code === 'DUE_TODAY'`, checks `localStorage.getItem(`crestflow_due_notified_${clientId}_${todayStr}`)`.
    - If not notified today, fires `POST /api/notify/payment-due-today` and sets the timestamp key.
  - Mount `usePaymentDueNotifier` in `src/App.tsx`.

### Task 5: Comprehensive Automated Testing Suite (`tests/email-system.test.ts`)
- **Files**: `tests/email-system.test.ts`
- **Actions**:
  - Add unit and integration tests covering:
    1. Welcome greeting email schema: Subject contains *"Congrats You've Started Your Journey"*, zero emojis, correct links.
    2. Milestone celebrations: Dispatches correctly for 100 days worked, 6 months, and 1 year.
    3. Payment due today endpoint: Accepts payload, verifies user auth, enforces daily idempotency, and dispatches itemized email.
    4. Contact Us dual-dispatch: Submitting contact form triggers both support forwarding AND the 48-hour auto-reply to sender.
    5. Support email consistency: Validates that all headers and footers reference `support.crestflow@gmail.com`.
  - Run full test suite (`npm test`) and production build (`npm run build`).

---

## 3. Design & Quality Constraints

1. **Brand & Email Design (`GEMINI.md`)**:
   - Palette: Pure white `#FFFFFF` cards, `#F8FAFC` background, `#E2E8F0` border, `#0F172A` text, `#475569` muted text, `#4F46E5` primary button.
   - Zero emojis or multicolor glyphs anywhere in subjects or email body text.
   - Status indicators: Plain text styling with semantic colors.
2. **Modularity & File Limits (`AGENTS.md`)**:
   - All files must strictly remain under 300 lines max.
   - Separate hooks (`usePaymentDueNotifier.ts`) from visual components.
3. **Idempotency & Anti-Spam**:
   - Welcome email: Exactly 1 per user account (`welcome_${uid}`).
   - Milestone emails: Exactly 1 per milestone reached (`milestone_${uid}_${milestoneId}`).
   - Due today alerts: Exactly 1 per client per calendar day (`due_today_${uid}_${clientId}_${YYYY-MM-DD}`).
   - Contact form auto-reply: Rate-limited to 5 per minute per IP to prevent email bombing.

---

## 4. Verification Plan & Acceptance Criteria

| Criteria | Verification Procedure | Pass Threshold |
| :--- | :--- | :--- |
| **Welcome Email** | Inspect template & trigger `POST /api/notify/welcome`. | Subject includes "Congrats You've Started Your Journey", sent to user email, 0 emojis. |
| **Milestone Celebration** | Trigger `POST /api/notify/milestone` with 100 days, 6 months, 1 year. | Correct celebratory milestone email dispatched with duration stats; duplicate requests suppressed. |
| **Payment Due Today** | Trigger `POST /api/notify/payment-due-today` for client due today. | Freelancer receives email with client name, due date, and pending amount; re-trigger on same day is ignored. |
| **Contact Us Auto-Reply** | Submit `POST /api/notify/contact` with test inquiry. | Support receives inquiry email AND submitter receives instant auto-reply with 48h SLA notice. |
| **Support Email Channel** | Verify `reply_to` and template footers across all templates. | 100% of emails use `support.crestflow@gmail.com`. |
| **Quality & Tests** | Run `npm test` and `npm run build`. | All unit/integration tests pass (90+ tests) with zero errors. |

