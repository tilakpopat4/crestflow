/**
 * CrestFlow Welcome & Test Email Handlers
 * Separated to keep worker/routes/notifications.ts focused and concise.
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
 * Dispatches welcome email to a first-time subscriber or newly registered freelancer.
 * Enforces strict deduplication via idempotencyKey = welcome_${uid}.
 */
export async function sendWelcomeEmailForUser(
  env: Env,
  creds: any,
  uid: string,
  email: string,
  name?: string,
  force = false
): Promise<{ success: boolean; duplicate?: boolean }> {
  if (!email || !EMAIL_REGEX.test(email)) return { success: false };
  const idempotencyKey = force ? `welcome_${uid}_${Date.now()}` : `welcome_${uid}`;
  const workspaceUrl = `${env.BASE_URL || 'https://crestflow.app'}/profile`;
  const { jobId, duplicate } = await enqueueEmailJob(creds, {
    eventType: 'welcome_freelancer',
    recipient: email,
    templateData: { name: name || undefined, workspaceUrl },
    idempotencyKey,
    createdBy: uid,
  });

  if (duplicate && !force) return { success: true, duplicate: true };

  const now = Date.now();
  const dispatchResult = await dispatchEmailJob(env, creds, {
    jobId,
    eventType: 'welcome_freelancer' as SupportedEventType,
    recipient: email,
    templateId: 'welcome_freelancer',
    templateData: { name: name || undefined, workspaceUrl },
    status: 'queued',
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: now,
    idempotencyKey,
  });

  return { success: dispatchResult.success };
}

/**
 * POST /api/notify/welcome
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

  const res = await sendWelcomeEmailForUser(env, creds, verifiedUser.uid, targetEmail, verifiedUser.name);
  return jsonResponse({ success: true, already_sent: res.duplicate, dispatched: res.success });
}

/**
 * POST /api/notify/test-email
 * Interactive test dispatch for administrator console.
 */
export async function handleNotifyTestEmail(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const verifiedUser = await verifyFirebaseIdToken(token, creds.project_id);
  const body = (await request.json().catch(() => ({}))) as { targetEmail?: string };
  const targetEmail = body.targetEmail || verifiedUser.email || 'tilakpopat2007@gmail.com';
  const workspaceUrl = `${env.BASE_URL || 'https://crestflow.app'}/dashboard`;
  const templateData = { name: verifiedUser.name || 'Admin', workspaceUrl };

  const { jobId } = await enqueueEmailJob(creds, {
    eventType: 'welcome_freelancer',
    recipient: targetEmail,
    templateData,
    idempotencyKey: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdBy: verifiedUser.uid,
  });

  const now = Date.now();
  const res = await dispatchEmailJob(env, creds, {
    jobId,
    eventType: 'welcome_freelancer',
    recipient: targetEmail,
    templateId: 'welcome_freelancer',
    templateData,
    status: 'queued',
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    maxAttempts: 1,
    nextAttemptAt: now,
    idempotencyKey: `test_${now}`,
    createdBy: verifiedUser.uid,
  });

  return jsonResponse({
    success: res.success,
    id: res.id,
    error: res.error,
    recipient: targetEmail,
    provider: 'EmailJS',
  });
}
