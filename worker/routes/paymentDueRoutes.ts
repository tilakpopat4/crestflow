/**
 * CrestFlow Client Payment Due Today Notification Route
 * Alerts the freelancer when any client's payment cycle is due today.
 */

import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount } from '../firestore';
import { enqueueEmailJob } from '../emailQueue';
import { dispatchEmailJob } from '../emailDispatcher';
import { SupportedEventType } from '../emailTemplates';
import { jsonResponse, getBearerToken } from './subscription';
import { EMAIL_REGEX } from './emailSchedule';

/**
 * POST /api/notify/payment-due-today
 * Notifies the freelancer that an active client has a payment or retainer cycle due today.
 */
export async function handleNotifyPaymentDueToday(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const verifiedUser = await verifyFirebaseIdToken(token, creds.project_id);
  const targetEmail = verifiedUser.email;
  if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
    return jsonResponse({ error: 'User email missing or invalid' }, 400);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { clientId, clientName, amountDueFormatted, paymentBasis, dueDateFormatted, invoiceId } = body || {};
  if (!clientId || !clientName || !amountDueFormatted || !dueDateFormatted) {
    return jsonResponse({ error: 'Missing required payment due parameters' }, 400);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `due_today_${verifiedUser.uid}_${clientId}_${todayStr}`;

  const templateData = {
    freelancerName: verifiedUser.name || undefined,
    clientName: String(clientName).trim(),
    amountDueFormatted: String(amountDueFormatted).trim(),
    paymentBasis: paymentBasis ? String(paymentBasis).trim() : 'Monthly Retainer',
    dueDateFormatted: String(dueDateFormatted).trim(),
    invoiceId: invoiceId ? String(invoiceId).trim() : undefined,
    workspaceUrl: `${env.BASE_URL || 'https://crestflow.app'}/invoices`,
  };

  const { jobId, duplicate } = await enqueueEmailJob(creds, {
    eventType: 'payment_due_today',
    recipient: targetEmail,
    templateData,
    idempotencyKey,
    createdBy: verifiedUser.uid,
  });

  if (duplicate) {
    return jsonResponse({ success: true, jobId, already_notified: true });
  }

  const job = {
    jobId,
    eventType: 'payment_due_today' as SupportedEventType,
    recipient: targetEmail,
    templateId: 'payment_due_today',
    templateData,
    status: 'queued' as const,
    scheduledAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: Date.now(),
    idempotencyKey,
  };

  const dispatchResult = await dispatchEmailJob(env, creds, job);
  return jsonResponse({ success: true, jobId, dispatched: dispatchResult.success });
}

