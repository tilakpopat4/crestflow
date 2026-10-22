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
import { jsonResponse, getBearerToken, resolveServerPlanId } from './subscription';

/**
 * Handles POST /api/cancel-subscription
 * - trialing: cancels immediately in Razorpay (cancel_at_cycle_end: 0) so user is never billed,
 *   but keeps access until trialEndsAt in Firestore.
 * - active: cancels at cycle end in Razorpay (cancel_at_cycle_end: 1), keeping access until period end.
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

  const isTrialing = currentSub.status === 'trialing';

  if (isTrialing) {
    // Trialing: Cancel immediately in Razorpay so auto-renewal charge never executes
    await cancelRazorpaySubscription(env, currentSub.razorpaySubscriptionId, false);

    // Keep access in Firestore until trialEndsAt (or accessUntil)
    const retainedAccessUntil = currentSub.trialEndsAt || currentSub.accessUntil;

    await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
      cancelAtPeriodEnd: true,
      status: 'cancelled',
      accessUntil: retainedAccessUntil,
      updatedAt: Date.now(),
    });

    return jsonResponse({
      success: true,
      status: 'cancelled',
      cancelAtPeriodEnd: true,
      accessUntil: retainedAccessUntil,
      isTrialing: true,
      message: 'Trial subscription cancelled. You retain full access until your trial ends.',
    });
  }

  // Active / Past Due: Cancel at cycle end in Razorpay
  await cancelRazorpaySubscription(env, currentSub.razorpaySubscriptionId, true);

  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    cancelAtPeriodEnd: true,
    status: 'cancelled',
    updatedAt: Date.now(),
  });

  return jsonResponse({
    success: true,
    status: 'cancelled',
    cancelAtPeriodEnd: true,
    accessUntil: currentSub.accessUntil,
    isTrialing: false,
    message: 'Subscription will cancel automatically at the end of the current billing cycle.',
  });
}

/**
 * Handles POST /api/change-plan
 * - Cancels the current subscription at period end (cancel_at_cycle_end: 1)
 * - Creates a new subscription in Razorpay with start_at set to the cycle end date
 * - Records pending plan change in Firestore
 */
export async function handleChangePlan(request: Request, env: Env): Promise<Response> {
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
    newPlanKey?: string;
  };
  const targetPlanKey = (body.newPlanKey || body.planKey || body.plan || '').toLowerCase() as PlanKey;

  const targetPlanId = resolveServerPlanId(env, targetPlanKey);
  if (!targetPlanId) {
    return jsonResponse(
      {
        error: `Invalid plan key '${targetPlanKey}'. Supported plans: monthly, quarterly, half, yearly.`,
      },
      400
    );
  }

  const currentSub = await getSubscriptionFromFirestore(creds, verifiedUser.uid);
  if (!currentSub || !currentSub.razorpaySubscriptionId) {
    return jsonResponse({ error: 'No active recurring subscription found to change' }, 404);
  }

  if (currentSub.plan === targetPlanKey || currentSub.billingCycle === targetPlanKey) {
    return jsonResponse({ error: `User is already subscribed to the ${targetPlanKey} plan.` }, 400);
  }

  // 1. Cancel current subscription at cycle end
  await cancelRazorpaySubscription(env, currentSub.razorpaySubscriptionId, true);

  // 2. Determine target start_at date (epoch seconds)
  const nowSec = Math.floor(Date.now() / 1000);
  let effectiveDateSec = nowSec;

  if (currentSub.currentPeriodEnd) {
    effectiveDateSec = currentSub.currentPeriodEnd > 1e11
      ? Math.floor(currentSub.currentPeriodEnd / 1000)
      : currentSub.currentPeriodEnd;
  } else if (currentSub.accessUntil) {
    effectiveDateSec = Math.floor(new Date(currentSub.accessUntil).getTime() / 1000);
  }

  // Razorpay start_at must be strictly in the future (minimum +60s from now)
  const scheduledStartAt = Math.max(nowSec + 60, effectiveDateSec);

  // 3. Create new subscription in Razorpay scheduled to begin at that date
  const newSub = await createRazorpaySubscription(
    env,
    targetPlanId,
    verifiedUser.uid,
    false, // Not first-time, no trial verification addon
    verifiedUser.email || currentSub.userEmail,
    verifiedUser.name || currentSub.userName,
    scheduledStartAt
  );

  // 4. Update Firestore with scheduled plan change
  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    cancelAtPeriodEnd: true,
    pendingPlanChange: {
      newPlan: targetPlanKey,
      newPlanId: targetPlanId,
      newSubscriptionId: newSub.id,
      effectiveDate: scheduledStartAt * 1000,
      requestedAt: Date.now(),
    },
    updatedAt: Date.now(),
  });

  return jsonResponse({
    success: true,
    message: `Plan will change to ${targetPlanKey} at the end of the current billing cycle.`,
    newSubscriptionId: newSub.id,
    effectiveDate: new Date(scheduledStartAt * 1000).toISOString(),
    newPlan: targetPlanKey,
  });
}
