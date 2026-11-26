import { Env, PaidPlanKey } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount } from '../firestore';
import {
  getEntitlementFromFirestore,
  isEntitledRecord,
  resolveEffectiveStatus,
  writeEntitlement,
} from '../entitlements';
import {
  createRazorpaySubscription,
  createRazorpayOrder,
} from '../razorpay';
import { resolvePaidPlanKey, SERVER_PLAN_CATALOG } from '../../src/shared/pricing';

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/crestflow\.space$/i,
  /^https:\/\/www\.crestflow\.space$/i,
  /^https:\/\/crestflow\.app$/i,
  /^https:\/\/www\.crestflow\.app$/i,
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

export function resolveCorsOrigin(request?: Request, env?: Env): string {
  const reqOrigin = request?.headers?.get('Origin') || '';
  if (reqOrigin) {
    if (ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(reqOrigin))) {
      return reqOrigin;
    }
    if (env?.BASE_URL && reqOrigin.toLowerCase() === env.BASE_URL.toLowerCase()) {
      return reqOrigin;
    }
  }
  return env?.BASE_URL || 'https://crestflow.space';
}

export function jsonResponse(
  data: any,
  status = 200,
  request?: Request,
  env?: Env,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': resolveCorsOrigin(request, env),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
      ...extraHeaders,
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
 * Resolves server-configured Razorpay Plan ID for paid billing cycles (no trial / 6-month plan).
 */
export function resolveServerPlanId(env: Env, planKey: string): string | null {
  const paidKey = resolvePaidPlanKey(planKey);
  if (!paidKey) return null;
  const planMap: Record<PaidPlanKey, string | undefined> = {
    monthly: env.RAZORPAY_PLAN_MONTHLY,
    quarterly: env.RAZORPAY_PLAN_QUARTERLY,
    yearly: env.RAZORPAY_PLAN_YEARLY,
  };
  return planMap[paidKey] || null;
}

/**
 * Handles POST /api/create-subscription
 * - Paid plans only (monthly, quarterly, yearly); trials must use /api/activate-trial.
 * - Prefers auto-renewing Razorpay Subscription when RAZORPAY_PLAN_* is configured,
 *   falling back cleanly to one-time Razorpay Order checkout (`mode: 'order'`).
 * - Blocks mid-period plan switches while an active paid period is still running.
 */
export async function handleCreateSubscription(request: Request, env: Env): Promise<Response> {
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

  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    planKey?: string;
  };
  const paidPlanKey = resolvePaidPlanKey(body.planKey || body.plan);
  if (!paidPlanKey) {
    return jsonResponse(
      { error: 'Please choose a valid paid plan (monthly, quarterly, or yearly).' },
      400,
      request,
      env
    );
  }

  const planSpec = SERVER_PLAN_CATALOG[paidPlanKey];
  const existing = await getEntitlementFromFirestore(creds, verifiedUser.uid);
  const effectiveStatus = resolveEffectiveStatus(existing);

  if (existing && (effectiveStatus === 'active' || effectiveStatus === 'grace')) {
    return jsonResponse(
      {
        error: 'You already have an active plan. Mid-period plan switching is disabled; select a new plan after the current period ends.',
        code: 'ALREADY_ACTIVE',
        validUntil: existing.validUntil,
      },
      409,
      request,
      env
    );
  }

  const now = Date.now();
  if (existing?.lockTimestamp && now - existing.lockTimestamp < 10000) {
    return jsonResponse({ error: 'Checkout already in progress. Please wait a moment.' }, 429, request, env);
  }

  if (existing) {
    await writeEntitlement(creds, verifiedUser.uid, { lockTimestamp: now });
  }

  const planId = resolveServerPlanId(env, paidPlanKey);
  let subscriptionId: string | undefined;
  let orderId: string | undefined;
  let checkoutMode: 'subscription' | 'order' = 'order';

  if (planId) {
    try {
      const rzpSub = await createRazorpaySubscription(
        env,
        planId,
        verifiedUser.uid,
        paidPlanKey,
        verifiedUser.email,
        verifiedUser.name
      );
      subscriptionId = rzpSub.id;
      checkoutMode = 'subscription';
    } catch (err: any) {
      console.warn('[Checkout] Razorpay Subscription creation failed, falling back to Order:', err?.message);
    }
  }

  if (!subscriptionId) {
    const rzpOrder = await createRazorpayOrder(
      env,
      planSpec.amountPaise,
      verifiedUser.uid,
      paidPlanKey,
      verifiedUser.email,
      verifiedUser.name
    );
    orderId = rzpOrder.id;
    checkoutMode = 'order';
  }

  const validUntilEstimate = new Date(now + planSpec.durationDays * 86400 * 1000).toISOString();

  await writeEntitlement(creds, verifiedUser.uid, {
    userId: verifiedUser.uid,
    userEmail: verifiedUser.email,
    userName: verifiedUser.name,
    status: existing?.status && isEntitledRecord(existing, now) ? existing.status : existing?.status || 'none',
    plan: existing?.plan && existing.plan !== 'none' ? existing.plan : 'none',
    validUntil: existing?.validUntil ?? null,
    trialUsed: Boolean(existing?.trialUsed),
    cancelAtPeriodEnd: Boolean(existing?.cancelAtPeriodEnd),
    checkoutMode,
    razorpaySubscriptionId: subscriptionId || existing?.razorpaySubscriptionId || null,
    razorpayOrderId: orderId || existing?.razorpayOrderId || null,
    lockTimestamp: 0,
    updatedAt: new Date(now).toISOString(),
  });

  return jsonResponse(
    {
      mode: checkoutMode,
      subscriptionId,
      orderId,
      amount: planSpec.amountPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      planKey: paidPlanKey,
      validUntilEstimate,
    },
    200,
    request,
    env
  );
}

/**
 * Handles GET /api/me
 * Single server clock sync + authoritative entitlement payload from `entitlements/{uid}`.
 */
export async function handleGetMe(request: Request, env: Env): Promise<Response> {
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

  const nowMs = Date.now();
  const ent = await getEntitlementFromFirestore(creds, verifiedUser.uid);
  const status = resolveEffectiveStatus(ent, nowMs);
  const canWrite = status === 'trialing' || status === 'active' || status === 'grace';

  return jsonResponse(
    {
      serverNow: new Date(nowMs).toISOString(),
      status,
      rawStatus: ent?.status || 'none',
      plan: ent?.plan || 'none',
      billingCycle: ent?.billingCycle || null,
      validUntil: ent?.validUntil || null,
      graceUntil: ent?.graceUntil || null,
      trialStartedAt: ent?.trialStartedAt || null,
      trialUsed: Boolean(ent?.trialUsed),
      cancelAtPeriodEnd: Boolean(ent?.cancelAtPeriodEnd),
      checkoutMode: ent?.checkoutMode || null,
      canWrite,
      recurringPlansConfigured: {
        monthly: Boolean(env.RAZORPAY_PLAN_MONTHLY),
        quarterly: Boolean(env.RAZORPAY_PLAN_QUARTERLY),
        yearly: Boolean(env.RAZORPAY_PLAN_YEARLY),
      },
    },
    200,
    request,
    env
  );
}

export { handleCancelSubscription, handleChangePlan } from './planManagement';
export { handleVerifyPayment } from './paymentVerify';
