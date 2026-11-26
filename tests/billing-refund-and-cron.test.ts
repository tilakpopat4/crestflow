import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env } from '../worker/types';
import { MockWebhookState, createMockFetch } from './mockWebhookFetch';

function generateSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('Billing Refund Processing & Cron Secret Security Suite', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockState: MockWebhookState;
  let testEnv: Env;
  const TEST_WEBHOOK_SECRET = 'rzp_webhook_secret_refund';
  const TEST_CRON_SECRET = 'cron_secret_high_entropy_9988';

  before(() => {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    originalFetch = globalThis.fetch;
    mockState = {
      processedEvents: new Set(),
      firestoreSubscriptions: new Map(),
      entitlements: new Map(),
      trialLedger: new Map(),
      razorpaySubscriptions: new Map(),
      refundedPayments: [],
      cancelledSubscriptions: [],
      cancellationsDetailed: [],
      sentEmails: [],
    };
    globalThis.fetch = createMockFetch(mockState, originalFetch);

    testEnv = {
      ASSETS: { fetch: async () => new Response('Asset') },
      BASE_URL: 'https://crestflow.space',
      CRON_SECRET: TEST_CRON_SECRET,
      RAZORPAY_KEY_ID: 'rzp_test_key1',
      RAZORPAY_KEY_SECRET: 'rzp_test_sec1',
      RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: 'test-project',
        client_email: 'test@serviceaccount.com',
        private_key: keyPair.privateKey,
      }),
      FIREBASE_PROJECT_ID: 'test-project',
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    mockState.processedEvents.clear();
    mockState.entitlements!.clear();
    mockState.razorpaySubscriptions.clear();
    mockState.refundedPayments = [];
  });

  it('1. refund.processed: partial refund preserves entitlement; full renewal refund ends access', async () => {
    const subId = 'sub_refund_test_1';
    const userId = 'usr_refund_target';

    mockState.entitlements!.set(userId, {
      userId,
      status: 'active',
      plan: 'pro_monthly',
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    mockState.razorpaySubscriptions.set(subId, { id: subId, status: 'active', notes: { uid: userId } });

    const partialBody = JSON.stringify({
      event: 'refund.processed',
      event_id: 'evt_partial_renewal',
      payload: {
        subscription: { entity: { id: subId } },
        refund: { entity: { id: 'rfnd_2', amount: 2000 } },
        payment: { entity: { id: 'pay_2', amount: 7900, amount_refunded: 2000, status: 'captured' } },
      },
    });
    const resB = await worker.fetch(
      new Request('https://crestflow.space/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(partialBody, TEST_WEBHOOK_SECRET) },
        body: partialBody,
      }),
      testEnv
    );
    assert.equal(resB.status, 200);
    assert.equal(((await resB.json()) as any).partial_refund, true);
    assert.equal(mockState.entitlements!.get(userId).status, 'active');

    const fullBody = JSON.stringify({
      event: 'refund.processed',
      event_id: 'evt_full_renewal',
      payload: {
        subscription: { entity: { id: subId } },
        refund: { entity: { id: 'rfnd_3', amount: 7900 } },
        payment: { entity: { id: 'pay_2', amount: 7900, amount_refunded: 7900, status: 'refunded' } },
      },
    });
    const resC = await worker.fetch(
      new Request('https://crestflow.space/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(fullBody, TEST_WEBHOOK_SECRET) },
        body: fullBody,
      }),
      testEnv
    );
    assert.equal(resC.status, 200);
    const afterFull = mockState.entitlements!.get(userId);
    assert.equal(afterFull.status, 'expired');
    assert.ok(new Date(afterFull.validUntil).getTime() < Date.now());
  });

  it('2. /api/reconcile-cron rejects requests without the exact CRON_SECRET using constant-time compare', async () => {
    const resNoAuth = await worker.fetch(new Request('https://crestflow.space/api/reconcile-cron', { method: 'POST' }), testEnv);
    assert.equal(resNoAuth.status, 401);

    const resWrongAuth = await worker.fetch(
      new Request('https://crestflow.space/api/reconcile-cron', { method: 'POST', headers: { Authorization: 'Bearer wrong_secret' } }),
      testEnv
    );
    assert.equal(resWrongAuth.status, 401);

    const resValidBearer = await worker.fetch(
      new Request('https://crestflow.space/api/reconcile-cron', { method: 'POST', headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` } }),
      testEnv
    );
    assert.equal(resValidBearer.status, 200);
    assert.equal(((await resValidBearer.json()) as any).success, true);

    const resValidHeader = await worker.fetch(
      new Request('https://crestflow.space/api/reconcile-cron', { method: 'POST', headers: { 'x-cron-secret': TEST_CRON_SECRET } }),
      testEnv
    );
    assert.equal(resValidHeader.status, 200);
  });
});
