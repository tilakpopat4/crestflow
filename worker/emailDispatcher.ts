/**
 * CrestFlow Email Dispatcher
 * Bridges the Firestore email queue with the Resend delivery provider.
 */

import { Env, ServiceAccountCredentials } from './types';
import { parseServiceAccount } from './firestore';
import { renderEmailTemplate } from './emailTemplates';
import {
  EmailJob,
  claimDueEmailJobs,
  completeEmailJob,
  failEmailJob,
} from './emailQueue';
import { sendResendEmail } from './resend';

/**
 * Dispatches an individual email job with idempotency and state transitions.
 */
export async function dispatchEmailJob(
  env: Env,
  creds: ServiceAccountCredentials,
  job: EmailJob
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // 1. Render template with schema validation
    const rendered = renderEmailTemplate(job.eventType, job.templateData);

    // 2. Dispatch via Resend with stable Idempotency-Key
    const res = await sendResendEmail(env, {
      to: job.recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: job.idempotencyKey,
      replyTo: 'support.crestflow@gmail.com',
    });

    if (res.success && res.id) {
      await completeEmailJob(creds, job.jobId, res.id);
      return { success: true, id: res.id };
    }

    // 3. Classify error for retryability
    // 429 = Rate limit, 5xx / 599 = Server / Network error -> Retryable
    // 400, 422, 401 = Malformed, Unverified domain, Auth error -> Non-retryable
    const status = res.statusCode || 500;
    const isRetryable = status === 429 || status >= 500;
    const errorCode = `RESEND_${status}: ${res.error || 'Unknown error'}`;

    await failEmailJob(creds, job, errorCode, isRetryable);
    return { success: false, error: errorCode };
  } catch (err: any) {
    console.error(`[Dispatcher Error] Job ${job.jobId} failed:`, err);
    await failEmailJob(creds, job, `SYSTEM_ERROR: ${err.message}`, true);
    return { success: false, error: err.message };
  }
}

/**
 * Processes a bounded batch of due jobs from the queue.
 */
export async function processDueEmailJobs(
  env: Env,
  batchSize = 10
): Promise<{ claimed: number; sent: number; failed: number }> {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn('[Dispatcher] FIREBASE_SERVICE_ACCOUNT is missing. Skipping email queue processing.');
    return { claimed: 0, sent: 0, failed: 0 };
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const jobs = await claimDueEmailJobs(creds, batchSize);

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    const res = await dispatchEmailJob(env, creds, job);
    if (res.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { claimed: jobs.length, sent, failed };
}

/**
 * Sends a monthly payment cycle receipt for recurring subscription charges.
 */
export async function sendPaymentChargedReceipt(
  env: Env,
  creds: ServiceAccountCredentials,
  params: {
    userId: string;
    userEmail: string;
    userName?: string;
    planName: string;
    amountFormatted: string;
    periodStartMs: number;
    periodEndMs: number;
    subId: string;
    eventId: string;
  }
): Promise<void> {
  const pStart = new Date(params.periodStartMs).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const pEnd = new Date(params.periodEndMs).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  const job: EmailJob = {
    jobId: `pay_${params.eventId}`,
    eventType: 'payment_charged',
    recipient: params.userEmail,
    templateId: 'payment_charged',
    templateData: {
      name: params.userName,
      planName: params.planName,
      amountFormatted: params.amountFormatted,
      periodStart: pStart,
      periodEnd: pEnd,
      nextBillingDate: pEnd,
      invoiceId: params.subId,
    },
    status: 'queued',
    scheduledAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: Date.now(),
    idempotencyKey: `pay_${params.eventId}`,
    createdBy: params.userId,
  };

  await dispatchEmailJob(env, creds, job);
}

