import { Env } from './types';

/**
 * Constant-time string comparison to prevent timing attacks on webhook signatures and secrets.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies Razorpay webhook signature over raw payload bytes using Web Crypto HMAC-SHA256.
 */
export async function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expectedSignatureHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeCompare(expectedSignatureHex.toLowerCase(), signatureHeader.toLowerCase().trim());
}

/**
 * Creates a paid auto-renewing Razorpay Subscription (no ₹1 trial addon or delay).
 */
export async function createRazorpaySubscription(
  env: Env,
  planId: string,
  userId: string,
  planKey: string,
  userEmail?: string,
  userName?: string
): Promise<{ id: string; status: string; shortUrl?: string }> {
  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expireBy = nowSeconds + 30 * 60;

  const bodyPayload: Record<string, any> = {
    plan_id: planId,
    total_count: 120,
    quantity: 1,
    customer_notify: 1,
    expire_by: expireBy,
    notes: {
      uid: userId,
      userId,
      planKey,
      checkoutMode: 'subscription',
      userEmail: userEmail || '',
      userName: userName || '',
    },
  };

  const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay create subscription failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { id: string; status: string; short_url?: string };
  return {
    id: data.id,
    status: data.status,
    shortUrl: data.short_url,
  };
}

/**
 * Cancels an active Razorpay subscription at cycle end or immediately.
 */
export async function cancelRazorpaySubscription(
  env: Env,
  subscriptionId: string,
  cancelAtCycleEnd = true
): Promise<{ id: string; status: string }> {
  if (!subscriptionId || !subscriptionId.startsWith('sub_')) {
    return { id: subscriptionId || '', status: 'cancelled' };
  }

  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;

  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (
      res.status === 400 &&
      (errorText.includes('could not be found') ||
        errorText.includes('already cancelled') ||
        errorText.includes('completed'))
    ) {
      return { id: subscriptionId, status: 'cancelled' };
    }
    throw new Error(`Razorpay cancel subscription failed (${res.status}): ${errorText}`);
  }

  return (await res.json()) as { id: string; status: string };
}

/**
 * Fetches an authoritative subscription entity from Razorpay.
 */
export async function fetchRazorpaySubscription(env: Env, subscriptionId: string): Promise<any> {
  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay fetch subscription failed (${res.status}): ${errorText}`);
  }
  return await res.json();
}

/**
 * Fetches an authoritative payment entity from Razorpay.
 */
export async function fetchRazorpayPayment(env: Env, paymentId: string): Promise<any> {
  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay fetch payment failed (${res.status}): ${errorText}`);
  }
  return await res.json();
}

/**
 * Creates a one-time Razorpay Order for fixed-period fallback checkout.
 */
export async function createRazorpayOrder(
  env: Env,
  amountPaise: number,
  userId: string,
  planKey: string,
  userEmail?: string,
  userName?: string
): Promise<{ id: string; amount: number; currency: string }> {
  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        uid: userId,
        userId,
        planKey,
        checkoutMode: 'order',
        userEmail: userEmail || '',
        userName: userName || '',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay create order failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { id: string; amount: number; currency: string };
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}

/**
 * Verifies Razorpay checkout signature:
 * - Orders: HMAC-SHA256(order_id + "|" + payment_id, secret)
 * - Subscriptions: HMAC-SHA256(razorpay_payment_id + "|" + subscription_id, secret)
 */
export async function verifyRazorpayCheckoutSignature(params: {
  orderId?: string | null;
  subscriptionId?: string | null;
  paymentId: string;
  signature: string;
  secret: string;
}): Promise<boolean> {
  const { orderId, subscriptionId, paymentId, signature, secret } = params;
  if (!paymentId || !signature || !secret) return false;
  if (subscriptionId) {
    const okSub = await verifyRazorpayWebhookSignature(`${paymentId}|${subscriptionId}`, signature, secret);
    if (okSub) return true;
  }
  if (orderId) {
    const okOrd = await verifyRazorpayWebhookSignature(`${orderId}|${paymentId}`, signature, secret);
    if (okOrd) return true;
  }
  return false;
}

/**
 * Legacy Order signature helper preserved for signature tests.
 */
export async function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  return verifyRazorpayCheckoutSignature({ orderId, paymentId, signature, secret });
}
