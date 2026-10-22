import { Env, PlanKey } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import {
  parseServiceAccount,
  getSubscriptionFromFirestore,
  updateSubscriptionInFirestore,
} from '../firestore';
import {
  createRazorpaySubscription,
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
  };
  const requestedPlanKey = (body.planKey || body.plan || 'monthly').toLowerCase();

  const planId = resolveServerPlanId(env, requestedPlanKey);
  if (!planId) {
    return jsonResponse(
      {
        error: `Invalid plan key '${requestedPlanKey}' or plan ID is not configured on the server. Supported plans: monthly, quarterly, half, yearly.`,
      },
      400
    );
  }

  // 1. Idempotency Lock & Existing Subscription Verification
  const existing = await getSubscriptionFromFirestore(creds, verifiedUser.uid);

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

  // 2. First-time user vs Returning user detection
  const isReturningUser =
    existing &&
    (existing.hasHadSubscription ||
      existing.status === 'active' ||
      existing.status === 'cancelled' ||
      existing.status === 'expired');

  let isFirstTime = !isReturningUser;

  // 3. Anti-abuse Trial Ledger: Reserve Google email hash
  let emailHash = '';
  if (verifiedUser.email) {
    const normalizedEmail = normalizeGoogleEmail(verifiedUser.email);
    emailHash = await hashIdentifier(normalizedEmail, env.TRIAL_LEDGER_PEPPER);

    if (isFirstTime) {
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
  }

  // 4. Create Subscription in Razorpay (sets notes.uid, expire_by 30m, start_at + 7d & 100 paise addon if first time)
  const rzpSub = await createRazorpaySubscription(
    env,
    planId,
    verifiedUser.uid,
    isFirstTime,
    verifiedUser.email,
    verifiedUser.name
  );

  // 4. Update Firestore Subscription Record
  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    userId: verifiedUser.uid,
    plan: requestedPlanKey as any,
    billingCycle: requestedPlanKey as any,
    status: 'pending',
    razorpaySubscriptionId: rzpSub.id,
    razorpayPlanId: planId,
    cancelAtPeriodEnd: false,
    lockTimestamp: 0,
    updatedAt: Date.now(),
  });

  return jsonResponse({
    subscriptionId: rzpSub.id,
    keyId: env.RAZORPAY_KEY_ID,
    shortUrl: rzpSub.shortUrl,
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

/**
 * Handles POST /api/cancel-subscription
 */
export async function handleCancelSubscription(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);

  const currentSub = await getSubscriptionFromFirestore(creds, verifiedUser.uid);
  if (!currentSub || !currentSub.razorpaySubscriptionId) {
    return jsonResponse({ error: 'No active recurring subscription found to cancel' }, 404);
  }

  await cancelRazorpaySubscription(env, currentSub.razorpaySubscriptionId);

  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    cancelAtPeriodEnd: true,
    status: 'cancelled',
    updatedAt: Date.now(),
  });

  return jsonResponse({
    success: true,
    message: 'Subscription will cancel automatically at the end of the current billing cycle',
  });
}
