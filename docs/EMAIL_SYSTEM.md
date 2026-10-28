# CrestFlow Automated Email System Documentation

## 1. System Architecture & Data Flow

CrestFlow uses a serverless, decoupled email architecture built for high deliverability, security, and idempotency across Cloudflare Workers, Firebase Cloud Firestore, and Resend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND CLIENTS                               │
│  - Contact Page (/contact)                                                  │
│  - Freelancer Public Portfolio (/profile, /?freelancerId=:id)               │
│  - Workspace Initialization (/dashboard, /profile)                          │
└───────────────┬─────────────────────────────┬───────────────────────────────┘
                │                             │
                ▼                             ▼
   POST /api/notify/contact         POST /api/notify/new-client-request
   POST /api/notify/welcome         POST /api/email/schedule
                │                             │
                └───────────────┬─────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE WORKER EMAIL ENGINE                          │
│                                                                             │
│  1. Input Validation & IP Rate Limiting (worker/routes/notifications.ts)    │
│  2. Firebase ID Token Verification (worker/auth.ts)                         │
│  3. Idempotency Check (emailIdempotency collection in Firestore)            │
│  4. Job Enqueueing / Scheduling (emailJobs collection in Firestore)         │
│  5. Atomic Leasing & Claim Engine (leaseExpiresAt recovery)                 │
│  6. Template Registry & Strict Escaping (worker/emailTemplates.ts)          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
┌──────────────────────────────┐  ┌───────────────────────────────────────────┐
│     FIRESTORE REST API       │  │                RESEND API                 │
│  - emailJobs (Job Queue)     │  │  - Transactional REST Endpoint            │
│  - emailIdempotency (TTL)    │  │  - Stable 'Idempotency-Key' Header        │
│  - Atomic Lease Updates      │  │  - Reply-To: support.crestflow@gmail.com  │
│  - Retry Backoff & Jitter    │  │  - Error Status Classification            │
└──────────────────────────────┘  └───────────────────────────────────────────┘
               ▲
               │ Polling & Lease Recovery
┌──────────────┴──────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE CRON TRIGGER (0 0 * * *)                      │
│  - Reconciles recurring subscriptions & grace periods                       │
│  - Dispatches due jobs from emailJobs in bounded batches (10/batch)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Event-Triggered Email Workflows

| Event Type | Trigger | Recipient | Action & Template |
| :--- | :--- | :--- | :--- |
| `contact_submission` | `POST /api/notify/contact` (Contact Form) | `support.crestflow@gmail.com` | Renders sanitized sender name, email, subject, and pre-formatted message. Rate limited to 5 requests/min per IP. |
| `welcome_freelancer` | `POST /api/notify/welcome` (First sign-in) | Freelancer's Google email | Warm onboarding greeting guiding through UPI QR setup, client onboarding portfolio, and first project logging. Idempotent per UID. |
| `payment_charged` | Razorpay webhook `subscription.charged` | Freelancer's Google email | Official payment receipt displaying plan name, amount (e.g. ₹49), coverage period, next renewal date, and transaction ID. |
| `work_milestone` | `POST /api/notify/milestone` / Cron | Freelancer's Google email | Milestone celebration (30 days, 60 days, 100 days, 180 days, 240 days streak, 1 year) celebrating career dedication with personalized stats. |
| `new_client_request` | `POST /api/notify/new-client-request` | Freelancer's verified email | Immediate lead notification containing prospective client name, contact person, phone, email, Instagram, proposed rate, and project details. |
| `scheduled_reminder` | `POST /api/email/schedule` | Specified recipient | Scheduled announcement or reminder with optional action CTA button. |

---

## 3. Scheduled Email Engine & Reliability Guarantees

### Atomic Leases & Worker Crash Recovery
1. When scheduled or queued, an email is written to `emailJobs` with `status: 'scheduled'` or `'queued'` and `scheduledAt` timestamp in UTC ms.
2. During cron processing or queue triggers, `claimDueEmailJobs` queries jobs where `nextAttemptAt <= now` using a bounded batch size (10 jobs).
3. The worker acquires an atomic 5-minute lease (`leaseExpiresAt = now + 300000ms`, `status = 'processing'`).
4. If a worker crashes midway, the job's lease expires. Subsequent worker executions detect `status == 'processing'` with `leaseExpiresAt < now` and automatically recover the job.

### Exponential Backoff with Jitter
- **Transient Failures (HTTP 429, 5xx, network timeouts)**: Job transitions to `'retry_pending'`, incrementing `attemptCount`. Next attempt is scheduled using exponential backoff with random jitter:
  $$\text{backoffMs} = \min(3600000, 2^{\text{attempts}} \times 1000 + \text{random}(0, 1000))$$
