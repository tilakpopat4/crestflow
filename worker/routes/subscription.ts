import { Env, PlanKey } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import {
  parseServiceAccount,
  getSubscriptionFromFirestore,
  updateSubscriptionInFirestore,
} from '../firestore';
import {
  createRazorpaySubscription,
  createRazorpayOrder,
  cancelRazorpaySubscription,
} from '../razorpay';
import {
  normalizeGoogleEmail,
  hashIdentifier,
  reserveTrialLedgerEntry,
} from '../trialLedger';

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Server-side plan map resolving plan keys to Razorpay plan IDs configured in environment variables.
 */
export function resolveServerPlanId(env: Env, planKey: string): string | null {
  const planMap: Record<PlanKey, string | undefined> = {
    trial: env.RAZORPAY_PLAN_MONTHLY,
    monthly: env.RAZORPAY_PLAN_MONTHLY,
    quarterly: env.RAZORPAY_PLAN_QUARTERLY,
    half: env.RAZORPAY_PLAN_HALF,
    yearly: env.RAZORPAY_PLAN_YEARLY,
  };

  const normalized = planKey.toLowerCase() as PlanKey;
  return planMap[normalized] || null;
}

/**
 * Handles POST /api/create-subscription
 * - Enforces one live subscription per user with an idempotency lock
 * - First-time users get start_at = now + 7d plus a ₹1 (100 paise) addon
 * - Returning users start immediately with no addon
 * - Sets notes.uid and expire_by 30 minutes
 */
