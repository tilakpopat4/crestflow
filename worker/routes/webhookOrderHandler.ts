import { Env } from '../types';
import { ServiceAccountCredentials, getSubscriptionFromFirestore, updateSubscriptionInFirestore } from '../firestore';
import { jsonResponse } from './subscription';
import { sendPaymentChargedReceipt } from '../emailDispatcher';
import { sendWelcomeEmailForUser } from './notifications';

/**
 * Handles Razorpay Order Webhooks (Standard Web Checkout)
 * Processes order.paid, payment.captured, payment.authorized when subId is null.
 * Instantly provisions subscription access in Firestore and sends notifications.
 */
export async function handleOrderWebhook(
  eventPayload: any,
  env: Env,
  creds: ServiceAccountCredentials,
  eventCreatedAtMs: number
): Promise<Response> {
  const eventType: string = eventPayload.event || '';
  const payloadData = eventPayload.payload || {};
  const orderEntity = payloadData.order?.entity;
  const paymentEntity = payloadData.payment?.entity;

  const orderId: string | null = orderEntity?.id || paymentEntity?.order_id || null;
  const paymentId: string | null = paymentEntity?.id || null;

  // Extract userId from notes across order or payment entity
  const userId: string | null =
    orderEntity?.notes?.uid ||
    orderEntity?.notes?.userId ||
    paymentEntity?.notes?.uid ||
    paymentEntity?.notes?.userId ||
    null;

  if (!userId) {
    return jsonResponse({ status: 'ok', ignored: 'no userId in order/payment notes' }, 200);
  }

  const nowMs = Date.now();
  const existing = await getSubscriptionFromFirestore(creds, userId);
  if (existing?.lastEventTimestamp && eventCreatedAtMs < existing.lastEventTimestamp) {
    return jsonResponse({ status: 'ok', ignored: 'out-of-order event' }, 200);
  }

  // Handle payment failure for orders
  if (eventType === 'payment.failed') {
    return jsonResponse({ status: 'ok', event: 'payment.failed', userId }, 200);
  }

  const isPaidOrCaptured =
    eventType === 'order.paid' ||
    eventType === 'payment.captured' ||
    eventType === 'payment.authorized' ||
    paymentEntity?.status === 'captured';

  if (!isPaidOrCaptured) {
    return jsonResponse({ status: 'ok', ignored: `unhandled order event: ${eventType}` }, 200);
  }

  const planKey = (
    orderEntity?.notes?.planKey ||
    paymentEntity?.notes?.planKey ||
    existing?.billingCycle ||
    'monthly'
  ).toLowerCase();

  const isTrial = planKey === 'trial' || paymentEntity?.amount === 100;
  const days = isTrial
    ? 7
    : planKey === 'yearly'
    ? 365
    : planKey === 'half'
    ? 180
    : planKey === 'quarterly'
    ? 90
    : 30;

  const accessUntilIso = new Date(nowMs + days * 86400 * 1000).toISOString();
  const paymentAmount = paymentEntity?.amount ? paymentEntity.amount / 100 : (isTrial ? 1 : 79);
  const paymentMethod = paymentEntity?.method || (paymentEntity?.vpa ? 'upi' : 'card');
  const paymentVpa = paymentEntity?.vpa || null;
  const effectiveCycle = isTrial ? 'trial' : planKey;

  await updateSubscriptionInFirestore(creds, userId, {
    userId,
    status: isTrial ? 'trialing' : 'active',
    plan: 'pro',
    billingCycle: effectiveCycle,
    currentPeriodStart: nowMs,
    currentPeriodEnd: nowMs + days * 86400 * 1000,
    accessUntil: accessUntilIso,
    trialEndsAt: isTrial ? accessUntilIso : null,
    hasHadSubscription: true,
    hasHadTrial: isTrial ? true : (existing?.hasHadTrial || false),
    lastPaymentId: paymentId || orderId || undefined,
    lastPaymentAmount: paymentAmount,
    lastPaymentMethod: paymentMethod,
    lastPaymentVpa: paymentVpa,
    lastPaymentAt: nowMs,
    razorpaySubscriptionId: orderId || paymentId || undefined,
    cancelAtPeriodEnd: false,
    lastEventTimestamp: eventCreatedAtMs,
    updatedAt: nowMs,
  });

  const userEmail = orderEntity?.notes?.userEmail || paymentEntity?.email || existing?.userEmail;
  const userName = orderEntity?.notes?.userName || paymentEntity?.notes?.userName || existing?.userName;

  if (userEmail) {
    const planName = isTrial ? 'Pro 7-Day Trial' : (effectiveCycle === 'yearly' ? 'Pro Yearly' : 'Pro Monthly');
    const amountStr = `₹${paymentAmount.toLocaleString('en-IN')}`;
    sendPaymentChargedReceipt(env, creds, {
      userId,
      userEmail,
      userName,
      planName,
      amountFormatted: amountStr,
      periodStartMs: nowMs,
      periodEndMs: nowMs + days * 86400 * 1000,
      subId: orderId || paymentId || 'order_payment',
      eventId: eventPayload.event_id || `order_evt_${nowMs}`,
    }).catch((err) => console.warn('[webhookOrderHandler] Receipt email error:', err));

    const isFirstPayment = !existing?.hasHadSubscription || !existing?.lastPaymentAt;
    if (isFirstPayment) {
      sendWelcomeEmailForUser(env, creds, userId, userEmail, userName, true).catch(() => {});
    }
  }

  return jsonResponse({
    status: 'ok',
    event: eventType,
    subscriptionStatus: isTrial ? 'trialing' : 'active',
    accessUntil: accessUntilIso,
    userId,
  }, 200);
}
