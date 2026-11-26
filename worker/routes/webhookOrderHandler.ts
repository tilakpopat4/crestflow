import { Env } from '../types';
import { ServiceAccountCredentials } from '../firestore';
import { getEntitlementFromFirestore, isEntitledRecord, writeEntitlement } from '../entitlements';
import { resolvePaidPlanKey, SERVER_PLAN_CATALOG } from '../../src/shared/pricing';
import { jsonResponse } from './subscription';
import { sendPaymentChargedReceipt } from '../emailDispatcher';
import { sendWelcomeEmailForUser } from './notifications';

/**
 * Handles Razorpay Order Webhooks (fallback checkout when recurring subscriptions aren't used).
 * Handles idempotency and out-of-order / webhook-before-verify arrivals safely on `entitlements/{uid}`.
 */
export async function handleOrderWebhook(
  eventPayload: any,
  env: Env,
  creds: ServiceAccountCredentials,
  eventCreatedAtMs: number,
  request?: Request
): Promise<Response> {
  const eventType: string = eventPayload.event || '';
  const payloadData = eventPayload.payload || {};
  const orderEntity = payloadData.order?.entity;
  const paymentEntity = payloadData.payment?.entity;

  const orderId: string | null = orderEntity?.id || paymentEntity?.order_id || null;
  const paymentId: string | null = paymentEntity?.id || null;

  const userId: string | null =
    orderEntity?.notes?.uid ||
    orderEntity?.notes?.userId ||
    paymentEntity?.notes?.uid ||
    paymentEntity?.notes?.userId ||
    null;

  if (!userId) {
    return jsonResponse({ status: 'ok', ignored: 'no userId in order notes' }, 200, request, env);
  }

  const nowMs = Date.now();
  const existing = await getEntitlementFromFirestore(creds, userId);
  if (existing?.lastEventTimestamp && eventCreatedAtMs < existing.lastEventTimestamp) {
    return jsonResponse({ status: 'ok', ignored: 'out-of-order event' }, 200, request, env);
  }

  if (eventType === 'payment.failed') {
    return jsonResponse({ status: 'ok', event: 'payment.failed', userId }, 200, request, env);
  }

  const isPaidOrCaptured =
    eventType === 'order.paid' ||
    eventType === 'payment.captured' ||
    eventType === 'payment.authorized' ||
    paymentEntity?.status === 'captured';

  if (!isPaidOrCaptured) {
    return jsonResponse({ status: 'ok', ignored: `unhandled order event: ${eventType}` }, 200, request, env);
  }

  const paidKey =
    resolvePaidPlanKey(
      orderEntity?.notes?.planKey || paymentEntity?.notes?.planKey || existing?.billingCycle
    ) || 'monthly';
  const planSpec = SERVER_PLAN_CATALOG[paidKey];

  // Reject underpaid events (and zero ₹1 trial fallback)
  if (typeof paymentEntity?.amount === 'number' && paymentEntity.amount < planSpec.amountPaise) {
    return jsonResponse({ status: 'ignored', reason: 'amount below plan minimum' }, 200, request, env);
  }

  // Idempotent protection if /api/verify-payment already activated this exact paymentId
  const alreadyVerifiedSamePayment =
    Boolean(paymentId && existing?.razorpayPaymentId === paymentId) &&
    existing?.status === 'active' &&
    isEntitledRecord(existing, nowMs);

  const validUntilMs = alreadyVerifiedSamePayment && existing?.validUntil
    ? new Date(existing.validUntil).getTime()
    : nowMs + planSpec.durationDays * 86400 * 1000;
  const validUntilIso = new Date(validUntilMs).toISOString();

  const paymentAmount = paymentEntity?.amount ? paymentEntity.amount / 100 : planSpec.priceInr;
  const paymentMethod = paymentEntity?.method || (paymentEntity?.vpa ? 'upi' : 'card');
  const paymentVpa = paymentEntity?.vpa || null;

  await writeEntitlement(creds, userId, {
    userId,
    status: 'active',
    plan: existing?.plan === 'lifetime' ? 'lifetime' : planSpec.planCode,
    billingCycle: existing?.plan === 'lifetime' ? 'lifetime' : paidKey,
    validUntil: existing?.plan === 'lifetime' ? existing.validUntil : validUntilIso,
    graceUntil: null,
    trialUsed: Boolean(existing?.trialUsed),
    cancelAtPeriodEnd: false,
    checkoutMode: 'order',
    razorpayOrderId: orderId || existing?.razorpayOrderId || null,
    razorpayPaymentId: paymentId || existing?.razorpayPaymentId || null,
    lastPaymentAmount: paymentAmount,
    lastPaymentMethod: paymentMethod,
    lastPaymentVpa: paymentVpa,
    lastPaymentAt: nowMs,
    lastEventTimestamp: eventCreatedAtMs,
    notifiedExpired: false,
    updatedAt: new Date(nowMs).toISOString(),
  });

  const userEmail = orderEntity?.notes?.userEmail || paymentEntity?.email || existing?.userEmail;
  const userName = orderEntity?.notes?.userName || paymentEntity?.notes?.userName || existing?.userName;

  if (userEmail && !alreadyVerifiedSamePayment) {
    const planLabel =
      paidKey === 'yearly' ? 'Pro Yearly' : paidKey === 'quarterly' ? 'Pro Quarterly' : 'Pro Monthly';
    sendPaymentChargedReceipt(env, creds, {
      userId,
      userEmail,
      userName,
      planName: planLabel,
      amountFormatted: `₹${paymentAmount.toLocaleString('en-IN')}`,
      periodStartMs: nowMs,
      periodEndMs: validUntilMs,
      subId: orderId || paymentId || 'order_payment',
      eventId: eventPayload.event_id || `order_evt_${nowMs}`,
    }).catch((err) => console.warn('[webhookOrderHandler] Receipt error:', err));

    if (!existing?.welcomeEmailSent) {
      sendWelcomeEmailForUser(env, creds, userId, userEmail, userName, false)
        .then(() => writeEntitlement(creds, userId, { welcomeEmailSent: true }).catch(() => {}))
        .catch(() => {});
    }
  }

  return jsonResponse(
    {
      status: 'ok',
      event: eventType,
      entitlementStatus: 'active',
      plan: planSpec.planCode,
      validUntil: validUntilIso,
      userId,
    },
    200,
    request,
    env
  );
}
