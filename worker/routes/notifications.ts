/**
 * CrestFlow Notification and Email Scheduling Controller
 * Strict input validation, layered rate limiting, and authenticated scheduling.
 */

import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount, getGoogleAccessToken, fromFirestoreValue } from '../firestore';
import { enqueueEmailJob, cancelEmailJob } from '../emailQueue';
import { dispatchEmailJob, processDueEmailJobs } from '../emailDispatcher';
import { SupportedEventType } from '../emailTemplates';
import { jsonResponse, getBearerToken } from './subscription';
import { constantTimeCompare } from '../razorpay';

// In-memory rate-limiter: Max requests per windowMs
const rateLimits = new Map<string, number[]>();

export function checkRateLimit(key: string, maxRequests = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = (rateLimits.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  rateLimits.set(key, timestamps);
  return true;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * 1. POST /api/notify/contact
 * Public contact form endpoint with IP rate limiting and schema validation.
 */
export async function handleNotifyContact(request: Request, env: Env): Promise<Response> {
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown_ip';
  if (!checkRateLimit(`contact_${clientIp}`, 5, 60000)) {
    return jsonResponse({ error: 'Too many requests. Please try again shortly.' }, 429);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const { senderName, senderEmail, subject, message } = body || {};
  if (!senderName || typeof senderName !== 'string' || senderName.trim().length === 0 || senderName.length > 100) {
    return jsonResponse({ error: 'Valid sender name is required (max 100 characters)' }, 400);
  }
  if (!senderEmail || typeof senderEmail !== 'string' || !EMAIL_REGEX.test(senderEmail.trim()) || senderEmail.length > 254) {
    return jsonResponse({ error: 'Valid sender email address is required' }, 400);
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0 || subject.length > 200) {
    return jsonResponse({ error: 'Valid subject is required (max 200 characters)' }, 400);
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 3000) {
    return jsonResponse({ error: 'Valid message is required (max 3000 characters)' }, 400);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const targetRecipient = 'support.crestflow@gmail.com';
  const idempotencyKey = `contact_${senderEmail.trim().toLowerCase()}_${Date.now()}`;

  const { jobId, duplicate } = await enqueueEmailJob(creds, {
    eventType: 'contact_submission',
    recipient: targetRecipient,
    templateData: {
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      subject: subject.trim(),
      message: message.trim(),
    },
    idempotencyKey,
  });

  // Attempt instant dispatch
  const claimedJob = {
    jobId,
    eventType: 'contact_submission' as SupportedEventType,
    recipient: targetRecipient,
    templateId: 'contact_submission',
    templateData: {
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      subject: subject.trim(),
      message: message.trim(),
    },
    status: 'queued' as const,
    scheduledAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: Date.now(),
    idempotencyKey,
  };

  const dispatchResult = await dispatchEmailJob(env, creds, claimedJob);
  return jsonResponse({ success: true, jobId, duplicate, dispatched: dispatchResult.success });
}

/**
 * 2. POST /api/notify/welcome
 * Authenticated welcome email for newly registered or first-time freelancers.
 */
export async function handleNotifyWelcome(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Missing or malformed Authorization header' }, 401);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const verifiedUser = await verifyFirebaseIdToken(token, creds.project_id);
  const targetEmail = verifiedUser.email;

  if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
    return jsonResponse({ error: 'User does not have a valid email address' }, 400);
  }

  const idempotencyKey = `welcome_${verifiedUser.uid}`;
  const { jobId, duplicate } = await enqueueEmailJob(creds, {
    eventType: 'welcome_freelancer',
    recipient: targetEmail,
    templateData: {
      name: verifiedUser.name || undefined,
      workspaceUrl: `${env.BASE_URL || 'https://crestflow.app'}/profile`,
    },
    idempotencyKey,
    createdBy: verifiedUser.uid,
  });

  if (duplicate) {
    return jsonResponse({ success: true, jobId, already_sent: true });
  }

  const job = {
    jobId,
    eventType: 'welcome_freelancer' as SupportedEventType,
    recipient: targetEmail,
    templateId: 'welcome_freelancer',
    templateData: {
      name: verifiedUser.name || undefined,
      workspaceUrl: `${env.BASE_URL || 'https://crestflow.app'}/profile`,
    },
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

/**
 * 3. POST /api/notify/new-client-request
 * Public onboarding intake notification triggered when a client submits the onboarding form.
 */
export async function handleNotifyNewClientRequest(request: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const { freelancerId, clientName, contactName, contactEmail, contactPhone, instagram, proposedRate, projectDetails, requestId } = body || {};

  if (!freelancerId || typeof freelancerId !== 'string') {
    return jsonResponse({ error: 'Missing freelancerId' }, 400);
  }
  if (!clientName || typeof clientName !== 'string' || clientName.trim().length === 0) {
    return jsonResponse({ error: 'Client name is required' }, 400);
  }
  if (!contactEmail || !EMAIL_REGEX.test(contactEmail.trim())) {
    return jsonResponse({ error: 'Valid contact email is required' }, 400);
  }
  if (!contactPhone || typeof contactPhone !== 'string') {
    return jsonResponse({ error: 'Contact phone is required' }, 400);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const token = await getGoogleAccessToken(creds);

  // Look up freelancer profile to find their registered email
  const profUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/profiles/${freelancerId}`;
  const profRes = await fetch(profUrl, { headers: { Authorization: `Bearer ${token}` } });

  if (!profRes.ok) {
    return jsonResponse({ error: 'Freelancer profile not found' }, 404);
  }

  const profDoc = (await profRes.json()) as { fields?: Record<string, any> };
  const freelancerEmail = profDoc.fields?.email?.stringValue;
  const freelancerName = profDoc.fields?.name?.stringValue;

  if (!freelancerEmail || !EMAIL_REGEX.test(freelancerEmail)) {
    return jsonResponse({ error: 'Freelancer does not have a verified email configured' }, 400);
  }

  const idempotencyKey = `client_req_${freelancerId}_${requestId || Date.now()}`;
  const templateData = {
    freelancerName,
    clientName: clientName.trim(),
    contactName: (contactName || '').trim(),
    contactEmail: contactEmail.trim(),
    contactPhone: contactPhone.trim(),
    instagram: (instagram || '').trim() || undefined,
    proposedRate: typeof proposedRate === 'number' ? proposedRate : undefined,
    projectDetails: (projectDetails || '').trim(),
    reviewUrl: `${env.BASE_URL || 'https://crestflow.app'}/clients`,
  };

  const { jobId, duplicate } = await enqueueEmailJob(creds, {
    eventType: 'new_client_request',
    recipient: freelancerEmail,
    templateData,
    idempotencyKey,
  });

  const job = {
    jobId,
    eventType: 'new_client_request' as SupportedEventType,
    recipient: freelancerEmail,
    templateId: 'new_client_request',
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
  return jsonResponse({ success: true, jobId, duplicate, dispatched: dispatchResult.success });
}

/**
 * 4. POST /api/notify/milestone
 * Triggers a work anniversary or days-worked milestone celebration email.
 */
export async function handleNotifyMilestone(request: Request, env: Env): Promise<Response> {
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

  const { milestoneId, milestoneTitle, daysWorked, durationFormatted } = body || {};
  if (!milestoneId || !milestoneTitle || typeof daysWorked !== 'number') {
    return jsonResponse({ error: 'Missing milestone parameters' }, 400);
  }

  const idempotencyKey = `milestone_${verifiedUser.uid}_${milestoneId}`;
  const templateData = {
    name: verifiedUser.name || undefined,
    milestoneTitle,
    daysWorked,
    durationFormatted: durationFormatted || `${daysWorked} days`,
  };

  const { jobId, duplicate } = await enqueueEmailJob(creds, {
    eventType: 'work_milestone',
    recipient: targetEmail,
    templateData,
    idempotencyKey,
    createdBy: verifiedUser.uid,
  });

  if (duplicate) {
    return jsonResponse({ success: true, jobId, already_celebrated: true });
  }

  const job = {
    jobId,
    eventType: 'work_milestone' as SupportedEventType,
    recipient: targetEmail,
    templateId: 'work_milestone',
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

/**
 * 5. POST /api/email/schedule
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
    'welcome_freelancer',
    'payment_charged',
    'work_milestone',
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
 * 6. POST /api/email/cancel
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
 * 7. POST /api/email/process-queue
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
