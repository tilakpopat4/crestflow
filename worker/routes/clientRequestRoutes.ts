/**
 * CrestFlow Client Lead Request Notification Route
 * Alerts the freelancer when a prospective client submits an onboarding intake form.
 */

import { Env } from '../types';
import { parseServiceAccount, getGoogleAccessToken } from '../firestore';
import { enqueueEmailJob } from '../emailQueue';
import { dispatchEmailJob } from '../emailDispatcher';
import { SupportedEventType } from '../emailTemplates';
import { jsonResponse } from './subscription';
import { EMAIL_REGEX } from './emailSchedule';

/**
 * POST /api/notify/new-client-request
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
