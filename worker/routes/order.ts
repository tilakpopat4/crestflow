import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount } from '../firestore';
import {
  getEntitlementFromFirestore,
  isEntitledRecord,
  resolveEffectiveStatus,
  writeEntitlement,
} from '../entitlements';
import { createRazorpayOrder } from '../razorpay';
import { resolvePaidPlanKey, SERVER_PLAN_CATALOG } from '../../src/shared/pricing';
import { jsonResponse, getBearerToken } from './subscription';

/**
 * Handles POST /api/create-order
 * Fallback one-time Razorpay Order checkout. Server ALWAYS resolves price from planKey.
 * Preserves any running trial entitlement until verified payment completes.
 */
export async function handleCreateOrder(request: Request, env: Env): Promise<Response> {
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
        error: 'You already have an active plan. Mid-period plan switching is unavailable until your current period ends.',
        code: 'ALREADY_ACTIVE',
        validUntil: existing.validUntil,
      },
      409,
      request,
      env
    );
  }

  try {
    const orderData = await createRazorpayOrder(
      env,
      planSpec.amountPaise,
      verifiedUser.uid,
      paidPlanKey,
      verifiedUser.email,
      verifiedUser.name
    );

    const now = Date.now();
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
      checkoutMode: 'order',
      razorpayOrderId: orderData.id,
      updatedAt: new Date(now).toISOString(),
    });

    return jsonResponse(
      {
        mode: 'order',
        order_id: orderData.id,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        key_id: env.RAZORPAY_KEY_ID,
        keyId: env.RAZORPAY_KEY_ID,
        planKey: paidPlanKey,
        validUntilEstimate,
      },
      200,
      request,
      env
    );
  } catch (err: any) {
    console.error('[create-order] Error creating order:', err?.message);
    return jsonResponse({ error: 'Unable to initialize payment order. Please try again.' }, 500, request, env);
  }
}