export async function handleCreateSubscription(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);

  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    planKey?: string;
    isTrial?: boolean;
    isDirect?: boolean;
  };
  const requestedPlanKey = (body.planKey || body.plan || 'monthly').toLowerCase();
  const isDirect = body.isDirect === true || body.isTrial === false;
  const isTrialRequest = requestedPlanKey === 'trial' || body.isTrial === true;

  const planId = resolveServerPlanId(env, requestedPlanKey);

  // 1. Idempotency Lock & Existing Subscription Verification
  const existing = await getSubscriptionFromFirestore(creds, verifiedUser.uid);

  // Single-use 7-day trial guard: reject trial request if account has ever used a trial or subscription
  const hasAlreadyHadTrial = Boolean(
    existing &&
      (existing.hasHadTrial ||
        existing.hasHadSubscription ||
        existing.trialEndsAt ||
        existing.status === 'active' ||
        existing.status === 'trialing' ||
        existing.status === 'cancelled' ||
        existing.status === 'expired')
  );

  if (isTrialRequest && hasAlreadyHadTrial) {
    return jsonResponse(
      {
        error: 'The 7-day trial is only available once per account. Please select one of our paid plans.',
      },
      403
    );
  }

  // One live subscription per user check: reject if active or trialing
  if (existing && (existing.status === 'active' || existing.status === 'trialing')) {
    return jsonResponse(
      {
        error: 'User already has an active subscription.',
        subscriptionId: existing.razorpaySubscriptionId,
        status: existing.status,
      },
      409
    );
  }

  // Idempotency: return existing pending subscription if created within last 15 minutes
  if (
    existing &&
    existing.status === 'pending' &&
    existing.razorpaySubscriptionId &&
    Date.now() - existing.updatedAt < 15 * 60 * 1000
  ) {
    return jsonResponse({
      subscriptionId: existing.razorpaySubscriptionId,
      keyId: env.RAZORPAY_KEY_ID,
      idempotent: true,
    });
  }

  // Concurrency lock: prevent parallel requests within 10 seconds
  if (existing?.lockTimestamp && Date.now() - existing.lockTimestamp < 10000) {
    return jsonResponse(
      { error: 'Subscription creation in progress. Please wait a moment.' },
      429
    );
  }

  // Set acquisition lock
  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    lockTimestamp: Date.now(),
  });

  // 2. First-time trial user vs direct payment user
  const isReturningUser =
    existing &&
    (existing.hasHadSubscription ||
      existing.status === 'active' ||
      existing.status === 'cancelled' ||
      existing.status === 'expired');

  // isFirstTime = true causes Razorpay to delay billing by 7 days and attach a ₹1 (100 paise) addon.
  // Direct paid plans (isDirect: true) charge immediately upon checkout with isFirstTime = false.
  let isFirstTime = false;
  if (isTrialRequest) {
    isFirstTime = true;
  } else if (!isDirect && !isReturningUser) {
    // Backwards-compatible fallback for tests or legacy callers that do not specify isDirect: true
    isFirstTime = true;
  }

  // 3. Anti-abuse Trial Ledger: Reserve Google email hash if starting trial
  let emailHash = '';
  if (verifiedUser.email && isFirstTime) {
    const normalizedEmail = normalizeGoogleEmail(verifiedUser.email);
    emailHash = await hashIdentifier(normalizedEmail, env.TRIAL_LEDGER_PEPPER);

    const reservation = await reserveTrialLedgerEntry(creds, emailHash, 'email', verifiedUser.uid);
    if (!reservation.success) {
      return jsonResponse(
        {
          error: reservation.reason || 'Free trial already claimed for this Google account. Please choose a paid plan.',
        },
        403
      );
    }
  }

  // 4. Create Subscription or Order in Razorpay
  let rzpSubId = '';
  let isOrder = false;
  let orderAmount = 0;

  if (planId) {
    try {
      const rzpSub = await createRazorpaySubscription(
        env,
        planId,
        verifiedUser.uid,
        isFirstTime,
        verifiedUser.email,
        verifiedUser.name
      );
      rzpSubId = rzpSub.id;
    } catch (subErr: any) {
      console.warn('[Subscription] Recurring subscription failed, using Order:', subErr.message);
    }
  }

  // Fallback to Razorpay Order checkout (works on all Razorpay accounts out of the box)
  if (!rzpSubId) {
    const planPrices: Record<string, number> = {
      trial: 100,
      monthly: 7900,
      quarterly: 19900,
      half: 44900,
      yearly: 89900,
    };
    const amountPaise = isTrialRequest ? 100 : planPrices[requestedPlanKey] || 7900;
    const rzpOrder = await createRazorpayOrder(
      env,
      amountPaise,
      verifiedUser.uid,
      requestedPlanKey,
      verifiedUser.email,
      verifiedUser.name
    );
    rzpSubId = rzpOrder.id;
    isOrder = true;
    orderAmount = rzpOrder.amount;
  }

  // 5. Update Firestore Subscription Record
  const effectivePlan = requestedPlanKey === 'trial' ? 'monthly' : requestedPlanKey;
  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    userId: verifiedUser.uid,
    userEmail: verifiedUser.email,
    userName: verifiedUser.name,
    plan: effectivePlan as any,
    billingCycle: effectivePlan as any,
    status: 'pending',
    hasHadTrial: isTrialRequest || existing?.hasHadTrial || false,
    razorpaySubscriptionId: rzpSubId,
    razorpayPlanId: planId || (isOrder ? 'order_mode' : ''),
    cancelAtPeriodEnd: false,
    lockTimestamp: 0,
    updatedAt: Date.now(),
  });

  return jsonResponse({
    subscriptionId: isOrder ? undefined : rzpSubId,
    orderId: isOrder ? rzpSubId : undefined,
    amount: orderAmount,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID,
    isFirstTime,
  });
}

/**
 * Handles GET /api/me
 * Returning serverNow, status, accessUntil, trialEndsAt
 */
export async function handleGetMe(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);

  const existing = await getSubscriptionFromFirestore(creds, verifiedUser.uid);

  return jsonResponse({
    serverNow: new Date().toISOString(),
    status: existing?.status || 'none',
    accessUntil: existing?.accessUntil || null,
    trialEndsAt: existing?.trialEndsAt || null,
  });
}

export { handleCancelSubscription, handleChangePlan } from './planManagement';
export { handleVerifyPayment } from './paymentVerify';
