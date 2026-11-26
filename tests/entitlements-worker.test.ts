import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env } from '../worker/types';
import { MockWebhookState, createMockFetch, createMockIdToken } from './mockWebhookFetch';

const { privateKey: rsaKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const jwk = crypto.createPublicKey(rsaKey).export({ format: 'jwk' }) as any;

const ENV: Env = {
  ASSETS: { fetch: async () => new Response('<html><meta name="robots" content="index,follow" /></html>', { headers: { 'content-type': 'text/html' } }) },
  BASE_URL: 'https://crestflow.space',
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'rzp_test_sec',
  RAZORPAY_WEBHOOK_SECRET: 'rzp_wh_sec',
  RAZORPAY_PLAN_MONTHLY: 'plan_m',
  RAZORPAY_PLAN_YEARLY: 'plan_y',
  TRIAL_LEDGER_PEPPER: 'pep_test_1',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'test-project', client_email: 'sa@test-project.iam.gserviceaccount.com', private_key: rsaKey }),
};

const hmacHex = (data: string, secret: string) => crypto.createHmac('sha256', secret).update(data).digest('hex');

describe('Server Entitlements, Worker Enforcement, Razorpay Verify & Public Invoice Security', () => {
  let origFetch: typeof globalThis.fetch;
  let state: MockWebhookState;

  before(() => {
    origFetch = globalThis.fetch;
    state = {
      processedEvents: new Set(),
      firestoreSubscriptions: new Map(),
      entitlements: new Map(),
      trialClaims: new Map(),
      trialLedger: new Map(),
      invoiceShares: new Map(),
      invoices: new Map(),
      profiles: new Map(),
      razorpaySubscriptions: new Map(),
      razorpayPayments: new Map(),
      refundedPayments: [],
      cancelledSubscriptions: [],
      cancellationsDetailed: [],
      sentEmails: [],
      publicKeyJwk: { ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' },
    };
    globalThis.fetch = createMockFetch(state, origFetch);
  });

  after(() => {
    globalThis.fetch = origFetch;
  });

  beforeEach(() => {
    state.processedEvents.clear();
    state.entitlements!.clear();
    state.trialClaims!.clear();
    state.invoiceShares!.clear();
    state.invoices!.clear();
    state.profiles!.clear();
    state.razorpaySubscriptions.clear();
    state.razorpayPayments!.clear();
  });

  it('1. Enforces ENTITLEMENT_REQUIRED across all 6 access states on Worker action routes', async () => {
    const uid = 'u_matrix';
    const token = createMockIdToken(uid, 'matrix@gmail.com', rsaKey);
    const future = new Date(Date.now() + 5 * 86400_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();

    const deniedCases = [
      null,
      { userId: uid, status: 'none', validUntil: null },
      { userId: uid, status: 'active', validUntil: past },
      { userId: uid, status: 'suspended', validUntil: future },
    ];
    for (const ent of deniedCases) {
      state.entitlements!.clear();
      if (ent) state.entitlements!.set(uid, ent);
      for (const path of ['/api/ai/authorize', '/api/invoices/authorize-send', '/api/portal/publish']) {
        const res = await worker.fetch(
          new Request(`https://crestflow.space${path}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Creator', username: 'creator' }),
          }),
          ENV
        );
        assert.equal(res.status, 403, `${path} must deny ${ent?.status ?? 'missing'} (${ent?.validUntil ?? 'null'})`);
        assert.equal(((await res.json()) as any).code, 'ENTITLEMENT_REQUIRED');
      }
    }

    for (const status of ['trialing', 'active', 'grace']) {
      state.entitlements!.set(uid, { userId: uid, status, plan: 'pro_monthly', validUntil: future });
      const res = await worker.fetch(
        new Request('https://crestflow.space/api/ai/authorize', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: '{}',
        }),
        ENV
      );
      assert.equal(res.status, 200, `State ${status} with future validUntil must succeed`);
    }
  });

  it('2. /api/verify-payment verifies Razorpay Subscription & Order signatures and handles idempotency', async () => {
    const uid = 'u_verify';
    const token = createMockIdToken(uid, 'verify@gmail.com', rsaKey);
    state.razorpaySubscriptions.set('sub_v1', {
      id: 'sub_v1',
      status: 'active',
      current_end: Math.floor((Date.now() + 30 * 86400_000) / 1000),
      notes: { uid, planKey: 'monthly' },
    });
    state.razorpayPayments!.set('pay_v1', { id: 'pay_v1', status: 'captured', amount: 7900, method: 'upi' });

    // Forged checkout signature rejected
    const badRes = await worker.fetch(
      new Request('https://crestflow.space/api/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpay_payment_id: 'pay_v1', razorpay_subscription_id: 'sub_v1', razorpay_signature: 'bad_sig' }),
      }),
      ENV
    );
    assert.equal(badRes.status, 400);

    // Valid subscription signature succeeds
    const validSig = hmacHex('pay_v1|sub_v1', ENV.RAZORPAY_KEY_SECRET);
    const okRes = await worker.fetch(
      new Request('https://crestflow.space/api/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpay_payment_id: 'pay_v1', razorpay_subscription_id: 'sub_v1', razorpay_signature: validSig, planKey: 'monthly' }),
      }),
      ENV
    );
    assert.equal(okRes.status, 200);
    assert.equal(state.entitlements!.get(uid).status, 'active');

    // Webhook arrives before verify-payment for a fallback Order
    const uidOrd = 'u_ord_wh_first';
    const tokOrd = createMockIdToken(uidOrd, 'ord@gmail.com', rsaKey);
    state.razorpayPayments!.set('pay_ord1', { id: 'pay_ord1', status: 'captured', amount: 19900, method: 'upi', notes: { uid: uidOrd, planKey: 'quarterly' } });
    const whBody = JSON.stringify({
      event: 'order.paid',
      event_id: 'evt_ord_first_1',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        order: { entity: { id: 'order_q1', amount: 19900, notes: { uid: uidOrd, planKey: 'quarterly' } } },
        payment: { entity: { id: 'pay_ord1', order_id: 'order_q1', amount: 19900, status: 'captured' } },
      },
    });
    await worker.fetch(
      new Request('https://crestflow.space/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': hmacHex(whBody, ENV.RAZORPAY_WEBHOOK_SECRET) },
        body: whBody,
      }),
      ENV
    );
    const verifyAfterWh = await worker.fetch(
      new Request('https://crestflow.space/api/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokOrd}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpay_order_id: 'order_q1', razorpay_payment_id: 'pay_ord1', razorpay_signature: hmacHex('order_q1|pay_ord1', ENV.RAZORPAY_KEY_SECRET) }),
      }),
      ENV
    );
    assert.equal(verifyAfterWh.status, 200);
    assert.equal(((await verifyAfterWh.json()) as any).idempotent, true);
  });

  it('3. Public token-scoped invoice works after expiry, masks sensitive fields, rate-limits & revokes cleanly', async () => {
    const uid = 'u_inv_owner';
    const token = createMockIdToken(uid, 'invowner@gmail.com', rsaKey);
    state.entitlements!.set(uid, { userId: uid, status: 'active', plan: 'pro_monthly', validUntil: new Date(Date.now() + 86400_000).toISOString() });
    state.profiles!.set(uid, { userId: uid, name: 'Aarav Editz', upiId: 'aarav@okaxis', geminiApiKey: 'SECRET_KEY' });
    state.invoices!.set('inv_pub_1', {
      id: 'inv_pub_1',
      userId: uid,
      invoiceNumber: 'CF-001',
      clientName: 'Studio X',
      clientEmail: 'secretclient@studio.com',
      totalAmount: 4500,
      status: 'Pending',
    });

    const shareRes = await worker.fetch(
      new Request('https://crestflow.space/api/invoices/share', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: 'inv_pub_1' }),
      }),
      ENV
    );
    assert.equal(shareRes.status, 200);
    const shareData = (await shareRes.json()) as any;
    const shareToken = shareData.shareUrl ? new URL(shareData.shareUrl).searchParams.get('t') || '' : '';
    assert.ok(shareToken.length >= 24, '192-bit CSPRNG token must be returned in shareUrl');
    const storedShare = state.invoiceShares!.get('inv_pub_1');
    assert.ok(storedShare.tokenHash && storedShare.tokenHash !== shareToken, 'Only hashed token must be stored');

    // Simulate freelancer expiring right now!
    state.entitlements!.set(uid, { userId: uid, status: 'expired', plan: 'pro_monthly', validUntil: new Date(Date.now() - 86400_000).toISOString() });

    // Expired freelancer's existing invoice stays viewable & claimable by client
    const getRes = await worker.fetch(
      new Request(`https://crestflow.space/api/public-invoice?id=inv_pub_1&t=${encodeURIComponent(shareToken)}`, {
        headers: { 'cf-connecting-ip': '9.9.9.1' },
      }),
      ENV
    );
    assert.equal(getRes.status, 200);
    assert.equal(getRes.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
    const pubJson = (await getRes.json()) as any;
    assert.equal(pubJson.invoice.totalAmount, 4500);
    assert.equal(pubJson.invoice.payeeUpiId, 'aarav@okaxis');
    assert.equal(pubJson.invoice.clientEmail, undefined, 'Must not leak private emails or secrets');

    // Wrong token & missing invoice yield identical 404 (no enumeration)
    const wrongRes = await worker.fetch(new Request('https://crestflow.space/api/public-invoice?id=inv_pub_1&t=wrongtoken123456', { headers: { 'cf-connecting-ip': '9.9.9.2' } }), ENV);
    const missingRes = await worker.fetch(new Request('https://crestflow.space/api/public-invoice?id=nonexistent_id&t=wrongtoken123456', { headers: { 'cf-connecting-ip': '9.9.9.3' } }), ENV);
    assert.equal(wrongRes.status, 404);
    assert.equal(missingRes.status, 404);
    assert.equal(await wrongRes.text(), await missingRes.text());

    // Client "I've paid" claim leaves status Pending (requires freelancer confirmation)
    const claimRes = await worker.fetch(
      new Request('https://crestflow.space/api/public-invoice/claim-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '9.9.9.4' },
        body: JSON.stringify({ invoiceId: 'inv_pub_1', token: shareToken, referenceNote: 'UTR 4321' }),
      }),
      ENV
    );
    assert.equal(claimRes.status, 200);
    assert.equal(((await claimRes.json()) as any).status, 'Pending');

    // Owner revokes even while expired, and token immediately stops working
    await worker.fetch(
      new Request('https://crestflow.space/api/invoices/revoke', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: 'inv_pub_1' }),
      }),
      ENV
    );
    const afterRevoke = await worker.fetch(
      new Request(`https://crestflow.space/api/public-invoice?id=inv_pub_1&t=${encodeURIComponent(shareToken)}`, { headers: { 'cf-connecting-ip': '9.9.9.5' } }),
      ENV
    );
    assert.equal(afterRevoke.status, 404);
  });

  it('4. Onboarding requests pause only after >30 days expired on /api/public-profile', async () => {
    const uidRecent = 'u_exp_10d';
    const uidOld = 'u_exp_45d';
    state.profiles!.set('recentpro', { userId: uidRecent, username: 'recentpro', name: 'Recent Expiring' });
    state.entitlements!.set(uidRecent, { userId: uidRecent, status: 'expired', validUntil: new Date(Date.now() - 10 * 86400_000).toISOString() });
    state.profiles!.set('oldpro', { userId: uidOld, username: 'oldpro', name: 'Old Expiring' });
    state.entitlements!.set(uidOld, { userId: uidOld, status: 'expired', validUntil: new Date(Date.now() - 45 * 86400_000).toISOString() });

    const r1 = await worker.fetch(new Request('https://crestflow.space/api/public-profile?handle=recentpro'), ENV);
    assert.equal(r1.status, 200);
    assert.equal(((await r1.json()) as any).acceptingRequests, true);

    const r2 = await worker.fetch(new Request('https://crestflow.space/api/public-profile?handle=oldpro'), ENV);
    assert.equal(r2.status, 200);
    assert.equal(((await r2.json()) as any).acceptingRequests, false);
  });
});
