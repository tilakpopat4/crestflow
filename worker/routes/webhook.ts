import { Env } from '../types';
import {
  parseServiceAccount,
  getSubscriptionFromFirestore,
  updateSubscriptionInFirestore,
  isEventProcessed,
  markEventProcessed,
} from '../firestore';
import {
  verifyRazorpayWebhookSignature,
  fetchRazorpaySubscription,
  cancelRazorpaySubscription,
  refundRazorpayPayment,
} from '../razorpay';
import {
  normalizeGoogleEmail,
  normalizeUpiVpa,
  hashIdentifier,
  markTrialLedgerUsed,
} from '../trialLedger';
import { jsonResponse } from './subscription';

/**
 * Handles POST /api/razorpay-webhook
 * 1. Verifies HMAC-SHA256 signature on RAW body using constant-time comparison
 * 2. Deduplicates by event ID and returns 200 fast
 * 3. Re-fetches the subscription entity directly from Razorpay
 * 4. Validates notes.uid
 * 5. Guards against out-of-order events
 * 6. Updates status and accessUntil per docs/BILLING_SPEC.md
 */
export async function handleRazorpayWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // 1. Verify X-Razorpay-Signature on RAW body (HMAC-SHA256, constant-time compare)
  const isValid = await verifyRazorpayWebhookSignature(
    rawBody,
    signature,
    env.RAZORPAY_WEBHOOK_SECRET
  );

  if (!isValid) {
    return jsonResponse({ error: 'Invalid webhook signature' }, 400);
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);

  // 2. Event Deduplication via processed_events / webhook_events
  const eventId = eventPayload.event_id || `${eventPayload.event}_${eventPayload.created_at || Date.now()}`;
  if (await isEventProcessed(creds, eventId)) {
    return jsonResponse({ status: 'ok', duplicate: true }, 200);
  }
  await markEventProcessed(creds, eventId);

  const eventType: string = eventPayload.event || '';
  const payloadData = eventPayload.payload || {};

  // Extract subscription ID from various possible event entities
  const subId: string | null =
    payloadData.subscription?.entity?.id ||
    payloadData.payment?.entity?.subscription_id ||
    null;

  if (!subId) {
    // Non-subscription related event or direct one-off payment
    return jsonResponse({ status: 'ok', ignored: 'no subscription_id in event payload' }, 200);
  }

  // 3. Re-fetch authoritative subscription from Razorpay API
  let rzpSub: any;
  try {
    rzpSub = await fetchRazorpaySubscription(env, subId);
  } catch (err: any) {
    console.error(`[Webhook] Failed to re-fetch subscription ${subId} from Razorpay:`, err);
    return jsonResponse({ error: 'Failed to re-fetch subscription from provider' }, 500);
  }

  // 4. Validate notes.uid against authoritative subscription
  const userId: string | undefined = rzpSub.notes?.uid || rzpSub.notes?.userId;
  if (!userId) {
    console.warn(`[Webhook] Subscription ${subId} has missing or empty notes.uid. Skipping.`);
    return jsonResponse({ status: 'ignored', reason: 'missing notes.uid' }, 200);
  }

  // 5. Guard against out-of-order events
  const nowMs = Date.now();
  const eventCreatedAtMs = eventPayload.created_at
    ? eventPayload.created_at * 1000
    : nowMs;

  const existing = await getSubscriptionFromFirestore(creds, userId);
  if (existing?.lastEventTimestamp && eventCreatedAtMs < existing.lastEventTimestamp) {
    console.warn(
      `[Webhook] Out-of-order event ${eventId} (${eventCreatedAtMs} < ${existing.lastEventTimestamp}). Skipping state update.`
    );
    return jsonResponse({ status: 'ok', ignored: 'out-of-order event' }, 200);
  }

  // 6. Trial Ledger Confirmation & Anti-Abuse Checks (VPA & Email)
  const isPaymentConfirmation =
    eventType === 'subscription.authenticated' ||
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    eventType === 'payment.captured';

  if (isPaymentConfirmation) {
    // 6a. Confirm Email Hash in trial_ledger
    const userEmail = rzpSub.notes?.userEmail || payloadData.payment?.entity?.email;
    if (userEmail) {
      const emailHash = await hashIdentifier(normalizeGoogleEmail(userEmail), env.TRIAL_LEDGER_PEPPER);
      await markTrialLedgerUsed(creds, emailHash, 'email', userId, subId);
    }

    // 6b. Check & Confirm UPI VPA in trial_ledger
    const upiVpa = payloadData.payment?.entity?.vpa;
    if (upiVpa) {
      const vpaHash = await hashIdentifier(normalizeUpiVpa(upiVpa), env.TRIAL_LEDGER_PEPPER);
      const vpaCheck = await markTrialLedgerUsed(creds, vpaHash, 'vpa', userId, subId);

      // If UPI VPA was already used by another account, abort, cancel, and refund
      if (vpaCheck.alreadyUsedByOther) {
        console.warn(`[Trial Abuse] VPA '${upiVpa}' already claimed by another user. Cancelling & refunding.`);

        // Cancel subscription immediately
        await cancelRazorpaySubscription(env, subId).catch(console.error);

        // Refund the ₹1 verification charge
        const paymentId = payloadData.payment?.entity?.id;
        if (paymentId) {
          await refundRazorpayPayment(env, paymentId, 100).catch(console.error);
        }

        // Expire access immediately in Firestore
        await updateSubscriptionInFirestore(creds, userId, {
          userId,
          status: 'expired',
          plan: 'free',
          accessUntil: new Date(nowMs - 1000).toISOString(),
          cancelAtPeriodEnd: true,
          lastEventTimestamp: eventCreatedAtMs,
          updatedAt: nowMs,
        });

        return jsonResponse(
          {
            status: 'abused',
            action: 'cancelled_and_refunded',
            reason: 'UPI VPA already used for another free trial.',
          },
          200
        );
      }
    }
  }

  // 7. State Machine & accessUntil Calculation per docs/BILLING_SPEC.md
  const rzpStatus: string = rzpSub.status || '';

  let newStatus: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'halted' | 'expired' = 'active';
  let accessUntilIso: string = new Date(nowMs + 30 * 86400 * 1000).toISOString();
  let trialEndsAtIso: string | null = null;
  let cancelAtPeriodEnd = false;

  const currentPeriodStartMs = rzpSub.current_start ? rzpSub.current_start * 1000 : nowMs;
  const currentPeriodEndMs = rzpSub.current_end ? rzpSub.current_end * 1000 : nowMs + 30 * 86400 * 1000;

  if (eventType === 'subscription.authenticated' || rzpStatus === 'authenticated') {
    // 14-day / 7-day evaluation trial
    newStatus = 'trialing';
    trialEndsAtIso = rzpSub.current_start
      ? new Date(rzpSub.current_start * 1000).toISOString()
      : new Date(nowMs + 7 * 86400 * 1000).toISOString();
    accessUntilIso = trialEndsAtIso;
  } else if (
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    eventType === 'payment.captured' ||
    rzpStatus === 'active'
  ) {
    newStatus = 'active';
    accessUntilIso = new Date(currentPeriodEndMs).toISOString();
  } else if (
    eventType === 'subscription.pending' ||
    eventType === 'payment.failed' ||
    rzpStatus === 'pending'
  ) {
    // 3-day grace period for failed payments / pending state
    newStatus = 'past_due';
    const gracePeriodEndMs = Math.max(currentPeriodEndMs, nowMs + 3 * 24 * 60 * 60 * 1000);
    accessUntilIso = new Date(gracePeriodEndMs).toISOString();
  } else if (eventType === 'subscription.cancelled' || rzpStatus === 'cancelled') {
    // Cancelled: User retains access until current period end
    newStatus = 'cancelled';
    cancelAtPeriodEnd = true;
    accessUntilIso = new Date(currentPeriodEndMs).toISOString();
  } else if (
    eventType === 'subscription.halted' ||
    eventType === 'subscription.completed' ||
    eventType === 'refund.processed' ||
    rzpStatus === 'halted' ||
    rzpStatus === 'completed'
  ) {
    // Halted/Completed/Refunded -> Immediately Expired
    newStatus = 'expired';
    accessUntilIso = new Date(nowMs - 1000).toISOString();
  }

  // 7. Write to Firestore `subscriptions/{userId}`
  await updateSubscriptionInFirestore(creds, userId, {
    userId,
    status: newStatus,
    plan: newStatus === 'expired' ? 'free' : 'pro',
    currentPeriodStart: currentPeriodStartMs,
    currentPeriodEnd: currentPeriodEndMs,
    accessUntil: accessUntilIso,
    trialEndsAt: trialEndsAtIso,
    hasHadSubscription: true,
    razorpaySubscriptionId: subId,
    cancelAtPeriodEnd,
    lastEventTimestamp: eventCreatedAtMs,
    updatedAt: nowMs,
  });

  return jsonResponse({
    status: 'ok',
    event: eventType,
    subscriptionStatus: newStatus,
    accessUntil: accessUntilIso,
  }, 200);
}
