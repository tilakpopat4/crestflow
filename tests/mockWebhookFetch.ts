import crypto from 'node:crypto';

export interface MockWebhookState {
  processedEvents: Set<string>;
  firestoreSubscriptions: Map<string, any>;
  trialLedger: Map<string, any>;
  razorpaySubscriptions: Map<string, any>;
  refundedPayments: Array<{ paymentId: string; amount: number }>;
  cancelledSubscriptions: string[];
  cancellationsDetailed: Array<{ subId: string; cancelAtCycleEnd: number }>;
  sentEmails: Array<{ to: string[]; subject: string; html: string; text: string }>;
  emailJobs?: Map<string, any>;
  emailIdempotency?: Map<string, any>;
  profiles?: Map<string, any>;
  publicKeyJwk?: any;
}

export function createMockFetch(state: MockWebhookState, originalFetch: typeof globalThis.fetch) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    // 0. Google JWKS public keys for Firebase token verification
    if (urlStr.includes('securetoken@system.gserviceaccount.com') && state.publicKeyJwk) {
      return new Response(
        JSON.stringify({
          keys: [state.publicKeyJwk],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Google OAuth2 token exchange
    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Email Delivery APIs (EmailJS & Resend)
    if (urlStr.includes('api.emailjs.com/api/v1.0/email/send')) {
      const body = JSON.parse((init?.body as string) || '{}');
      const params = body.template_params || {};
      state.sentEmails.push({
        to: params.to_email ? [params.to_email] : [],
        subject: params.subject || '',
        html: params.message_html || '',
        text: params.message_text || '',
      });
      return new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (urlStr.includes('api.resend.com/emails')) {
      const body = JSON.parse((init?.body as string) || '{}');
      state.sentEmails.push({
        to: body.to || [],
        subject: body.subject || '',
        html: body.html || '',
        text: body.text || '',
      });
      return new Response(JSON.stringify({ id: `re_mock_${Date.now()}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Razorpay Subscriptions API: Create / Cancel / Fetch
    if (urlStr.includes('api.razorpay.com/v1/subscriptions')) {
      if (urlStr.endsWith('/subscriptions') && init?.method === 'POST') {
        const body = JSON.parse((init?.body as string) || '{}');
        const id = `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        state.razorpaySubscriptions.set(id, { id, status: 'created', ...body });
        return new Response(JSON.stringify({ id, status: 'created', short_url: `https://rzp.io/i/${id}` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const parts = urlStr.split('/');
      const isCancel = urlStr.endsWith('/cancel');
      const subId = isCancel ? parts[parts.length - 2] : parts[parts.length - 1].split('?')[0];

      if (isCancel) {
        const body = JSON.parse((init?.body as string) || '{}');
        state.cancelledSubscriptions.push(subId);
        if (!state.cancellationsDetailed) state.cancellationsDetailed = [];
        state.cancellationsDetailed.push({ subId, cancelAtCycleEnd: body.cancel_at_cycle_end ?? 1 });
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

    // 4. Razorpay Payments Refund API
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

    // 5. Firestore processed_events (Deduplication)
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

    // 6. Firestore trial_ledger/{hash}
    if (urlStr.includes('/documents/trial_ledger/')) {
      const hash = urlStr.split('/').pop()?.split('?')[0] || '';
      if (init?.method === 'PATCH') {
        const body = JSON.parse((init.body as string) || '{}');
        const existing = state.trialLedger.get(hash) || {};
        const incomingFields: Record<string, any> = {};

        for (const [k, v] of Object.entries(body.fields || {})) {
          incomingFields[k] = parseMockFirestoreValue(v);
        }

        state.trialLedger.set(hash, { ...existing, ...incomingFields });
        return new Response(JSON.stringify({ name: hash }), { status: 200 });
      }

      const entry = state.trialLedger.get(hash);
      if (!entry) return new Response('Not found', { status: 404 });

      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(entry)) {
        fields[k] = toMockFirestoreValue(v);
      }
      return new Response(JSON.stringify({ fields }), { status: 200 });
    }

    // 7. Firestore list subscriptions: /documents/subscriptions?pageSize=...
    if (urlStr.includes('/documents/subscriptions') && !urlStr.includes('/documents/subscriptions/')) {
      const documents: any[] = [];
      for (const [userId, sub] of state.firestoreSubscriptions.entries()) {
        const fields: Record<string, any> = {};
        for (const [k, v] of Object.entries(sub)) {
          fields[k] = toMockFirestoreValue(v);
        }
        documents.push({
          name: `projects/demo/databases/(default)/documents/subscriptions/${userId}`,
          fields,
        });
      }
      return new Response(JSON.stringify({ documents }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 8. Firestore single subscription: /documents/subscriptions/{userId}
    if (urlStr.includes('/documents/subscriptions/')) {
      const userId = urlStr.split('/').pop()?.split('?')[0] || '';
      if (init?.method === 'PATCH') {
        const body = JSON.parse((init.body as string) || '{}');
        const existing = state.firestoreSubscriptions.get(userId) || {};
        const incomingFields: Record<string, any> = {};

        for (const [k, v] of Object.entries(body.fields || {})) {
          incomingFields[k] = parseMockFirestoreValue(v);
        }

        state.firestoreSubscriptions.set(userId, { ...existing, ...incomingFields });
        return new Response(JSON.stringify({ name: userId }), { status: 200 });
      }

      const sub = state.firestoreSubscriptions.get(userId);
      if (!sub) return new Response('Not found', { status: 404 });

      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(sub)) {
        fields[k] = toMockFirestoreValue(v);
      }
      return new Response(JSON.stringify({ fields }), { status: 200 });
    }

    // 9. Firestore emailIdempotency/{cleanKey}
    if (urlStr.includes('/documents/emailIdempotency/')) {
      const key = urlStr.split('/').pop()?.split('?')[0] || '';
      if (!state.emailIdempotency) state.emailIdempotency = new Map();
      if (init?.method === 'PATCH') {
        const body = JSON.parse((init.body as string) || '{}');
        const jobId = body.fields?.jobId?.stringValue || 'job_mock';
        state.emailIdempotency.set(key, { jobId });
        return new Response(JSON.stringify({ name: key }), { status: 200 });
      }
      const existing = state.emailIdempotency.get(key);
      if (existing) {
        return new Response(JSON.stringify({ fields: { jobId: { stringValue: existing.jobId } } }), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }

    // 10. Firestore emailJobs/{jobId}
    if (urlStr.includes('/documents/emailJobs/')) {
      const jobId = urlStr.split('/').pop()?.split('?')[0] || '';
      if (!state.emailJobs) state.emailJobs = new Map();
      if (init?.method === 'PATCH') {
        const body = JSON.parse((init.body as string) || '{}');
        const existing = state.emailJobs.get(jobId) || {};
        const incomingFields: Record<string, any> = {};
        for (const [k, v] of Object.entries(body.fields || {})) {
          incomingFields[k] = parseMockFirestoreValue(v);
        }
        state.emailJobs.set(jobId, { ...existing, ...incomingFields });
        return new Response(JSON.stringify({ name: jobId }), { status: 200 });
      }
      const job = state.emailJobs.get(jobId);
      if (!job) return new Response('Not found', { status: 404 });
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(job)) {
        fields[k] = toMockFirestoreValue(v);
      }
      return new Response(JSON.stringify({ fields }), { status: 200 });
    }

    // 11. Firestore runQuery
    if (urlStr.includes('/documents:runQuery')) {
      const results: any[] = [];
      if (state.emailJobs) {
        for (const [jobId, job] of state.emailJobs.entries()) {
          const fields: Record<string, any> = {};
          for (const [k, v] of Object.entries(job)) {
            fields[k] = toMockFirestoreValue(v);
          }
          results.push({
            document: {
              name: `projects/demo/databases/(default)/documents/emailJobs/${jobId}`,
              fields,
            },
          });
        }
      }
      return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 12. Firestore profiles/{userId}
    if (urlStr.includes('/documents/profiles/')) {
      const userId = urlStr.split('/').pop()?.split('?')[0] || '';
      if (!state.profiles) state.profiles = new Map();
      const prof = state.profiles.get(userId);
      if (!prof) return new Response('Not found', { status: 404 });
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(prof)) {
        fields[k] = toMockFirestoreValue(v);
      }
      return new Response(JSON.stringify({ fields }), { status: 200 });
    }

    return originalFetch(input, init);
  };
}

function parseMockFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(parseMockFirestoreValue);
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseMockFirestoreValue(v);
    }
    return res;
  }
  return null;
}

function toMockFirestoreValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toMockFirestoreValue) } };
  if (typeof v === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      fields[k] = toMockFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
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
