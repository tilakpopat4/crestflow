import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount, updateSubscriptionInFirestore } from '../firestore';
import { jsonResponse, getBearerToken } from './subscription';

/**
 * Handles POST /api/verify-payment
 * Instant client payment verification and access provisioning
 */
export async function handleVerifyPayment(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) return jsonResponse({ error: 'Missing token' }, 401);

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);

  const body = (await request.json().catch(() => ({}))) as any;
  const { paymentId, orderId, planKey } = body;
  if (!paymentId) return jsonResponse({ error: 'Missing paymentId' }, 400);

  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: authHeader },
  });

  if (!payRes.ok) {
    const errText = await payRes.text();
    return jsonResponse({ error: `Payment verification failed: ${errText}` }, 400);
  }

  const payData = (await payRes.json()) as any;
  if (payData.status !== 'captured' && payData.status !== 'authorized') {
    return jsonResponse({ error: `Payment not completed. Status: ${payData.status}` }, 400);
  }

  const nowMs = Date.now();
  const isTrial = (planKey || '').toLowerCase() === 'trial' || payData.amount === 100;
  const days = isTrial
    ? 7
    : planKey === 'yearly'
    ? 365
    : planKey === 'half'
    ? 180
    : planKey === 'quarterly'
    ? 90
    : 30;

  const accessUntil = new Date(nowMs + days * 86400 * 1000).toISOString();
  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    userId: verifiedUser.uid,
    status: isTrial ? 'trialing' : 'active',
    plan: 'pro',
    currentPeriodStart: nowMs,
    currentPeriodEnd: nowMs + days * 86400 * 1000,
    accessUntil,
    trialEndsAt: isTrial ? accessUntil : null,
    hasHadSubscription: true,
    hasHadTrial: true,
    razorpaySubscriptionId: orderId || paymentId,
    cancelAtPeriodEnd: false,
    updatedAt: nowMs,
  });

  return jsonResponse({
    status: 'ok',
    subscriptionStatus: isTrial ? 'trialing' : 'active',
    accessUntil,
  });
}
