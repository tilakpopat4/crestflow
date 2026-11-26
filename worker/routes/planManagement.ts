import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount } from '../firestore';
import { getEntitlementFromFirestore, resolveEffectiveStatus, writeEntitlement } from '../entitlements';
import { cancelRazorpaySubscription } from '../razorpay';
import { jsonResponse, getBearerToken } from './subscription';

/**
 * Handles POST /api/cancel-subscription
 * Cancels auto-renewal on Razorpay at period end; preserves `validUntil`.
 */
export async function handleCancelSubscription(request: Request, env: Env): Promise<Response> {
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

  const currentEnt = await getEntitlementFromFirestore(creds, verifiedUser.uid);
  const effectiveStatus = resolveEffectiveStatus(currentEnt);
  if (!currentEnt || (effectiveStatus !== 'active' && effectiveStatus !== 'grace' && effectiveStatus !== 'trialing')) {
    return jsonResponse({ error: 'No active plan found to cancel' }, 404, request, env);
  }

  if (effectiveStatus === 'trialing') {
    return jsonResponse({
      success: true,
      status: 'trialing',
      cancelAtPeriodEnd: false,
      validUntil: currentEnt.validUntil,
      message: 'Free trial requires no payment method and has no automatic charge when it ends.',
    }, 200, request, env);
  }

  if (currentEnt.razorpaySubscriptionId && currentEnt.checkoutMode === 'subscription') {
    try {
      await cancelRazorpaySubscription(env, currentEnt.razorpaySubscriptionId, true);
    } catch (err: any) {
      console.warn('[handleCancelSubscription] Razorpay cancel warning:', err?.message || err);
    }
  }

  await writeEntitlement(creds, verifiedUser.uid, {
    cancelAtPeriodEnd: true,
    updatedAt: new Date().toISOString(),
  });

  return jsonResponse(
    {
      success: true,
      status: currentEnt.status,
      cancelAtPeriodEnd: true,
      validUntil: currentEnt.validUntil,
      message: 'Auto-renewal cancelled. You keep full access until the end of your current period.',
    },
    200,
    request,
    env
  );
}

/**
 * Handles POST /api/change-plan
 * Decision 6: No mid-period plan switching in this phase.
 */
export async function handleChangePlan(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401, request, env);
  }

  return jsonResponse(
    {
      error: 'Mid-period plan switching is unavailable. You can choose a different plan after your current period ends.',
      code: 'PLAN_SWITCH_DISABLED',
    },
    400,
    request,
    env
  );
}
