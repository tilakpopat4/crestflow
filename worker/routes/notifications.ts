/**
 * CrestFlow Notification Controller
 * Input validation, IP rate limiting, authenticated triggers, and dual-dispatch auto-replies.
 */

import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount } from '../firestore';
import { enqueueEmailJob } from '../emailQueue';
import { dispatchEmailJob } from '../emailDispatcher';
import { SupportedEventType } from '../emailTemplates';
import { jsonResponse, getBearerToken } from './subscription';
import {
  handleScheduleEmail,
  handleCancelEmail,
  handleProcessEmailQueue,
  EMAIL_REGEX,
} from './emailSchedule';
import { handleNotifyPaymentDueToday } from './paymentDueRoutes';
import { handleNotifyNewClientRequest } from './clientRequestRoutes';

export {
  handleScheduleEmail,
  handleCancelEmail,
  handleProcessEmailQueue,
  handleNotifyPaymentDueToday,
  handleNotifyNewClientRequest,
  EMAIL_REGEX,
};

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

/**
 * 1. POST /api/notify/contact
 * Public contact form endpoint with IP rate limiting and instant 48-hour auto-reply.
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
  const now = Date.now();
  const idempotencyKey = `contact_${senderEmail.trim().toLowerCase()}_${now}`;

  // 1. Forward inquiry to support team
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

  const supportJob = {
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
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: now,
    idempotencyKey,
  };

  const dispatchResult = await dispatchEmailJob(env, creds, supportJob);

  // 2. Dispatch instant auto-reply to the sender (48 hours response SLA)
  const autoReplyKey = `contact_reply_${senderEmail.trim().toLowerCase()}_${now}`;
  const autoReplyTemplateData = {
    senderName: senderName.trim(),
    subject: subject.trim(),
    originalMessage: message.trim(),
  };

  const { jobId: replyJobId } = await enqueueEmailJob(creds, {
    eventType: 'contact_auto_reply',
    recipient: senderEmail.trim(),
    templateData: autoReplyTemplateData,
    idempotencyKey: autoReplyKey,
  });

  const replyJob = {
    jobId: replyJobId,
    eventType: 'contact_auto_reply' as SupportedEventType,
    recipient: senderEmail.trim(),
    templateId: 'contact_auto_reply',
    templateData: autoReplyTemplateData,
    status: 'queued' as const,
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: now,
    idempotencyKey: autoReplyKey,
  };

  await dispatchEmailJob(env, creds, replyJob);

  return jsonResponse({
    success: true,
    jobId,
    duplicate,
    dispatched: dispatchResult.success,
    autoReplied: true,
  });
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
 * 3. POST /api/notify/milestone
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
