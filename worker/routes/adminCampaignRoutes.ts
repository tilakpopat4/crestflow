/**
 * Admin Campaign & Bulk Mail Routes
 * Allows authorized administrators to compose, preview, schedule, and bulk-dispatch
 * promotional announcements and campaign emails across user cohorts.
 */

import { Env } from '../types';
import { jsonResponse } from './subscription';
import { verifyAdminCaller } from './adminSubscriptions';
import { enqueueEmailJob, EmailJob } from '../emailQueue';
import { dispatchEmailJob } from '../emailDispatcher';

export interface CampaignRecipient {
  email: string;
  name?: string;
  uid?: string;
}

export interface SendCampaignPayload {
  subject: string;
  headline: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  bannerText?: string;
  footerNote?: string;
  recipients: CampaignRecipient[];
  scheduledAt?: number;
}

/**
 * POST /api/admin/send-campaign
 * Validates payload, enqueues each recipient into emailJobs, and either schedules
 * or immediately dispatches promotional emails in batches.
 */
export async function handleAdminSendCampaign(request: Request, env: Env): Promise<Response> {
  try {
    const { creds, verifiedUser } = await verifyAdminCaller(request, env);
    const body = (await request.json().catch(() => ({}))) as SendCampaignPayload;

    const subject = (body.subject || '').trim();
    const headline = (body.headline || '').trim();
    const message = (body.message || '').trim();

    if (!subject) {
      return jsonResponse({ error: 'Subject line is required' }, 400);
    }
    if (!headline) {
      return jsonResponse({ error: 'Campaign headline is required' }, 400);
    }
    if (!message) {
      return jsonResponse({ error: 'Message body is required' }, 400);
    }

    const rawRecipients = Array.isArray(body.recipients) ? body.recipients : [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set<string>();
    const validRecipients: CampaignRecipient[] = [];

    for (const r of rawRecipients) {
      const email = (r.email || '').trim().toLowerCase();
      if (email && emailRegex.test(email) && !seenEmails.has(email)) {
        seenEmails.add(email);
        validRecipients.push({
          email,
          name: (r.name || '').trim(),
          uid: r.uid,
        });
      }
    }

    if (validRecipients.length === 0) {
      return jsonResponse({ error: 'No valid recipient email addresses provided' }, 400);
    }

    // Safety limit per single bulk request
    if (validRecipients.length > 500) {
      return jsonResponse({ error: 'Maximum 500 recipients per campaign dispatch' }, 400);
    }

    const now = Date.now();
    const scheduledAt = body.scheduledAt && body.scheduledAt > now ? body.scheduledAt : undefined;
    const isScheduled = Boolean(scheduledAt && scheduledAt > now);
    const campaignId = `camp_${now}_${Math.random().toString(36).substring(2, 6)}`;

    let enqueuedCount = 0;
    let dispatchedCount = 0;
    let failedCount = 0;

    for (const rec of validRecipients) {
      try {
        const templateData = {
          name: rec.name || 'Creator',
          subject,
          headline,
          message,
          actionLabel: (body.actionLabel || '').trim() || undefined,
          actionUrl: (body.actionUrl || '').trim() || undefined,
          bannerText: (body.bannerText || '').trim() || undefined,
          footerNote: (body.footerNote || '').trim() || undefined,
        };

        const idempotencyKey = `${campaignId}_${rec.email}`;
        const { jobId } = await enqueueEmailJob(creds, {
          eventType: 'promotional_campaign',
          recipient: rec.email,
          templateData,
          scheduledAt,
          idempotencyKey,
          createdBy: verifiedUser.uid,
        });

        enqueuedCount++;

        // If not scheduled for future, dispatch immediately
        if (!isScheduled) {
          const job: EmailJob = {
            jobId,
            eventType: 'promotional_campaign',
            recipient: rec.email,
            templateId: 'promotional_campaign',
            templateData,
            status: 'queued',
            scheduledAt: now,
            createdAt: now,
            updatedAt: now,
            attemptCount: 0,
            maxAttempts: 3,
            nextAttemptAt: now,
            idempotencyKey,
            createdBy: verifiedUser.uid,
          };

          const dispatchRes = await dispatchEmailJob(env, creds, job);
          if (dispatchRes.success) {
            dispatchedCount++;
          } else {
            failedCount++;
          }
        }
      } catch (itemErr) {
        console.warn(`[Campaign] Failed processing recipient ${rec.email}:`, itemErr);
        failedCount++;
      }
    }

    return jsonResponse({
      success: true,
      campaignId,
      totalTargeted: validRecipients.length,
      enqueuedCount,
      dispatchedCount: isScheduled ? 0 : dispatchedCount,
      failedCount: isScheduled ? 0 : failedCount,
      isScheduled,
      scheduledAt: scheduledAt || null,
      message: isScheduled
        ? `Campaign successfully scheduled for ${new Date(scheduledAt!).toLocaleString('en-IN')} across ${enqueuedCount} recipients.`
        : `Dispatched campaign to ${dispatchedCount} of ${validRecipients.length} recipients.`,
    });
  } catch (err: any) {
    const msg = err?.message || 'Failed to dispatch campaign';
    if (msg.includes('Missing Authorization') || msg.includes('token')) {
      return jsonResponse({ error: msg }, 401);
    }
    if (msg.includes('Unauthorized') || msg.includes('Admin access required')) {
      return jsonResponse({ error: msg }, 403);
    }
    console.error('[Admin Campaign Error]', err);
    return jsonResponse({ error: msg }, 500);
  }
}
