import { Env, EntitlementStatus } from '../types';
import { parseServiceAccount, isEventProcessed, markEventProcessed } from '../firestore';
import { verifyRazorpayWebhookSignature, fetchRazorpaySubscription } from '../razorpay';
import { getEntitlementFromFirestore, writeEntitlement } from '../entitlements';
import { resolvePaidPlanKey, SERVER_PLAN_CATALOG, GRACE_DURATION_DAYS } from '../../src/shared/pricing';
import { jsonResponse } from './subscription';
import { sendPaymentChargedReceipt } from '../emailDispatcher';
import { sendWelcomeEmailForUser } from './notifications';
import { handleOrderWebhook } from './webhookOrderHandler';

/**
 * Handles POST /api/razorpay-webhook
 * 1. Verifies HMAC-SHA256 signature on RAW body (constant-time)
 * 2. Deduplicates by eventId in `webhook_events`
 * 3. Guards out-of-order events with `lastEventTimestamp`
 * 4. Updates `entitlements/{uid}` for active, grace (3 days), cancelAtPeriodEnd, and expired
 */
export async function handleRazorpayWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  const isValid = await verifyRazorpayWebhookSignature(
    rawBody,
    signature,
    env.RAZORPAY_WEBHOOK_SECRET
  );

  if (!isValid) {
    return jsonResponse({ error: 'Invalid webhook signature' }, 400, request, env);
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400, request, env);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const eventType: string = eventPayload.event || '';
  const eventId = eventPayload.event_id || `${eventType}_${eventPayload.created_at || Date.now()}`;

  if (await isEventProcessed(creds, eventId)) {
    return jsonResponse({ status: 'ok', duplicate: true }, 200, request, env);
  }

  const nowMs = Date.now();
  const eventCreatedAtMs = eventPayload.created_at ? eventPayload.created_at * 1000 : nowMs;
  const payloadData = eventPayload.payload || {};

  const subId: string | null =
    payloadData.subscription?.entity?.id ||
    payloadData.payment?.entity?.subscription_id ||
    null;

  if (!subId) {
    const orderRes = await handleOrderWebhook(eventPayload, env, creds, eventCreatedAtMs, request);
    await markEventProcessed(creds, eventId, { eventType, status: 'processed' }).catch(() => { });
    return orderRes;
  }

  let rzpSub: any;
  try {
    rzpSub = await fetchRazorpaySubscription(env, subId);
  } catch (err: any) {
    console.error(`[Webhook] Failed to fetch subscription ${subId}:`, err?.message);
    return jsonResponse({ error: 'Failed to re-fetch subscription' }, 500, request, env);
  }

  const userId: string | undefined = rzpSub.notes?.uid || rzpSub.notes?.userId;
  if (!userId) {
    await markEventProcessed(creds, eventId, { eventType, status: 'ignored' }).catch(() => { });
    return jsonResponse({ status: 'ignored', reason: 'missing notes.uid' }, 200, request, env);
  }

  const existing = await getEntitlementFromFirestore(creds, userId);
  if (existing?.lastEventTimestamp && eventCreatedAtMs < existing.lastEventTimestamp) {
    await markEventProcessed(creds, eventId, { eventType, status: 'ignored_out_of_order', userId }).catch(() => { });
    return jsonResponse({ status: 'ok', ignored: 'out-of-order event' }, 200, request, env);
  }

  const paidKey = resolvePaidPlanKey(rzpSub.notes?.planKey || existing?.billingCycle) || 'monthly';
  const planSpec = SERVER_PLAN_CATALOG[paidKey];
  const rzpStatus: string = rzpSub.status || '';
  const paymentEntity = payloadData.payment?.entity || {};
  const refundEntity = payloadData.refund?.entity || {};

  const currentPeriodStartMs = rzpSub.current_start ? rzpSub.current_start * 1000 : nowMs;
  const currentPeriodEndMs = rzpSub.current_end
    ? rzpSub.current_end * 1000
    : nowMs + planSpec.durationDays * 86400 * 1000;

  let newStatus: EntitlementStatus = 'active';
  let validUntilIso = new Date(currentPeriodEndMs).toISOString();
  let graceUntilIso: string | null = existing?.graceUntil || null;
  let cancelAtPeriodEnd = Boolean(existing?.cancelAtPeriodEnd);

  if (eventType === 'refund.processed') {
    const refundAmount = refundEntity.amount || 0;
    const paymentAmount = paymentEntity.amount || 0;
    const amountRefunded = paymentEntity.amount_refunded || refundAmount;
    const isFullRefund = paymentAmount > 0 ? amountRefunded >= paymentAmount : paymentEntity.status === 'refunded';

    if (!isFullRefund) {
      await markEventProcessed(creds, eventId, { eventType, status: 'partial_refund', userId }).catch(() => { });
      return jsonResponse({ status: 'ok', partial_refund: true }, 200, request, env);
    }

    newStatus = 'expired';
    validUntilIso = new Date(nowMs - 1000).toISOString();
    graceUntilIso = null;
    cancelAtPeriodEnd = false;
  } else if (eventType === 'subscription.authenticated') {
    // Only mark active when subscription is already paid/active; no card-based trial grant
    await markEventProcessed(creds, eventId, { eventType, status: 'authenticated_ack', userId }).catch(() => { });
    return jsonResponse({ status: 'ok', acknowledged: true }, 200, request, env);
  } else if (
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    eventType === 'payment.captured' ||
    rzpStatus === 'active'
  ) {
    newStatus = 'active';
    validUntilIso = new Date(currentPeriodEndMs).toISOString();
    graceUntilIso = null;
    cancelAtPeriodEnd = false;

    const userEmail = rzpSub.notes?.userEmail || paymentEntity.email || existing?.userEmail;
    if (eventType === 'subscription.charged' && userEmail) {
      const planAmt = paymentEntity.amount ? `₹${(paymentEntity.amount / 100).toFixed(0)}` : `₹${planSpec.priceInr}`;
      await sendPaymentChargedReceipt(env, creds, {
        userId,
        userEmail,
        planName: `Pro ${paidKey.charAt(0).toUpperCase() + paidKey.slice(1)}`,
        amountFormatted: planAmt,
        periodStartMs: currentPeriodStartMs,
        periodEndMs: currentPeriodEndMs,
        subId,
        eventId,
      }).catch((err) => console.warn('[Webhook] Receipt email error:', err));
    }
    const userName = rzpSub.notes?.userName || existing?.userName;
    if (userEmail && !existing?.welcomeEmailSent) {
      sendWelcomeEmailForUser(env, creds, userId, userEmail, userName, false).catch(() => { });
    }
  } else if (
    eventType === 'subscription.pending' ||
    eventType === 'payment.failed' ||
    rzpStatus === 'pending'
  ) {
    // 3-day grace window set ONCE on first renewal failure; retries never extend graceUntil
    newStatus = 'grace';
    if (!graceUntilIso) {
      const existingEndMs = existing?.validUntil ? new Date(existing.validUntil).getTime() : 0;
      const baseEndMs = Math.max(currentPeriodEndMs, existingEndMs, nowMs);
      graceUntilIso = new Date(baseEndMs + GRACE_DURATION_DAYS * 86400 * 1000).toISOString();
    }
    validUntilIso = graceUntilIso;
  } else if (eventType === 'subscription.cancelled' || rzpStatus === 'cancelled') {
    cancelAtPeriodEnd = true;
    const retainedEndMs = currentPeriodEndMs;
    validUntilIso = new Date(retainedEndMs).toISOString();
    newStatus = retainedEndMs > nowMs ? 'active' : 'expired';
  } else if (
    eventType === 'subscription.halted' ||
    eventType === 'subscription.completed' ||
    rzpStatus === 'halted' ||
    rzpStatus === 'completed'
  ) {
    newStatus = 'expired';
    validUntilIso = new Date(nowMs - 1000).toISOString();
    graceUntilIso = null;
  }

  await writeEntitlement(creds, userId, {
    userId,
    userEmail: rzpSub.notes?.userEmail || paymentEntity.email || existing?.userEmail,
    userName: rzpSub.notes?.userName || existing?.userName,
    status: newStatus,
    plan: existing?.plan === 'lifetime' ? 'lifetime' : planSpec.planCode,
    billingCycle: existing?.plan === 'lifetime' ? 'lifetime' : paidKey,
    validUntil: existing?.plan === 'lifetime' ? existing.validUntil : validUntilIso,
    graceUntil: graceUntilIso,
    trialUsed: Boolean(existing?.trialUsed),
    cancelAtPeriodEnd,
    checkoutMode: 'subscription',
    razorpayCustomerId: rzpSub.customer_id || existing?.razorpayCustomerId || null,
    razorpaySubscriptionId: subId,
    razorpayPaymentId: paymentEntity.id || existing?.razorpayPaymentId || null,
    lastPaymentAmount: paymentEntity.amount ? paymentEntity.amount / 100 : existing?.lastPaymentAmount,
    lastPaymentMethod: paymentEntity.method || existing?.lastPaymentMethod,
    lastPaymentVpa: paymentEntity.vpa || existing?.lastPaymentVpa || null,
    lastPaymentAt: paymentEntity.id ? nowMs : existing?.lastPaymentAt,
    lastEventTimestamp: eventCreatedAtMs,
    updatedAt: new Date(nowMs).toISOString(),
  });

  await markEventProcessed(creds, eventId, { eventType, status: 'processed', userId }).catch(() => { });

  return jsonResponse(
    {
      status: 'ok',
      event: eventType,
      entitlementStatus: newStatus,
      validUntil: validUntilIso,
    },
    200,
    request,
    env
  );
}
