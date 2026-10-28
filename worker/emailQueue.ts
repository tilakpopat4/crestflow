/**
 * CrestFlow Server-Side Firestore Email Queue & Idempotency Engine
 * Supports atomic leasing, exponential backoff with jitter, and deduplication.
 */

import { ServiceAccountCredentials } from './types';
import {
  getGoogleAccessToken,
  toFirestoreValue,
  fromFirestoreValue,
} from './firestore';
import { SupportedEventType } from './emailTemplates';

export type EmailJobStatus =
  | 'queued'
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'retry_pending'
  | 'failed'
  | 'cancelled';

export interface EmailJob {
  jobId: string;
  eventType: SupportedEventType;
  recipient: string;
  templateId: string;
  templateData: Record<string, any>;
  status: EmailJobStatus;
  scheduledAt: number;
  createdAt: number;
  updatedAt: number;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: number;
  claimedAt?: number;
  leaseExpiresAt?: number;
  lastErrorCode?: string;
  providerMessageId?: string;
  idempotencyKey: string;
  createdBy?: string;
  sentAt?: number;
  cancelledAt?: number;
}

const DEFAULT_LEASE_MS = 5 * 60 * 1000; // 5 minute worker lease
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Checks if an idempotency key was already registered.
 */
export async function checkIdempotency(
  creds: ServiceAccountCredentials,
  idempotencyKey: string
): Promise<string | null> {
  const token = await getGoogleAccessToken(creds);
  const cleanKey = encodeURIComponent(idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '_'));
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailIdempotency/${cleanKey}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 200) {
    const data = (await res.json()) as { fields?: Record<string, any> };
    return data.fields?.jobId?.stringValue || 'existing';
  }
  return null;
}

/**
 * Registers an idempotency key associated with a job ID.
 */
export async function registerIdempotency(
  creds: ServiceAccountCredentials,
  idempotencyKey: string,
  jobId: string
): Promise<void> {
  const token = await getGoogleAccessToken(creds);
  const cleanKey = encodeURIComponent(idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '_'));
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailIdempotency/${cleanKey}`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        jobId: toFirestoreValue(jobId),
        createdAt: toFirestoreValue(Date.now()),
      },
    }),
  });
}

/**
 * Enqueues or schedules an email job idempotently in Firestore.
 */
export async function enqueueEmailJob(
  creds: ServiceAccountCredentials,
  params: {
    eventType: SupportedEventType;
    recipient: string;
    templateData: Record<string, any>;
    idempotencyKey: string;
    scheduledAt?: number;
    maxAttempts?: number;
    createdBy?: string;
  }
): Promise<{ jobId: string; duplicate: boolean }> {
  // 1. Check idempotency
  const existingJobId = await checkIdempotency(creds, params.idempotencyKey);
  if (existingJobId) {
    return { jobId: existingJobId, duplicate: true };
  }

  const now = Date.now();
  const scheduledTime = params.scheduledAt && params.scheduledAt > now ? params.scheduledAt : now;
  const isFutureScheduled = scheduledTime > now;
  const jobId = `job_${now}_${Math.random().toString(36).substring(2, 8)}`;

  const job: EmailJob = {
    jobId,
    eventType: params.eventType,
    recipient: params.recipient.toLowerCase().trim(),
    templateId: params.eventType,
    templateData: params.templateData,
    status: isFutureScheduled ? 'scheduled' : 'queued',
    scheduledAt: scheduledTime,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    maxAttempts: params.maxAttempts || DEFAULT_MAX_ATTEMPTS,
    nextAttemptAt: scheduledTime,
    idempotencyKey: params.idempotencyKey,
    createdBy: params.createdBy,
  };

  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs/${jobId}`;

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(job)) {
    fields[k] = toFirestoreValue(v);
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to enqueue email job: ${res.status} ${errorText}`);
  }

  // 2. Register idempotency key
  await registerIdempotency(creds, params.idempotencyKey, jobId);

  return { jobId, duplicate: false };
}

/**
 * Claims due email jobs using bounded batches and atomic leases.
 */
export async function claimDueEmailJobs(
  creds: ServiceAccountCredentials,
  limit = 10,
  leaseMs = DEFAULT_LEASE_MS
): Promise<EmailJob[]> {
  const token = await getGoogleAccessToken(creds);
  const now = Date.now();

  // Run structured query against emailJobs collection
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents:runQuery`;
  const structuredQuery = {
    structuredQuery: {
      from: [{ collectionId: 'emailJobs' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'nextAttemptAt' },
          op: 'LESS_THAN_OR_EQUAL',
          value: toFirestoreValue(now),
        },
      },
      limit,
    },
  };

  const queryRes = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(structuredQuery),
  });

  if (!queryRes.ok) {
    console.warn('[Queue] runQuery failed:', await queryRes.text());
    return [];
  }

  const queryResults = (await queryRes.json()) as Array<{ document?: { name: string; fields?: Record<string, any> } }>;
  const claimedJobs: EmailJob[] = [];

  for (const row of queryResults) {
    if (!row.document?.fields) continue;

    const rawJob: Record<string, any> = {};
    for (const [k, v] of Object.entries(row.document.fields)) {
      rawJob[k] = fromFirestoreValue(v);
    }
    const job = rawJob as EmailJob;

    // Check if eligible: queued, scheduled, retry_pending, or expired lease
    const isPending = ['queued', 'scheduled', 'retry_pending'].includes(job.status);
    const isLeaseExpired = job.status === 'processing' && (job.leaseExpiresAt || 0) < now;

    if (!isPending && !isLeaseExpired) continue;

    // Atomically claim the job
    const leaseExpiresAt = now + leaseMs;
    const newAttemptCount = (job.attemptCount || 0) + 1;
    const patchUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs/${job.jobId}?updateMask.fieldPaths=status&updateMask.fieldPaths=claimedAt&updateMask.fieldPaths=leaseExpiresAt&updateMask.fieldPaths=attemptCount&updateMask.fieldPaths=updatedAt`;

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          status: toFirestoreValue('processing'),
          claimedAt: toFirestoreValue(now),
          leaseExpiresAt: toFirestoreValue(leaseExpiresAt),
          attemptCount: toFirestoreValue(newAttemptCount),
          updatedAt: toFirestoreValue(now),
        },
      }),
    });

    if (patchRes.ok) {
      claimedJobs.push({
        ...job,
        status: 'processing',
        claimedAt: now,
        leaseExpiresAt,
        attemptCount: newAttemptCount,
      });
    }
  }

  return claimedJobs;
}

/**
 * Transitions a job to 'sent' upon successful delivery.
 */
export async function completeEmailJob(
  creds: ServiceAccountCredentials,
  jobId: string,
  providerMessageId: string
): Promise<void> {
  const token = await getGoogleAccessToken(creds);
  const now = Date.now();
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs/${jobId}?updateMask.fieldPaths=status&updateMask.fieldPaths=sentAt&updateMask.fieldPaths=providerMessageId&updateMask.fieldPaths=updatedAt`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: toFirestoreValue('sent'),
        sentAt: toFirestoreValue(now),
        providerMessageId: toFirestoreValue(providerMessageId),
        updatedAt: toFirestoreValue(now),
      },
    }),
  });
}

