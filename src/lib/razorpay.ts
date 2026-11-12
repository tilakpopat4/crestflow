/**
 * Dynamically injects Razorpay Checkout script if not already present in DOM.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface StandardCheckoutParams {
  amountPaise: number;
  currency?: string;
  name?: string;
  description?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  idToken: string;
  planKey?: string;
  receipt?: string;
  onSuccess: (data: any) => void;
  onError: (err: any) => void;
  onDismiss?: () => void;
}

/**
 * Standard Razorpay Web Checkout helper:
 * 1. Calls POST /api/create-order
 * 2. Launches Razorpay modal with returned order_id
 * 3. On success, sends payment_id, order_id, signature to POST /api/verify-payment
 */
export async function launchRazorpayStandardCheckout(params: StandardCheckoutParams): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Unable to connect to Razorpay payment gateway. Please check your internet connection.');
  }

  // 1. Create order on backend
  const orderRes = await fetch('/api/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      planKey: params.planKey,
    }),
  });

  if (!orderRes.ok) {
    const errData = await orderRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to create Razorpay order');
  }

  const { order_id, orderId, amount, key_id, keyId } = await orderRes.json();
  const effectiveOrderId = order_id || orderId;
  const effectiveKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || key_id || keyId;

  if (!effectiveKey) {
    throw new Error('Razorpay public key is missing');
  }

  // 2. Open Razorpay Checkout modal
  const options = {
    key: effectiveKey,
    amount,
    currency: params.currency || 'INR',
    name: params.name || 'CrestFlow Pro',
    description: params.description || 'Payment Checkout',
    order_id: effectiveOrderId,
    image: '/app_logo_icon.png',
    prefill: {
      name: params.userName || '',
      email: params.userEmail || '',
      contact: params.userPhone || '',
    },
    theme: {
      color: '#282828',
    },
    handler: async function (response: any) {
      try {
        // 3. Verify payment signature on backend
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.idToken}`,
          },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            planKey: params.planKey,
          }),
        });

        if (!verifyRes.ok) {
          const errData = await verifyRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Payment signature verification failed');
        }

        const verifyData = await verifyRes.json();
        params.onSuccess(verifyData);
      } catch (err: any) {
        params.onError(err);
      }
    },
    modal: {
      ondismiss: function () {
        if (params.onDismiss) params.onDismiss();
      },
    },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.on('payment.failed', function (resp: any) {
    params.onError(new Error(`Payment failed: ${resp.error?.description || 'Transaction declined'}`));
  });
  rzp.open();
}
