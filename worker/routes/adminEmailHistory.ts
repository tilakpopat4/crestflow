/**
 * Admin Email History & Retry Handlers
 * Allows authorized administrators to view the complete transactional mail history,
 * filter by status, and retry failed delivery attempts.
 */

import { Env } from '../types';
import { jsonResponse } from './subscription';
import { verifyAdminCaller } from './adminSubscriptions';
import { getGoogleAccessToken, fromFirestoreValue } from '../firestore';
import { dispatchEmailJob } from '../emailDispatcher';
import { EmailJob } from '../emailQueue';
import { renderEmailTemplate, SupportedEventType } from '../emailTemplates';

/**
 * GET /api/admin/email-history
 * Returns the most recent email jobs from Firestore, sorted newest first.
 */
export async function handleGetAdminEmailHistory(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const token = await getGoogleAccessToken(creds);

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs?pageSize=${Math.min(limit, 100)}`;
    const res = await fetch(firestoreUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      return jsonResponse({ error: `Firestore fetch error: ${res.status} ${errText}` }, 500);
    }

    const data = (await res.json()) as { documents?: Array<{ name: string; fields?: Record<string, any> }> };
    const emails = (data.documents || []).map((doc) => {
      const fields = doc.fields || {};
      const job: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        job[k] = fromFirestoreValue(v);
      }
      if (!job.jobId) {
        job.jobId = doc.name.split('/').pop() || '';
      }

      // If subject was not explicitly saved, derive from template
      if (!job.subject && job.eventType) {
        try {
          const rendered = renderEmailTemplate(job.eventType as SupportedEventType, job.templateData || {});
          job.subject = rendered.subject;
        } catch {
          job.subject = job.eventType.replace(/_/g, ' ');
        }
      }

      return job;
    });

    // Sort newest first
    emails.sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));

    return jsonResponse({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Unauthorized or server error' }, 401);
  }
}

/**
 * POST /api/admin/email-retry
 * Retries dispatching a queued or failed email job.
 */
export async function handleRetryAdminEmail(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const body = (await request.json().catch(() => ({}))) as { jobId?: string };
    if (!body.jobId) {
      return jsonResponse({ error: 'Missing jobId parameter' }, 400);
    }

    const token = await getGoogleAccessToken(creds);
    const docUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs/${body.jobId}`;
    const getRes = await fetch(docUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!getRes.ok) {
      return jsonResponse({ error: 'Email job not found' }, 404);
    }

    const doc = (await getRes.json()) as { fields?: Record<string, any> };
    const rawJob: Record<string, any> = {};
    for (const [k, v] of Object.entries(doc.fields || {})) {
      rawJob[k] = fromFirestoreValue(v);
    }
    const job = rawJob as EmailJob;

    const retryJob: EmailJob = {
      ...job,
      idempotencyKey: `${job.idempotencyKey || job.jobId}_retry_${Date.now()}`,
      status: 'queued',
      attemptCount: 0,
      nextAttemptAt: Date.now(),
      updatedAt: Date.now(),
    };

    const dispatchResult = await dispatchEmailJob(env, creds, retryJob);
    return jsonResponse({
      success: dispatchResult.success,
      id: dispatchResult.id,
      error: dispatchResult.error,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Retry failed' }, 500);
  }
}