/**
 * Transitions a job to 'retry_pending' or terminal 'failed' with exponential backoff and jitter.
 */
export async function failEmailJob(
  creds: ServiceAccountCredentials,
  job: EmailJob,
  errorCode: string,
  isRetryable: boolean
): Promise<void> {
  const token = await getGoogleAccessToken(creds);
  const now = Date.now();
  const willRetry = isRetryable && job.attemptCount < job.maxAttempts;

  // Exponential backoff: 2^attempts * 1000ms + random jitter up to 1000ms, capped at 1 hour
  const backoffMs = willRetry
    ? Math.min(3600000, Math.pow(2, job.attemptCount) * 1000 + Math.floor(Math.random() * 1000))
    : 0;

  const newStatus: EmailJobStatus = willRetry ? 'retry_pending' : 'failed';
  const nextAttempt = willRetry ? now + backoffMs : now;

  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs/${job.jobId}?updateMask.fieldPaths=status&updateMask.fieldPaths=lastErrorCode&updateMask.fieldPaths=nextAttemptAt&updateMask.fieldPaths=updatedAt`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: toFirestoreValue(newStatus),
        lastErrorCode: toFirestoreValue(errorCode),
        nextAttemptAt: toFirestoreValue(nextAttempt),
        updatedAt: toFirestoreValue(now),
      },
    }),
  });
}

/**
 * Cancels a scheduled or queued job.
 */
export async function cancelEmailJob(
  creds: ServiceAccountCredentials,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getGoogleAccessToken(creds);
  const now = Date.now();
  const docUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs/${jobId}`;

  const getRes = await fetch(docUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!getRes.ok) {
    return { success: false, error: 'Job not found' };
  }

  const doc = (await getRes.json()) as { fields?: Record<string, any> };
  const currentStatus = doc.fields?.status?.stringValue;

  if (currentStatus === 'sent') {
    return { success: false, error: 'Cannot cancel a job that has already been sent' };
  }
  if (currentStatus === 'cancelled') {
    return { success: true };
  }

  const patchUrl = `${docUrl}?updateMask.fieldPaths=status&updateMask.fieldPaths=cancelledAt&updateMask.fieldPaths=updatedAt`;
  await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: toFirestoreValue('cancelled'),
        cancelledAt: toFirestoreValue(now),
        updatedAt: toFirestoreValue(now),
      },
    }),
  });

  return { success: true };
}
