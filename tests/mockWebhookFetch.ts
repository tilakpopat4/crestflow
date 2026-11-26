import crypto from 'node:crypto';
import {
  fieldsToObj,
  handleCollectionDoc,
  handleCommitRequest,
  listCollectionResponse,
  objToFields,
} from './mockFirestoreRest';

export interface MockWebhookState {
  processedEvents: Set<string>;
  firestoreSubscriptions: Map<string, any>;
  entitlements?: Map<string, any>;
  trialLedger: Map<string, any>;
  trialClaims?: Map<string, any>;
  invoiceShares?: Map<string, any>;
  invoices?: Map<string, any>;
  systemSettings?: Map<string, any>;
  extraDocs?: Map<string, any>;
  razorpaySubscriptions: Map<string, any>;
  razorpayOrders?: Map<string, any>;
  razorpayPayments?: Map<string, any>;
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
  if (!state.entitlements) state.entitlements = new Map();
  if (!state.trialClaims) state.trialClaims = new Map();
  if (!state.invoiceShares) state.invoiceShares = new Map();
  if (!state.invoices) state.invoices = new Map();
  if (!state.systemSettings) state.systemSettings = new Map();
  if (!state.extraDocs) state.extraDocs = new Map();
  if (!state.razorpayOrders) state.razorpayOrders = new Map();
  if (!state.razorpayPayments) state.razorpayPayments = new Map();
  if (!state.emailJobs) state.emailJobs = new Map();
  if (!state.emailIdempotency) state.emailIdempotency = new Map();
  if (!state.profiles) state.profiles = new Map();

  const resolveDocStore = (relPath: string): { map: Map<string, any>; id: string } => {
    const clean = relPath.split('?')[0].replace(/^\/+/, '');
    const parts = clean.split('/');
    const col = parts[0];
    const id = parts.slice(1).join('/');
    if (col === 'entitlements') return { map: state.entitlements!, id };
    if (col === 'subscriptions') return { map: state.firestoreSubscriptions, id };
    if (col === 'trialClaims') return { map: state.trialClaims!, id };
    if (col === 'trial_ledger') return { map: state.trialLedger, id };
    if (col === 'invoice_shares') return { map: state.invoiceShares!, id };
    if (col === 'invoices') return { map: state.invoices!, id };
    if (col === 'system_settings') return { map: state.systemSettings!, id };
    if (col === 'emailJobs') return { map: state.emailJobs!, id };
    if (col === 'emailIdempotency') return { map: state.emailIdempotency!, id };
    if (col === 'profiles') return { map: state.profiles!, id };
    return { map: state.extraDocs!, id: clean };
  };

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    if (urlStr.includes('securetoken@system.gserviceaccount.com') && state.publicKeyJwk) {
      return new Response(JSON.stringify({ keys: [state.publicKeyJwk] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlStr.includes('api.emailjs.com/api/v1.0/email/send')) {
      const body = JSON.parse((init?.body as string) || '{}');
      const params = body.template_params || {};
      state.sentEmails.push({
        to: params.to_email ? [params.to_email] : [],
        subject: params.subject || '',
        html: params.message_html || '',
        text: params.message_text || '',
      });
      return new Response('OK', { status: 200 });
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
        state.cancellationsDetailed.push({ subId, cancelAtCycleEnd: body.cancel_at_cycle_end ?? 1 });
        return new Response(JSON.stringify({ id: subId, status: 'cancelled' }), { status: 200 });
      }
      const sub = state.razorpaySubscriptions.get(subId);
      if (!sub) return new Response(JSON.stringify({ error: { description: 'Subscription not found' } }), { status: 404 });
      return new Response(JSON.stringify(sub), { status: 200 });
    }

    if (urlStr.includes('api.razorpay.com/v1/orders')) {
      if (init?.method === 'POST') {
        const body = JSON.parse((init?.body as string) || '{}');
        const id = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const ord = { id, ...body };
        state.razorpayOrders!.set(id, ord);
        return new Response(JSON.stringify(ord), { status: 200 });
      }
      const ordId = urlStr.split('/').pop()?.split('?')[0] || '';
      const ord = state.razorpayOrders!.get(ordId);
      if (!ord) return new Response('Not found', { status: 404 });
      return new Response(JSON.stringify(ord), { status: 200 });
    }

    if (urlStr.includes('api.razorpay.com/v1/payments/')) {
      if (urlStr.endsWith('/refund')) {
        const parts = urlStr.split('/');
        const paymentId = parts[parts.length - 2];
        const body = JSON.parse((init?.body as string) || '{}');
        state.refundedPayments.push({ paymentId, amount: body.amount || 0 });
        return new Response(JSON.stringify({ id: `rfnd_${Date.now()}`, status: 'processed' }), { status: 200 });
      }
      const payId = urlStr.split('/').pop()?.split('?')[0] || '';
      const pay = state.razorpayPayments!.get(payId) || { id: payId, status: 'captured', amount: 7900, method: 'upi' };
      return new Response(JSON.stringify(pay), { status: 200 });
    }

    if (urlStr.includes('firestore.googleapis.com/')) {
      if (urlStr.includes(':commit')) {
        const body = JSON.parse((init?.body as string) || '{}');
        return handleCommitRequest(body.writes || [], resolveDocStore);
      }
      if (urlStr.includes('/documents:runQuery')) {
        const results: any[] = [];
        for (const [jobId, job] of state.emailJobs!.entries()) {
          results.push({
            document: {
              name: `projects/test-project/databases/(default)/documents/emailJobs/${jobId}`,
              fields: objToFields(job),
            },
          });
        }
        return new Response(JSON.stringify(results), { status: 200 });
      }
      if (urlStr.includes('/documents/webhook_events/') || urlStr.includes('/documents/processed_events/')) {
        const eventId = urlStr.split('/').pop()?.split('?')[0] || '';
        if (init?.method === 'PATCH') {
          state.processedEvents.add(eventId);
          return new Response(JSON.stringify({ name: eventId }), { status: 200 });
        }
        return state.processedEvents.has(eventId)
          ? new Response(JSON.stringify({ name: eventId }), { status: 200 })
          : new Response('Not found', { status: 404 });
      }

      const relAfterDocs = urlStr.split('/documents/')[1] || '';
      const cleanRel = relAfterDocs.split('?')[0].replace(/^\/+/, '');
      if (cleanRel === 'entitlements') return listCollectionResponse(state.entitlements!, 'entitlements');
      if (cleanRel === 'subscriptions') return listCollectionResponse(state.firestoreSubscriptions, 'subscriptions');
      if (cleanRel === 'emailJobs') return listCollectionResponse(state.emailJobs!, 'emailJobs');
      if (cleanRel === 'profiles') return listCollectionResponse(state.profiles!, 'profiles');

      const { map, id } = resolveDocStore(cleanRel);
      return handleCollectionDoc(map, id, init, urlStr);
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
  return `${header}.${payload}.${sign.sign(privateKeyPem, 'base64url')}`;
}
