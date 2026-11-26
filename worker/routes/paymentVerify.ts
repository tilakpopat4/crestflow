import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount } from '../firestore';
import {
  getEntitlementFromFirestore,
  isEntitledRecord,
  writeEntitlement,
} from '../entitlements';
import {
  verifyRazorpayCheckoutSignature,
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
} from '../razorpay';
import { resolvePaidPlanKey, SERVER_PLAN_CATALOG } from '../../src/shared/pricing';
import { sendPaymentChargedReceipt } from '../emailDispatcher';
import { sendWelcomeEmailForUser } from './notifications';
import { jsonResponse, getBearerToken } from './subscription';

/**
 * Handles POST /api/verify-payment
 * - Requires mandatory HMAC-SHA256 signature verification (Orders OR Subscriptions).
 * - Confirms payment status + minimum plan amount directly from Razorpay REST API.
 * - Writes `entitlements/{uid}` idempotently (safe if webhook arrives before or after verify).
 */
export async function handleVerifyPayment(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401, request, env);
  }

  let creds;
  let verifiedUser;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
    verifiedUser = await verifyFirebaseIdToken(idToken, projectId);
  } catch {
    return jsonResponse({ error: 'Authentication failed' }, 401, request, env);
  }

  const body = (await request.json().catch(() => ({}))) as any;
  const paymentId = body.razorpay_payment_id || body.paymentId;
  const orderId = body.razorpay_order_id || body.orderId;
  const subscriptionId = body.razorpay_subscription_id || body.subscriptionId;
  const signature = body.razorpay_signature || body.signature;

  if (!paymentId || !signature || (!orderId && !subscriptionId)) {
    return jsonResponse(
      { error: 'Missing required payment verification fields.' },
      400,
      request,
      env
    );
  }

  const isValidSignature = await verifyRazorpayCheckoutSignature({
    orderId,
    subscriptionId,
    paymentId,
    signature,
    secret: env.RAZORPAY_KEY_SECRET,
  });

  if (!isValidSignature) {
    return jsonResponse({ error: 'Payment signature verification failed.' }, 400, request, env);
  }

  let payData: any;
  try {
    payData = await fetchRazorpayPayment(env, paymentId);
  } catch (err: any) {
    console.warn('[verify-payment] Razorpay payment lookup failed:', err?.message);
    return jsonResponse({ error: 'Unable to confirm payment with gateway.' }, 400, request, env);
  }

  if (payData.status !== 'captured' && payData.status !== 'authorized') {
    return jsonResponse(
      { error: `Payment not completed (${payData.status || 'unknown'}).` },
      400,
      request,
      env
    );
  }

  const paymentUid = payData.notes?.uid || payData.notes?.userId;
  if (paymentUid && paymentUid !== verifiedUser.uid) {
    return jsonResponse({ error: 'Payment ownership mismatch.' }, 403, request, env);
  }

  const existing = await getEntitlementFromFirestore(creds, verifiedUser.uid).catch(() => null);
  const nowMs = Date.now();

  // Idempotent return if webhook already activated this exact paymentId
  if (
    existing?.razorpayPaymentId === paymentId &&
    existing.status === 'active' &&
    isEntitledRecord(existing, nowMs)
  ) {
    return jsonResponse(
      {
        status: 'ok',
        success: true,
        idempotent: true,
        entitlementStatus: existing.status,
        plan: existing.plan,
        validUntil: existing.validUntil,
        paymentId,
        orderId,
        subscriptionId,
      },
      200,
      request,
      env
    );
  }

  const resolvedKey =
    resolvePaidPlanKey(payData.notes?.planKey || body.planKey || existing?.billingCycle) || 'monthly';
  const planSpec = SERVER_PLAN_CATALOG[resolvedKey];

  if (typeof payData.amount === 'number' && payData.amount < planSpec.amountPaise) {
    return jsonResponse(
      { error: 'Verified payment amount does not match selected plan.' },
      400,
      request,
      env
    );
  }

  let validUntilMs = nowMs + planSpec.durationDays * 86400 * 1000;
  let rzpCustomerId = payData.customer_id || existing?.razorpayCustomerId || null;
  if (subscriptionId) {
    try {
      const rzpSub = await fetchRazorpaySubscription(env, subscriptionId);
      if (rzpSub.notes?.uid && rzpSub.notes.uid !== verifiedUser.uid) {
        return jsonResponse({ error: 'Subscription ownership mismatch.' }, 403, request, env);
      }
      if (rzpSub.current_end && rzpSub.current_end * 1000 > nowMs) {
        validUntilMs = rzpSub.current_end * 1000;
      }
      rzpCustomerId = rzpSub.customer_id || rzpCustomerId;
    } catch {}
  }

  const validUntilIso = new Date(validUntilMs).toISOString();
  const paymentAmount = payData.amount ? payData.amount / 100 : planSpec.priceInr;
  const paymentMethod = payData.method || (payData.vpa ? 'upi' : 'card');
  const paymentVpa = payData.vpa || null;
  const checkoutMode = subscriptionId ? 'subscription' : 'order';

  await writeEntitlement(creds, verifiedUser.uid, {
    userId: verifiedUser.uid,
    userEmail: verifiedUser.email,
    userName: verifiedUser.name,
    status: 'active',
    plan: planSpec.planCode,
    billingCycle: resolvedKey,
    validUntil: validUntilIso,
    graceUntil: null,
    trialUsed: Boolean(existing?.trialUsed),
    cancelAtPeriodEnd: false,
    checkoutMode,
    razorpayCustomerId: rzpCustomerId,
    razorpaySubscriptionId: subscriptionId || existing?.razorpaySubscriptionId || null,
    razorpayOrderId: orderId || payData.order_id || existing?.razorpayOrderId || null,
    razorpayPaymentId: paymentId,
    lastPaymentAmount: paymentAmount,
    lastPaymentMethod: paymentMethod,
    lastPaymentVpa: paymentVpa,
    lastPaymentAt: nowMs,
    notifiedExpired: false,
    notifiedChargeFailed: false,
    updatedAt: new Date(nowMs).toISOString(),
  });

  if (verifiedUser.email) {
    const planLabel =
      resolvedKey === 'yearly' ? 'Pro Yearly' : resolvedKey === 'quarterly' ? 'Pro Quarterly' : 'Pro Monthly';
    sendPaymentChargedReceipt(env, creds, {
      userId: verifiedUser.uid,
      userEmail: verifiedUser.email,
      userName: verifiedUser.name,
      planName: planLabel,
      amountFormatted: `₹${paymentAmount.toLocaleString('en-IN')}`,
      periodStartMs: nowMs,
      periodEndMs: validUntilMs,
      subId: subscriptionId || orderId || paymentId,
      eventId: `pay_${paymentId}`,
    }).catch((err) => console.warn('[verify-payment] Receipt email warning:', err));

    if (!existing?.welcomeEmailSent) {
      sendWelcomeEmailForUser(env, creds, verifiedUser.uid, verifiedUser.email, verifiedUser.name, false)
        .then(() => writeEntitlement(creds, verifiedUser.uid, { welcomeEmailSent: true }).catch(() => {}))
        .catch(() => {});
    }
  }

  return jsonResponse(
    {
      status: 'ok',
      success: true,
      entitlementStatus: 'active',
      plan: planSpec.planCode,
      billingCycle: resolvedKey,
      checkoutMode,
      validUntil: validUntilIso,
      paymentId,
      orderId,
      subscriptionId,
    },
    200,
    request,
    env
  );
}
