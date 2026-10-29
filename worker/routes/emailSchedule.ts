/**
 * CrestFlow Email Scheduling and Queue Processing Routes
 * Strictly scoped to scheduling future emails, cancellations, and protected queue processing.
 */

import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount } from '../firestore';
import { enqueueEmailJob, cancelEmailJob } from '../emailQueue';
import { processDueEmailJobs } from '../emailDispatcher';
import { SupportedEventType } from '../emailTemplates';
import { jsonResponse, getBearerToken } from './subscription';
import { constantTimeCompare } from '../razorpay';

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * 1. POST /api/email/schedule
 * Schedules an email for future delivery at a specified UTC timestamp.
 */
export async function handleScheduleEmail(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const verifiedUser = await verifyFirebaseIdToken(token, creds.project_id);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const { recipient, eventType, templateData, scheduledAt, idempotencyKey } = body || {};
  if (!recipient || !EMAIL_REGEX.test(recipient)) {
    return jsonResponse({ error: 'Valid recipient email required' }, 400);
  }

  const supportedTypes: SupportedEventType[] = [
    'contact_submission',
    'contact_auto_reply',
    'welcome_freelancer',
    'payment_charged',
    'work_milestone',
    'payment_due_today',
    'new_client_request',
    'scheduled_reminder',
  ];

  if (!supportedTypes.includes(eventType)) {
    return jsonResponse({ error: `Unsupported eventType: ${eventType}` }, 400);
  }

  const now = Date.now();
  const scheduleTime = typeof scheduledAt === 'number' ? scheduledAt : now;
  // Maximum scheduling horizon: 365 days
  if (scheduleTime > now + 365 * 24 * 60 * 60 * 1000) {
    return jsonResponse({ error: 'Scheduling horizon exceeds maximum of 365 days' }, 400);
  }

  const effectiveIdempotencyKey = idempotencyKey || `sched_${verifiedUser.uid}_${Date.now()}`;
  const { jobId, duplicate } = await enqueueEmailJob(creds, {
    eventType,
    recipient,
    templateData: templateData || {},
    idempotencyKey: effectiveIdempotencyKey,
    scheduledAt: scheduleTime,
    createdBy: verifiedUser.uid,
  });

  return jsonResponse({
    success: true,
    jobId,
    duplicate,
    scheduledAt: scheduleTime,
    status: scheduleTime > now ? 'scheduled' : 'queued',
  });
}

/**
 * 2. POST /api/email/cancel
 * Cancels a scheduled email job.
 */
export async function handleCancelEmail(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  await verifyFirebaseIdToken(token, creds.project_id);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const { jobId } = body || {};
  if (!jobId || typeof jobId !== 'string') {
    return jsonResponse({ error: 'jobId is required' }, 400);
  }

  const cancelRes = await cancelEmailJob(creds, jobId);
  if (!cancelRes.success) {
    return jsonResponse({ error: cancelRes.error || 'Failed to cancel job' }, 400);
  }

  return jsonResponse({ success: true, jobId, status: 'cancelled' });
}

/**
 * 3. POST /api/email/process-queue
 * Protected cron or administrative trigger to process due email jobs.
 */
export async function handleProcessEmailQueue(request: Request, env: Env): Promise<Response> {
  const authHeaderToken = getBearerToken(request);
  const customHeaderSecret = request.headers.get('x-cron-secret');
  const providedSecret = customHeaderSecret || authHeaderToken || '';
  const expectedSecret = env.CRON_SECRET || '';

  if (!expectedSecret || !providedSecret || !constantTimeCompare(providedSecret, expectedSecret)) {
    return jsonResponse({ error: 'Unauthorized: Invalid or missing CRON_SECRET' }, 401);
  }

  const stats = await processDueEmailJobs(env, 10);
  return jsonResponse({ success: true, stats });
}
