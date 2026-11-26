import { auth } from '../firebase';
import type { PaidPlanKey } from '../shared/pricing';
import { trackAccessEvent } from './analytics';

export type CheckoutMode = 'subscription' | 'order';

export interface CheckoutVerifyResult {
  success: boolean;
  entitlementStatus?: string;
  plan?: string;
  billingCycle?: string;
  checkoutMode?: CheckoutMode;
  validUntil?: string;
  error?: string;
}

export interface PlanCheckoutParams {
  planKey: PaidPlanKey;
  name: string;
  email: string;
  phone?: string;
  uid: string;
  onActivating?: () => void;
  onSuccess?: (result: CheckoutVerifyResult) => void;
  onDismiss?: () => void;
  onFailure?: (message: string) => void;
}

export interface StandardCheckoutParams {
  planKey?: PaidPlanKey | string;
  plan?: string;
  name: string;
  email: string;
  phone?: string;
  uid: string;
  onActivating?: () => void;
  onSuccess?: (result: CheckoutVerifyResult) => void;
  onDismiss?: () => void;
  onFailure?: (message: string) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (resp: Record<string, any>) => void) => void;
    };
  }
}

/**
 * Loads the official Razorpay checkout SDK once on demand.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function normalizePaidPlan(input?: string): PaidPlanKey {
  if (input === 'monthly' || input === 'quarterly' || input === 'yearly') return input;
  if (input === 'annual') return 'yearly';
  return 'yearly';
}

/**
 * Initiates paid Razorpay checkout via /api/create-subscription (auto-renewing subscription
 * when Plan IDs are configured, or one-time Order fallback), then verifies signature on the server.
 */
export async function launchPlanCheckout(params: PlanCheckoutParams): Promise<{
  mode: CheckoutMode;
  validUntilEstimate?: string;
}> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Authentication required before checkout. Please sign in again.');
  }

  trackAccessEvent('checkout_started', { plan: params.planKey });

  const createRes = await fetch('/api/create-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planKey: params.planKey }),
  });

  const createData = (await createRes.json().catch(() => ({}))) as {
    mode?: CheckoutMode;
    subscriptionId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    planKey?: PaidPlanKey;
    planTitle?: string;
    validUntilEstimate?: string;
    code?: string;
    error?: string;
  };

  if (!createRes.ok || !createData.keyId) {
    throw new Error(createData.error || 'Could not initiate payment session. Please try again.');
  }

  const mode: CheckoutMode = createData.mode || (createData.subscriptionId ? 'subscription' : 'order');
  if (mode === 'subscription' && !createData.subscriptionId) {
    throw new Error('Server did not return a valid subscription ID.');
  }
  if (mode === 'order' && !createData.orderId) {
    throw new Error('Server did not return a valid payment order ID.');
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Unable to load Razorpay Checkout. Check your internet connection and retry.');
  }

  const options: Record<string, unknown> = {
    key: createData.keyId,
    name: 'CrestFlow Pro',
    description:
      mode === 'subscription'
        ? `${createData.planTitle || 'Pro'} Auto-Renewing Plan`
        : `${createData.planTitle || 'Pro'} Access (One-Time)`,
    currency: createData.currency || 'INR',
    prefill: {
      name: params.name,
      email: params.email,
      contact: params.phone || '',
    },
    notes: {
      uid: params.uid,
      planKey: createData.planKey || params.planKey,
      mode,
    },
    theme: {
      color: '#E0002B',
    },
    modal: {
      confirm_close: true,
      ondismiss: () => {
        params.onDismiss?.();
      },
    },
    handler: async (response: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature?: string;
    }) => {
      params.onActivating?.();
      try {
        const freshToken = (await auth.currentUser?.getIdToken()) || token;
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || createData.orderId,
            razorpay_subscription_id: response.razorpay_subscription_id || createData.subscriptionId,
            razorpay_signature: response.razorpay_signature,
            planKey: createData.planKey || params.planKey,
            mode,
          }),
        });

        const verifyData = (await verifyRes.json().catch(() => ({}))) as CheckoutVerifyResult;
        if (!verifyRes.ok || !verifyData.success) {
          params.onFailure?.(
            verifyData.error || 'Payment verification failed on server. Use Refresh status or contact support.',
          );
          return;
        }

        trackAccessEvent('payment_succeeded', {
          plan: verifyData.plan || params.planKey,
          mode,
        });
        params.onSuccess?.(verifyData);
      } catch (err) {
        params.onFailure?.(
          err instanceof Error ? err.message : 'Network error verifying payment.',
        );
      }
    },
  };

  if (mode === 'subscription') {
    options.subscription_id = createData.subscriptionId;
  } else {
    options.order_id = createData.orderId;
    options.amount = createData.amount;
  }

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (resp) => {
    const desc =
      resp?.error?.description ||
      resp?.error?.reason ||
      'Payment could not be completed. No charge was applied.';
    params.onFailure?.(desc);
  });
  rzp.open();

  return {
    mode,
    validUntilEstimate: createData.validUntilEstimate,
  };
}

/**
 * Compatibility wrapper preserving existing imports across checkout callers.
 */
export async function launchRazorpayStandardCheckout(
  params: StandardCheckoutParams,
): Promise<{ mode: CheckoutMode; validUntilEstimate?: string }> {
  return launchPlanCheckout({
    planKey: normalizePaidPlan(params.planKey || params.plan),
    name: params.name,
    email: params.email,
    phone: params.phone,
    uid: params.uid,
    onActivating: params.onActivating,
    onSuccess: params.onSuccess,
    onDismiss: params.onDismiss,
    onFailure: params.onFailure,
  });
}
