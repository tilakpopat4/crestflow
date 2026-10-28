import { Env } from '../types';
import { parseServiceAccount, getSubscriptionFromFirestore, updateSubscriptionInFirestore, isEventProcessed, markEventProcessed } from '../firestore';
import { verifyRazorpayWebhookSignature, fetchRazorpaySubscription, cancelRazorpaySubscription, refundRazorpayPayment } from '../razorpay';
import { normalizeGoogleEmail, normalizeUpiVpa, hashIdentifier, markTrialLedgerUsed } from '../trialLedger';
import { jsonResponse } from './subscription';
import { sendPaymentChargedReceipt } from '../emailDispatcher';

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

  const userEmail = rzpSub.notes?.userEmail || payloadData.payment?.entity?.email || existing?.userEmail;

  // 6. Trial Ledger Confirmation & Anti-Abuse Checks (VPA & Email)
  const isPaymentCaptured =
    eventType === 'payment.captured' ||
    payloadData.payment?.entity?.status === 'captured';

  const isPaymentConfirmation =
    eventType === 'subscription.authenticated' ||
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    isPaymentCaptured;

  if (isPaymentConfirmation) {
    // 6a. Check & Confirm Email Hash in trial_ledger
    let emailAbused = false;
    if (userEmail) {
      const emailHash = await hashIdentifier(normalizeGoogleEmail(userEmail), env.TRIAL_LEDGER_PEPPER);
      const emailCheck = await markTrialLedgerUsed(creds, emailHash, 'email', userId, subId);
      if (emailCheck.alreadyUsedByOther) {
        emailAbused = true;
      }
    }

    // 6b. Check & Confirm UPI VPA in trial_ledger
    const upiVpa = payloadData.payment?.entity?.vpa;
    let vpaAbused = false;
    if (upiVpa) {
      const vpaHash = await hashIdentifier(normalizeUpiVpa(upiVpa), env.TRIAL_LEDGER_PEPPER);
      const vpaCheck = await markTrialLedgerUsed(creds, vpaHash, 'vpa', userId, subId);
      if (vpaCheck.alreadyUsedByOther) {
        vpaAbused = true;
      }
    }

    // If duplicate email or duplicate UPI VPA detected, revoke immediately, cancel, and refund
    if (emailAbused || vpaAbused) {
      const reason = emailAbused
        ? 'Google email already claimed for another free trial.'
        : 'UPI VPA already used for another free trial.';
      console.warn(`[Trial Abuse] ${reason} Cancelling & refunding.`);

      await cancelRazorpaySubscription(env, subId, false).catch(console.error);

      const paymentId = payloadData.payment?.entity?.id;
      if (paymentId) {
        await refundRazorpayPayment(env, paymentId, 100).catch(console.error);
      }

      await updateSubscriptionInFirestore(creds, userId, {
        userId,
        status: 'expired',
        plan: 'free',
        accessUntil: new Date(nowMs - 1000).toISOString(),
        trialEndsAt: null,
        cancelAtPeriodEnd: true,
        lastEventTimestamp: eventCreatedAtMs,
        updatedAt: nowMs,
      });

      return jsonResponse(
        {
          status: 'abused',
          action: 'cancelled_and_refunded',
          reason,
        },
        200
      );
    }
  }

  // 7. State Machine & accessUntil Calculation per docs/BILLING_SPEC.md
  const rzpStatus: string = rzpSub.status || '';

  let newStatus: 'pending' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'halted' | 'expired' = 'active';
  let accessUntilIso: string = new Date(nowMs + 30 * 86400 * 1000).toISOString();
  let trialEndsAtIso: string | null = null;
  let cancelAtPeriodEnd = false;

  const currentPeriodStartMs = rzpSub.current_start ? rzpSub.current_start * 1000 : nowMs;
  const currentPeriodEndMs = rzpSub.current_end ? rzpSub.current_end * 1000 : nowMs + 30 * 86400 * 1000;

  if (eventType === 'refund.processed') {
    // 4. refund.processed handling:
    // Do not end membership for ₹1 trial fee refunds unless abuse refund.
    // End access only when renewal/plan payment is fully refunded. Partial refunds just log.
    const refundEntity = payloadData.refund?.entity || {};
    const paymentEntity = payloadData.payment?.entity || {};
    const refundAmount = refundEntity.amount || 0;
    const paymentAmount = paymentEntity.amount || 0;

    const isTrialFee = refundAmount === 100 || paymentAmount === 100;
    const notesReason = String(refundEntity.notes?.reason || paymentEntity.notes?.reason || '');
    const isAbuseRefund = notesReason.toLowerCase().includes('abuse');

    if (isTrialFee && !isAbuseRefund) {
      console.log(`[Webhook] ₹1 trial fee refund processed for user ${userId}. Membership unaffected.`);
      return jsonResponse({ status: 'ok', ignored: 'trial_fee_refund_non_abuse' }, 200);
    }

    if (!isTrialFee) {
      const amountRefunded = paymentEntity.amount_refunded || refundAmount;
      const isFullRefund = paymentAmount > 0 ? amountRefunded >= paymentAmount : paymentEntity.status === 'refunded';

      if (!isFullRefund) {
        console.log(`[Webhook] Partial refund of ₹${(refundAmount / 100).toFixed(2)} processed for user ${userId}. Membership unaffected.`);
        return jsonResponse({ status: 'ok', partial_refund: true, amount: refundAmount }, 200);
      }
    }

    // Full renewal refund or abuse refund: immediately expire access
    newStatus = 'expired';
    accessUntilIso = new Date(nowMs - 1000).toISOString();
  } else if (eventType === 'subscription.authenticated' || rzpStatus === 'authenticated') {
    // Grant "trialing" only after the ₹1 addon payment is confirmed captured
    if (isPaymentCaptured || (rzpSub.paid_count && rzpSub.paid_count > 0)) {
      newStatus = 'trialing';
      // trialEndsAt must equal the subscription's start_at
      const startAtSec = rzpSub.start_at || rzpSub.current_start;
      trialEndsAtIso = startAtSec
        ? new Date(startAtSec * 1000).toISOString()
        : new Date(nowMs + 7 * 86400 * 1000).toISOString();
      accessUntilIso = trialEndsAtIso;
    } else {
      newStatus = 'pending';
      accessUntilIso = new Date(nowMs - 1000).toISOString();
    }
  } else if (
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    eventType === 'payment.captured' ||
    rzpStatus === 'active'
  ) {
    newStatus = 'active';
    accessUntilIso = new Date(currentPeriodEndMs).toISOString();

    if (eventType === 'subscription.charged' && userEmail) {
      const planAmt = payloadData.payment?.entity?.amount ? `₹${(payloadData.payment.entity.amount / 100).toFixed(0)}` : '₹49';
      sendPaymentChargedReceipt(env, creds, {
        userId,
        userEmail,
        planName: 'Pro',
        amountFormatted: planAmt,
        periodStartMs: currentPeriodStartMs || nowMs,
        periodEndMs: currentPeriodEndMs,
        subId,
        eventId,
      }).catch((err) => console.warn('[Webhook] Payment receipt error:', err));
    }
  } else if (
    eventType === 'subscription.pending' ||
    eventType === 'payment.failed' ||
    rzpStatus === 'pending'
  ) {
    // Grace period: set graceUntil ONCE (periodEnd + 3 days) upon first failure. Later retries do not extend it.
    newStatus = 'past_due';
    let graceUntilIso = existing?.graceUntil;
    if (!graceUntilIso) {
      const baseEndMs = currentPeriodEndMs > 0 ? currentPeriodEndMs : nowMs;
      graceUntilIso = new Date(baseEndMs + 3 * 24 * 60 * 60 * 1000).toISOString();
    }
    accessUntilIso = graceUntilIso;
  } else if (eventType === 'subscription.cancelled' || rzpStatus === 'cancelled') {
    // Cancelled: User retains access until current period end
    newStatus = 'cancelled';
    cancelAtPeriodEnd = true;
    accessUntilIso = new Date(currentPeriodEndMs).toISOString();
  } else if (
    eventType === 'subscription.halted' ||
    eventType === 'subscription.completed' ||
    rzpStatus === 'halted' ||
    rzpStatus === 'completed'
  ) {
    // Halted/Completed -> Immediately Expired
    newStatus = 'expired';
    accessUntilIso = new Date(nowMs - 1000).toISOString();
  }

  // 8. Write to Firestore `subscriptions/{userId}`
  await updateSubscriptionInFirestore(creds, userId, {
    userId,
    status: newStatus,
    plan: newStatus === 'expired' ? 'free' : 'pro',
    currentPeriodStart: currentPeriodStartMs,
    currentPeriodEnd: currentPeriodEndMs,
    accessUntil: accessUntilIso,
    trialEndsAt: trialEndsAtIso,
    graceUntil:
      newStatus === 'past_due'
        ? (existing?.graceUntil || accessUntilIso)
        : newStatus === 'active'
        ? null
        : (existing?.graceUntil || null),
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
