import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env } from '../worker/types';
import {
  MockWebhookState,
  createMockFetch,
  createMockIdToken,
} from './mockWebhookFetch';
import { renderEmailTemplate } from '../worker/emailTemplates';
import { enqueueEmailJob, claimDueEmailJobs, completeEmailJob, failEmailJob } from '../worker/emailQueue';

describe('Production-Ready Automated Email System Suite', () => {
  let originalFetch: typeof globalThis.fetch;
  let keyPair: crypto.KeyPairSyncResult<string, string>;
  let mockState: MockWebhookState;
  let testEnv: Env;

  before(() => {
    keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const pubKeyObj = crypto.createPublicKey(keyPair.privateKey);
    const jwk = pubKeyObj.export({ format: 'jwk' }) as any;

    originalFetch = globalThis.fetch;
    mockState = {
      processedEvents: new Set(),
      firestoreSubscriptions: new Map(),
      trialLedger: new Map(),
      razorpaySubscriptions: new Map(),
      refundedPayments: [],
      cancelledSubscriptions: [],
      cancellationsDetailed: [],
      sentEmails: [],
      emailJobs: new Map(),
      emailIdempotency: new Map(),
      profiles: new Map(),
      publicKeyJwk: { ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' },
    };

    globalThis.fetch = createMockFetch(mockState, originalFetch);

    testEnv = {
      ASSETS: { fetch: async () => new Response('Asset') },
      RAZORPAY_KEY_ID: 'rzp_test_key123',
      RAZORPAY_KEY_SECRET: 'rzp_test_secret123',
      RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_xyz',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: 'test-project',
        client_email: 'service-account@test-project.iam.gserviceaccount.com',
        private_key: keyPair.privateKey,
      }),
      CRON_SECRET: 'super_secret_cron_123',
      RESEND_API_KEY: 're_test_key_abc123',
      RESEND_FROM_EMAIL: 'CrestFlow <billing@crestflow.com>',
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  describe('1. Input Validation & Security Protections', () => {
    it('rejects contact submission with invalid email format', async () => {
      const res = await worker.fetch(
        new Request('https://crestflow.app/api/notify/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderName: 'Alice',
            senderEmail: 'invalid-email-address',
            subject: 'Help',
            message: 'Need help with account',
          }),
        }),
        testEnv
      );

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /valid sender email/i);
    });

    it('rejects contact submission with missing required fields', async () => {
      const res = await worker.fetch(
        new Request('https://crestflow.app/api/notify/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderName: '',
            senderEmail: 'alice@example.com',
            subject: '',
            message: '',
          }),
        }),
        testEnv
      );

      assert.equal(res.status, 400);
    });

    it('rejects oversized contact message payload (>3000 chars)', async () => {
      const largeMessage = 'A'.repeat(3050);
      const res = await worker.fetch(
        new Request('https://crestflow.app/api/notify/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderName: 'Bob',
            senderEmail: 'bob@example.com',
            subject: 'Spam test',
            message: largeMessage,
          }),
        }),
        testEnv
      );

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /max 3000 characters/i);
    });

    it('escapes HTML tags to prevent XSS and template injection', () => {
      const rendered = renderEmailTemplate('contact_submission', {
        senderName: '<script>alert("xss")</script>',
        senderEmail: 'attacker@evil.com',
        subject: '<b>Bold Title</b>',
        message: '<img src=x onerror=alert(1)>',
      });

      assert.equal(rendered.html.includes('<script>'), false);
      assert.equal(rendered.html.includes('&lt;script&gt;'), true);
      assert.equal(rendered.html.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
    });

    it('strictly satisfies GEMINI.md: zero emojis across all email templates', () => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      const templates = [
        renderEmailTemplate('welcome_freelancer', { name: 'Dev', workspaceUrl: 'https://crestflow.app' }),
        renderEmailTemplate('payment_charged', { planName: 'Pro', amountFormatted: '₹49', periodStart: 'Oct 1', periodEnd: 'Nov 1' }),
        renderEmailTemplate('work_milestone', { milestoneTitle: '30 Days Worked', daysWorked: 30, durationFormatted: '1 month' }),
        renderEmailTemplate('new_client_request', { clientName: 'Brand X', contactName: 'John', contactEmail: 'j@x.com', contactPhone: '9876543210', projectDetails: 'Reels editing' }),
        renderEmailTemplate('contact_submission', { senderName: 'User', senderEmail: 'u@test.com', subject: 'Inquiry', message: 'Hi' }),
      ];

      for (const t of templates) {
        assert.equal(emojiRegex.test(t.subject), false, `Emoji found in subject: ${t.subject}`);
        assert.equal(emojiRegex.test(t.text), false, `Emoji found in text: ${t.text}`);
        assert.equal(emojiRegex.test(t.html), false, `Emoji found in HTML: ${t.html}`);
      }
    });

    it('rejects unauthenticated requests to /api/notify/welcome', async () => {
      const res = await worker.fetch(
        new Request('https://crestflow.app/api/notify/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
        testEnv
      );

      assert.equal(res.status, 401);
    });

    it('rejects scheduling horizon exceeding 365 days', async () => {
      const token = createMockIdToken('usr_admin', 'admin@example.com', keyPair.privateKey);
      const farFuture = Date.now() + 400 * 24 * 60 * 60 * 1000;

      const res = await worker.fetch(
        new Request('https://crestflow.app/api/email/schedule', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: 'target@example.com',
            eventType: 'scheduled_reminder',
            templateData: { title: 'Far Future', message: 'Test' },
            scheduledAt: farFuture,
          }),
        }),
        testEnv
      );

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /exceeds maximum of 365 days/i);
    });
  });

  describe('2. Event-Triggered Email Workflows', () => {
    it('dispatches contact inquiry email directly to support.crestflow@gmail.com and auto-replies within 48 hours', async () => {
      const initialCount = mockState.sentEmails.length;

      const res = await worker.fetch(
        new Request('https://crestflow.app/api/notify/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'cf-connecting-ip': '1.2.3.4',
          },
          body: JSON.stringify({
            senderName: 'Sarah Connor',
            senderEmail: 'sarah@resistance.org',
            subject: 'Question about video logging',
            message: 'How do I add a new client deliverable?',
          }),
        }),
        testEnv
      );

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(mockState.sentEmails.length, initialCount + 2);

      // 1. Support team forwarding
      const supportEmail = mockState.sentEmails[initialCount];
      assert.deepEqual(supportEmail.to, ['support.crestflow@gmail.com']);
      assert.match(supportEmail.subject, /Question about video logging/);
      assert.match(supportEmail.text, /Sarah Connor/);

      // 2. Instant auto-reply to sender with 48h SLA
      const autoReply = mockState.sentEmails[initialCount + 1];
      assert.deepEqual(autoReply.to, ['sarah@resistance.org']);
      assert.match(autoReply.subject, /Our team will contact you within 48 hours/);
      assert.match(autoReply.text, /48 hours/);
    });

    it('dispatches welcome greeting email on first sign-up with "Congrats You\'ve Started Your Journey" and prevents duplicates', async () => {
      const token = createMockIdToken('user_welcome_test', 'creator@crestflow.test', keyPair.privateKey);
      const initialCount = mockState.sentEmails.length;

      // First call -> Dispatched
      const res1 = await worker.fetch(
        new Request('https://crestflow.app/api/notify/welcome', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        testEnv
      );

      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.success, true);
      assert.equal(mockState.sentEmails.length, initialCount + 1);

      const sentWelcome = mockState.sentEmails[initialCount];
      assert.match(sentWelcome.subject, /Congrats You've Started Your Journey/);

      // Second call -> Idempotent check prevents sending again
      const res2 = await worker.fetch(
        new Request('https://crestflow.app/api/notify/welcome', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        testEnv
      );

      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.already_sent, true);
      assert.equal(mockState.sentEmails.length, initialCount + 1);
    });

    it('dispatches work milestone celebration email for 100 days worked and enforces deduplication', async () => {
      const token = createMockIdToken('usr_milestone_100', 'milestone100@test.com', keyPair.privateKey);
      const initialCount = mockState.sentEmails.length;

      const res1 = await worker.fetch(
        new Request('https://crestflow.app/api/notify/milestone', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            milestoneId: '100_days',
            milestoneTitle: '100 Days Freelancing Milestone',
            daysWorked: 100,
            durationFormatted: '3 mos, 10 days',
          }),
        }),
        testEnv
      );

      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.success, true);
      assert.equal(mockState.sentEmails.length, initialCount + 1);

      const sentMilestone = mockState.sentEmails[initialCount];
      assert.deepEqual(sentMilestone.to, ['milestone100@test.com']);
      assert.match(sentMilestone.subject, /100 Days Freelancing Milestone/);
      assert.match(sentMilestone.text, /100 days worked/i);
      assert.match(sentMilestone.html, /100 active days of freelancing/i);

      // Re-trigger with same milestone -> idempotent
      const res2 = await worker.fetch(
        new Request('https://crestflow.app/api/notify/milestone', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            milestoneId: '100_days',
            milestoneTitle: '100 Days Freelancing Milestone',
            daysWorked: 100,
            durationFormatted: '3 mos, 10 days',
          }),
        }),
        testEnv
      );

      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.already_celebrated, true);
      assert.equal(mockState.sentEmails.length, initialCount + 1);
    });

    it('dispatches payment due today notification to freelancer with daily deduplication', async () => {
      const token = createMockIdToken('usr_due_freelancer', 'freelancer.due@test.com', keyPair.privateKey);
      const initialCount = mockState.sentEmails.length;

      const res1 = await worker.fetch(
        new Request('https://crestflow.app/api/notify/payment-due-today', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: 'client_roots_media',
            clientName: 'Roots & Stories Media',
            amountDueFormatted: '₹15,000',
            paymentBasis: 'Monthly Retainer',
            dueDateFormatted: '29 Oct 2026',
            invoiceId: 'CF-00008',
          }),
        }),
        testEnv
      );

      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.success, true);
      assert.equal(mockState.sentEmails.length, initialCount + 1);

      const sentDue = mockState.sentEmails[initialCount];
      assert.deepEqual(sentDue.to, ['freelancer.due@test.com']);
      assert.match(sentDue.subject, /Payment Due Today: Roots & Stories Media/);
      assert.match(sentDue.text, /₹15,000/);

      // Re-triggering for same client today -> idempotent
      const res2 = await worker.fetch(
        new Request('https://crestflow.app/api/notify/payment-due-today', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: 'client_roots_media',
            clientName: 'Roots & Stories Media',
            amountDueFormatted: '₹15,000',
            paymentBasis: 'Monthly Retainer',
            dueDateFormatted: '29 Oct 2026',
            invoiceId: 'CF-00008',
          }),
        }),
        testEnv
      );

      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.already_notified, true);
      assert.equal(mockState.sentEmails.length, initialCount + 1);
    });

    it('dispatches new client request email to freelancer with client details', async () => {
      const freelancerUid = 'fl_sarah_123';
      mockState.profiles.set(freelancerUid, {
        name: 'Sarah Connor',
        email: 'sarah.freelancer@test.com',
      });

      const initialCount = mockState.sentEmails.length;

      const res = await worker.fetch(
        new Request('https://crestflow.app/api/notify/new-client-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freelancerId: freelancerUid,
            clientName: 'Nike India',
            contactName: 'Rajesh Kumar',
            contactEmail: 'rajesh@nike.test',
            contactPhone: '9876543210',
            instagram: '@nikeindia',
            proposedRate: 3500,
            projectDetails: '10 Instagram Reels for summer campaign.',
          }),
        }),
        testEnv
      );

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(mockState.sentEmails.length, initialCount + 1);

      const sent = mockState.sentEmails[mockState.sentEmails.length - 1];
      assert.deepEqual(sent.to, ['sarah.freelancer@test.com']);
      assert.match(sent.subject, /Nike India/);
      assert.match(sent.text, /₹3500/);
      assert.match(sent.text, /Rajesh Kumar/);
    });

    it('dispatches payment receipt email upon subscription.charged webhook', async () => {
      const userId = 'user_sub_receipt_test';
      const userEmail = 'paid_user@test.com';
      const eventId = `evt_charge_${Date.now()}`;
      const subId = `sub_rzp_charge_${Date.now()}`;

      mockState.razorpaySubscriptions.set(subId, {
        id: subId,
        status: 'active',
        notes: { uid: userId, userEmail },
        current_start: Math.floor(Date.now() / 1000),
        current_end: Math.floor((Date.now() + 30 * 86400 * 1000) / 1000),
      });

      const payload = {
        event_id: eventId,
        event: 'subscription.charged',
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          subscription: { entity: { id: subId } },
          payment: { entity: { amount: 4900, email: userEmail } },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', testEnv.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const initialCount = mockState.sentEmails.length;

      const res = await worker.fetch(
        new Request('https://crestflow.app/api/razorpay-webhook', {
          method: 'POST',
          headers: {
            'x-razorpay-signature': signature,
            'Content-Type': 'application/json',
          },
          body: rawBody,
        }),
        testEnv
      );

      assert.equal(res.status, 200);
      assert.equal(mockState.sentEmails.length, initialCount + 1);

      const sent = mockState.sentEmails[mockState.sentEmails.length - 1];
      assert.deepEqual(sent.to, [userEmail]);
      assert.match(sent.subject, /Payment Confirmation/i);
      assert.match(sent.text, /₹49/);
    });
  });

  describe('3. Scheduled Email Queue, Leases & Retries', () => {
    it('schedules a reminder email and supports cancellation', async () => {
      const token = createMockIdToken('usr_scheduler', 'scheduler@test.com', keyPair.privateKey);
      const scheduledTime = Date.now() + 3600 * 1000;

      const scheduleRes = await worker.fetch(
        new Request('https://crestflow.app/api/email/schedule', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: 'client@company.com',
            eventType: 'scheduled_reminder',
            templateData: { title: 'Project Kickoff Reminder', message: 'Meeting at 10 AM.' },
            scheduledAt: scheduledTime,
          }),
        }),
        testEnv
      );

      assert.equal(scheduleRes.status, 200);
      const schedData = await scheduleRes.json();
      assert.equal(schedData.status, 'scheduled');
      assert.ok(schedData.jobId);

      // Cancel the scheduled job
      const cancelRes = await worker.fetch(
        new Request('https://crestflow.app/api/email/cancel', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId: schedData.jobId }),
        }),
        testEnv
      );

      assert.equal(cancelRes.status, 200);
      const cancelData = await cancelRes.json();
      assert.equal(cancelData.status, 'cancelled');
    });

    it('claims due jobs atomically with lease expiration recovery', async () => {
      const creds = JSON.parse(testEnv.FIREBASE_SERVICE_ACCOUNT);
      const now = Date.now();

      // Enqueue job due now
      const { jobId } = await enqueueEmailJob(creds, {
        eventType: 'work_milestone',
        recipient: 'milestone.user@test.com',
        templateData: { milestoneTitle: '1 Year Anniversary', daysWorked: 365, durationFormatted: '1 year' },
        idempotencyKey: `anniv_job_${now}`,
      });

      // Claim job
      const claimed = await claimDueEmailJobs(creds, 5, 1000); // 1 second lease
      assert.equal(claimed.length >= 1, true);
      const claimedJob = claimed.find((j) => j.jobId === jobId);
      assert.ok(claimedJob);
      assert.equal(claimedJob.status, 'processing');

      // Simulate worker crash: lease expires after 1.1s
      await new Promise((r) => setTimeout(r, 1100));

      // Re-claim should recover the job
      const recovered = await claimDueEmailJobs(creds, 5, 5000);
      const recoveredJob = recovered.find((j) => j.jobId === jobId);
      assert.ok(recoveredJob, 'Expired lease must allow job recovery by another worker');
      assert.equal(recoveredJob.attemptCount, 2);

      // Complete job
      await completeEmailJob(creds, jobId, 're_mock_msg_999');
      const completedJob = mockState.emailJobs?.get(jobId);
      assert.equal(completedJob.status, 'sent');
    });

    it('processes due queue via /api/email/process-queue protected by CRON_SECRET', async () => {
      const res = await worker.fetch(
        new Request('https://crestflow.app/api/email/process-queue', {
          method: 'POST',
          headers: {
            'x-cron-secret': testEnv.CRON_SECRET!,
          },
        }),
        testEnv
      );

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.stats);
    });
  });
});
