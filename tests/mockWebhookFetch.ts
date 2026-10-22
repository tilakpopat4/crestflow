export interface MockWebhookState {
  processedEvents: Set<string>;
  firestoreSubscriptions: Map<string, any>;
  razorpaySubscriptions: Map<string, any>;
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

    // 2. Razorpay Subscriptions API: GET /v1/subscriptions/{subId}
    if (urlStr.includes('api.razorpay.com/v1/subscriptions/')) {
      const subId = urlStr.split('/').pop()?.split('?')[0] || '';
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

    // 3. Firestore processed_events (Deduplication)
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

    // 4. Firestore subscriptions/{userId}
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
