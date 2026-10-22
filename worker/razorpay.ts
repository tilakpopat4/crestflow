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

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody)
  );

  // Convert HMAC bytes to hex string
  const hashArray = Array.from(new Uint8Array(signatureBytes));
  const expectedSignatureHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeCompare(expectedSignatureHex.toLowerCase(), signatureHeader.toLowerCase().trim());
}

/**
 * Creates a Razorpay Subscription using the Razorpay REST API.
 */
export async function createRazorpaySubscription(
  env: Env,
  planId: string,
  userId: string,
  isFirstTime: boolean,
  userEmail?: string,
  userName?: string,
  startAt?: number
): Promise<{ id: string; status: string; shortUrl?: string }> {
  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expireBy = nowSeconds + 30 * 60; // Expire in 30 minutes

  const bodyPayload: Record<string, any> = {
    plan_id: planId,
    total_count: 120, // 10 years max recurring cycles
    quantity: 1,
    customer_notify: 1,
    expire_by: expireBy,
    notes: {
      uid: userId,
      userId,
      userEmail: userEmail || '',
      userName: userName || '',
    },
  };

  if (startAt && startAt > nowSeconds) {
    bodyPayload.start_at = startAt;
  } else if (isFirstTime) {
    // First-time users get start_at = now+7d plus a ₹1 (100 paise) addon
    bodyPayload.start_at = nowSeconds + 7 * 24 * 60 * 60;
    bodyPayload.addons = [
      {
        item: {
          name: '7-Day Trial Verification Fee',
          amount: 100, // 100 paise = ₹1
          currency: 'INR',
        },
      },
    ];
  }

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
    throw new Error(`Razorpay create subscription failed: ${res.status} ${errorText}`);
  }

  const data = (await res.json()) as { id: string; status: string; short_url?: string };
  return {
    id: data.id,
    status: data.status,
    shortUrl: data.short_url,
  };
}

/**
 * Cancels an active or trialing Razorpay subscription.
 * @param cancelAtCycleEnd When true, subscription runs until current cycle end. When false, terminates immediately (used for trials).
 */
export async function cancelRazorpaySubscription(
  env: Env,
  subscriptionId: string,
  cancelAtCycleEnd = true
): Promise<{ id: string; status: string }> {
  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;

  const res = await fetch(
    `https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay cancel subscription failed: ${res.status} ${errorText}`);
  }

  return (await res.json()) as { id: string; status: string };
}

/**
 * Re-fetches the authoritative subscription entity directly from Razorpay.
 */
export async function fetchRazorpaySubscription(
  env: Env,
  subscriptionId: string
): Promise<any> {
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
    throw new Error(`Razorpay fetch subscription failed: ${res.status} ${errorText}`);
  }

  return await res.json();
}

/**
 * Refunds a payment via Razorpay REST API (e.g. ₹1 trial fee on abuse detection).
 */
export async function refundRazorpayPayment(
  env: Env,
  paymentId: string,
  amountPaise = 100
): Promise<any> {
  const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;

  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      notes: {
        reason: 'Trial abuse policy enforcement refund',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay refund failed: ${res.status} ${errorText}`);
  }

  return await res.json();
}
