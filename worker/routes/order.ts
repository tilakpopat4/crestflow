import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount, getSubscriptionFromFirestore, updateSubscriptionInFirestore } from '../firestore';
import { jsonResponse, getBearerToken } from './subscription';

/**
 * Handles POST /api/create-order
 * Razorpay Standard Web Checkout order creation
 */
export async function handleCreateOrder(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing or unauthorized Authorization header' }, 401);
  }

  let verifiedUser;
  let creds;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
    verifiedUser = await verifyFirebaseIdToken(idToken, projectId);
  } catch (err: any) {
    return jsonResponse({ error: `Authentication failed: ${err.message}` }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    currency?: string;
    receipt?: string;
    planKey?: string;
    notes?: Record<string, string>;
  };

  const amountPaise = Number(body.amount);
  if (isNaN(amountPaise) || amountPaise < 100) {
    return jsonResponse(
      { error: 'Amount must be at least 100 paise (₹1)' },
      400
    );
  }

  const existing = await getSubscriptionFromFirestore(creds, verifiedUser.uid);
  const isTrialRequest = body.planKey === 'trial' || amountPaise === 100;
  if (isTrialRequest && (existing?.hasHadTrial || existing?.status === 'active' || existing?.status === 'trialing')) {
    return jsonResponse(
      { error: 'The 7-day trial is only available once per account. Please select one of our paid plans.' },
      403
    );
  }

  const currency = (body.currency || 'INR').toUpperCase();
  const receipt = body.receipt || `rcpt_${verifiedUser.uid.substring(0, 8)}_${Date.now()}`;

  try {
    const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt,
        notes: {
          uid: verifiedUser.uid,
          userId: verifiedUser.uid,
          userEmail: verifiedUser.email || '',
          planKey: body.planKey || '',
          ...(body.notes || {}),
        },
      }),
    });

    if (!rzpRes.ok) {
      const errText = await rzpRes.text();
      return jsonResponse(
        { error: `Razorpay order creation failed: ${errText}` },
        500
      );
    }

    const orderData = (await rzpRes.json()) as any;

    // Track pending order in Firestore
    const effectivePlan = body.planKey === 'trial' ? 'monthly' : body.planKey || 'monthly';
    await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
      userId: verifiedUser.uid,
      userEmail: verifiedUser.email,
      userName: verifiedUser.name,
      plan: effectivePlan as any,
      billingCycle: effectivePlan as any,
      status: 'pending',
      hasHadTrial: isTrialRequest || existing?.hasHadTrial || false,
      razorpaySubscriptionId: orderData.id,
      razorpayPlanId: 'order_mode',
      cancelAtPeriodEnd: false,
      lockTimestamp: 0,
      updatedAt: Date.now(),
    });

    return jsonResponse({
      order_id: orderData.id,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      key_id: env.RAZORPAY_KEY_ID,
      keyId: env.RAZORPAY_KEY_ID,
    });
  } catch (apiErr: any) {
    return jsonResponse(
      { error: `Internal server error: ${apiErr.message}` },
      500
    );
  }
}