- **Permanent Failures (HTTP 400, 422 unverified domain, invalid email syntax)**: Job immediately transitions to terminal `'failed'` status to avoid spamming the provider.

---

## 4. Firestore Data Model & Indexes

### Collection: `emailJobs`
```typescript
interface EmailJob {
  jobId: string;                     // e.g. "job_1729938400000_abc123"
  eventType: SupportedEventType;     // "welcome_freelancer", "contact_submission", etc.
  recipient: string;                 // Lowercase trimmed email
  templateId: string;                // Identifier matching template
  templateData: Record<string, any>; // Strictly sanitized variables
  status: 'queued' | 'scheduled' | 'processing' | 'sent' | 'retry_pending' | 'failed' | 'cancelled';
  scheduledAt: number;               // UTC timestamp (ms)
  createdAt: number;                 // UTC timestamp (ms)
  updatedAt: number;                 // UTC timestamp (ms)
  attemptCount: number;              // Current delivery attempt
  maxAttempts: number;               // Maximum allowed attempts (default 3)
  nextAttemptAt: number;             // Timestamp for next scheduled attempt
  claimedAt?: number;                // Timestamp when lease acquired
  leaseExpiresAt?: number;           // Lease deadline for crash recovery
  lastErrorCode?: string;            // Sanitized error summary
  providerMessageId?: string;        // Resend email ID (e.g. "re_123456")
  idempotencyKey: string;            // Stable deduplication key
  createdBy?: string;                // User UID who initiated job
  sentAt?: number;                   // Completion timestamp
  cancelledAt?: number;              // Cancellation timestamp
}
```

### Collection: `emailIdempotency`
```typescript
interface EmailIdempotency {
  jobId: string;     // References emailJobs document
  createdAt: number; // Registration timestamp
}
```

### Required Firestore Composite Indexes
Most queries filter by single field `nextAttemptAt <= now` which uses standard automatic single-field indexes. If executing compound queries across `status` + `nextAttemptAt`, deploy the following composite index in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "emailJobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "nextAttemptAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 5. Security & Deliverability Controls

1. **No Arbitrary HTML or Recipients**: The frontend never chooses email bodies or arbitrary recipients for public endpoints. All templates are server-governed in `worker/emailTemplates.ts`.
2. **HTML Escaping**: All dynamic variables are strictly escaped using `escapeHtml()` to prevent template and script injection.
3. **GEMINI.md Compliance**: Zero emojis or cartoon badges in subject lines or email bodies. Clean system fonts, `#0F172A` text, `#475569` body, and `#4F46E5` primary button.
4. **Resend Idempotency-Key Header**: Resend receives `'Idempotency-Key': job.idempotencyKey` so network retries cannot cause multiple messages in the recipient's inbox.
5. **Support Routing & Reply-To**: All emails declare `reply_to: 'support.crestflow@gmail.com'`.

---

## 6. Secret Configuration & Cloudflare Deployment

### Required Cloudflare Worker Secrets
Run the following commands using `wrangler`:

```bash
# 1. Resend API Key (from resend.com dashboard)
npx wrangler secret put RESEND_API_KEY

# 2. Resend Sender Email (default: CrestFlow <billing@crestflow.com> or onboarding testing sender)
npx wrangler secret put RESEND_FROM_EMAIL

# 3. Cron & Queue Secret (strong random string for authenticating cron triggers)
npx wrangler secret put CRON_SECRET

# 4. Firebase Service Account JSON (single-line JSON credentials)
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

### Deploying the Worker & Static Assets
```bash
# Build Vite SPA and deploy Cloudflare Worker
npm run deploy
```

---

## 7. Custom Domain & Resend Sending Limitations

### Current Limitation: Cloudflare-Assigned Subdomain
Because the website is hosted on a Cloudflare-assigned subdomain (`*.workers.dev` or `*.pages.dev`) rather than a custom domain, standard DNS records (DKIM, SPF, DMARC) cannot be directly assigned to that subdomain.

### Recommended Path:
1. **Testing & Development**: Use the default Resend onboarding sandbox sender (`onboarding@resend.dev`) configured to deliver to your verified account email address.
2. **Production Launch**:
   - Register or attach your custom domain (e.g. `crestflow.app` or `crestflow.com`) in your Resend Dashboard under **Domains**.
   - Add the 3 DKIM CNAME records, 1 SPF TXT record, and 1 DMARC TXT record in your DNS provider.
   - Once verified, set `RESEND_FROM_EMAIL="CrestFlow <notifications@yourdomain.com>"` via `wrangler secret put RESEND_FROM_EMAIL`.
