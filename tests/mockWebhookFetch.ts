import crypto from 'node:crypto';

export interface MockWebhookState {
  processedEvents: Set<string>;
  firestoreSubscriptions: Map<string, any>;
  trialLedger: Map<string, any>;
  razorpaySubscriptions: Map<string, any>;
  refundedPayments: Array<{ paymentId: string; amount: number }>;
  cancelledSubscriptions: string[];
}

export function createMockFetch(state: MockWebhookState, originalFetch: typeof globalThis.fetch) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    // 1. Google OAuth2 token exchange
    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Razorpay Subscriptions API: Cancel / Fetch
    if (urlStr.includes('api.razorpay.com/v1/subscriptions/')) {
      const parts = urlStr.split('/');
      const isCancel = urlStr.endsWith('/cancel');
      const subId = isCancel ? parts[parts.length - 2] : parts[parts.length - 1].split('?')[0];

      if (isCancel) {
        state.cancelledSubscriptions.push(subId);
        return new Response(JSON.stringify({ id: subId, status: 'cancelled' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const sub = state.razorpaySubscriptions.get(subId);
      if (!sub) {
        return new Response(JSON.stringify({ error: { description: 'Subscription not found' } }), {
          status: 404,
        });
      }
      return new Response(JSON.stringify(sub), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Razorpay Payments Refund API
    if (urlStr.includes('api.razorpay.com/v1/payments/') && urlStr.endsWith('/refund')) {
      const parts = urlStr.split('/');
      const paymentId = parts[parts.length - 2];
      const body = JSON.parse((init?.body as string) || '{}');
      state.refundedPayments.push({ paymentId, amount: body.amount || 100 });
      return new Response(JSON.stringify({ id: `rfnd_${Date.now()}`, status: 'processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Firestore processed_events (Deduplication)
    if (urlStr.includes('/documents/processed_events/')) {
      const eventId = urlStr.split('/').pop()?.split('?')[0] || '';
      if (init?.method === 'PATCH') {
        state.processedEvents.add(eventId);
        return new Response(JSON.stringify({ name: eventId }), { status: 200 });
      }
      if (state.processedEvents.has(eventId)) {
        return new Response(JSON.stringify({ name: eventId }), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }

    // 5. Firestore trial_ledger/{hash}
    if (urlStr.includes('/documents/trial_ledger/')) {
      const hash = urlStr.split('/').pop()?.split('?')[0] || '';
      if (init?.method === 'PATCH') {
        const body = JSON.parse((init.body as string) || '{}');
        const existing = state.trialLedger.get(hash) || {};
        const incomingFields: Record<string, any> = {};

        for (const [k, v] of Object.entries(body.fields || {})) {
          const val = v as any;
          incomingFields[k] = val.stringValue ?? val.integerValue ?? val.timestampValue ?? val.booleanValue;
        }

        state.trialLedger.set(hash, { ...existing, ...incomingFields });
        return new Response(JSON.stringify({ name: hash }), { status: 200 });
      }

      const entry = state.trialLedger.get(hash);
      if (!entry) return new Response('Not found', { status: 404 });

      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(entry)) {
        if (typeof v === 'number') fields[k] = { integerValue: String(v) };
        else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
        else fields[k] = { stringValue: String(v) };
      }
      return new Response(JSON.stringify({ fields }), { status: 200 });
    }

    // 6. Firestore subscriptions/{userId}
    if (urlStr.includes('/documents/subscriptions/')) {
      const userId = urlStr.split('/').pop()?.split('?')[0] || '';
      if (init?.method === 'PATCH') {
        const body = JSON.parse((init.body as string) || '{}');
        const existing = state.firestoreSubscriptions.get(userId) || {};
        const incomingFields: Record<string, any> = {};

        for (const [k, v] of Object.entries(body.fields || {})) {
          const val = v as any;
          incomingFields[k] = val.stringValue ?? val.integerValue ?? val.timestampValue ?? val.booleanValue;
        }

        state.firestoreSubscriptions.set(userId, { ...existing, ...incomingFields });
        return new Response(JSON.stringify({ name: userId }), { status: 200 });
      }

      const sub = state.firestoreSubscriptions.get(userId);
      if (!sub) return new Response('Not found', { status: 404 });

      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(sub)) {
        if (typeof v === 'number') fields[k] = { integerValue: String(v) };
        else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
        else fields[k] = { stringValue: String(v) };
      }
      return new Response(JSON.stringify({ fields }), { status: 200 });
    }

    return originalFetch(input, init);
  };
}

export function createMockIdToken(uid: string, email: string, privateKeyPem: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'mock_kid' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://securetoken.google.com/test-project',
      aud: 'test-project',
      exp: now + 3600,
      iat: now,
      sub: uid,
      email,
    })
  ).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKeyPem, 'base64url');

  return `${header}.${payload}.${signature}`;
}
