import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env } from '../worker/types';
import { MockWebhookState, createMockFetch } from './mockWebhookFetch';

function generateSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  return hmac.digest('hex');
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
      BASE_URL: 'https://crestflow.app',
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
    mockState.firestoreSubscriptions.clear();
    mockState.trialLedger.clear();
    mockState.razorpaySubscriptions.clear();
    mockState.refundedPayments = [];
    mockState.cancelledSubscriptions = [];
    mockState.cancellationsDetailed = [];
    mockState.sentEmails = [];
  });

  it('1. refund.processed: ₹1 trial fee non-abuse ignored; full renewal ends access; partial refund logs', async () => {
    const subId = 'sub_refund_test_1';
    const userId = 'usr_refund_target';

    mockState.firestoreSubscriptions.set(userId, {
      userId,
      status: 'active',
      accessUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    mockState.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'active',
      notes: { uid: userId },
    });

    // Case A: ₹1 trial fee refund (non-abuse) -> Membership remains active
    const trialRefundBody = JSON.stringify({
      event: 'refund.processed',
      event_id: 'evt_trial_refund_normal',
      payload: {
        subscription: { entity: { id: subId } },
        refund: { entity: { id: 'rfnd_1', amount: 100, notes: { reason: 'Customer goodwill' } } },
        payment: { entity: { id: 'pay_1', amount: 100 } },
      },
    });
    const resA = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(trialRefundBody, TEST_WEBHOOK_SECRET) },
        body: trialRefundBody,
      }),
      testEnv
    );
    assert.equal(resA.status, 200);
    const dataA = await resA.json();
    assert.equal(dataA.ignored, 'trial_fee_refund_non_abuse');
    assert.equal(mockState.firestoreSubscriptions.get(userId).status, 'active');

    // Case B: Partial refund of renewal payment -> Membership remains active
    const partialRefundBody = JSON.stringify({
      event: 'refund.processed',
      event_id: 'evt_partial_renewal',
      payload: {
        subscription: { entity: { id: subId } },
        refund: { entity: { id: 'rfnd_2', amount: 2000 } },
        payment: { entity: { id: 'pay_2', amount: 7900, amount_refunded: 2000, status: 'captured' } },
      },
    });
    const resB = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(partialRefundBody, TEST_WEBHOOK_SECRET) },
        body: partialRefundBody,
      }),
      testEnv
    );
    assert.equal(resB.status, 200);
    const dataB = await resB.json();
    assert.equal(dataB.partial_refund, true);
    assert.equal(mockState.firestoreSubscriptions.get(userId).status, 'active');

    // Case C: Full renewal refund -> Access terminated
    const fullRefundBody = JSON.stringify({
      event: 'refund.processed',
      event_id: 'evt_full_renewal',
      payload: {
        subscription: { entity: { id: subId } },
        refund: { entity: { id: 'rfnd_3', amount: 7900 } },
        payment: { entity: { id: 'pay_2', amount: 7900, amount_refunded: 7900, status: 'refunded' } },
      },
    });
    const resC = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(fullRefundBody, TEST_WEBHOOK_SECRET) },
        body: fullRefundBody,
      }),
      testEnv
    );
    assert.equal(resC.status, 200);
    const subAfterFullRefund = mockState.firestoreSubscriptions.get(userId);
    assert.equal(subAfterFullRefund.status, 'expired');
    assert.ok(new Date(subAfterFullRefund.accessUntil).getTime() < Date.now());

    // Case D: Abuse refund of ₹1 fee -> Access terminated immediately
    const abuseRefundBody = JSON.stringify({
      event: 'refund.processed',
      event_id: 'evt_abuse_refund_1',
      payload: {
        subscription: { entity: { id: subId } },
        refund: { entity: { id: 'rfnd_4', amount: 100, notes: { reason: 'Trial abuse policy enforcement refund' } } },
        payment: { entity: { id: 'pay_1', amount: 100 } },
      },
    });
    const resD = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(abuseRefundBody, TEST_WEBHOOK_SECRET) },
        body: abuseRefundBody,
      }),
      testEnv
    );
    assert.equal(resD.status, 200);
    const subAfterAbuseRefund = mockState.firestoreSubscriptions.get(userId);
    assert.equal(subAfterAbuseRefund.status, 'expired');
  });

  it('2. /api/reconcile-cron rejects requests without the exact CRON_SECRET using constant-time compare', async () => {
    // 2a. Missing authorization and secret
    const resNoAuth = await worker.fetch(
      new Request('https://crestflow.app/api/reconcile-cron', { method: 'POST' }),
      testEnv
    );
    assert.equal(resNoAuth.status, 401);
    const dataNoAuth = await resNoAuth.json();
    assert.match(dataNoAuth.error, /Unauthorized/i);

    // 2b. Wrong secret
    const resWrongAuth = await worker.fetch(
      new Request('https://crestflow.app/api/reconcile-cron', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong_secret_key' },
      }),
      testEnv
    );
    assert.equal(resWrongAuth.status, 401);

    // 2c. Valid CRON_SECRET via Authorization: Bearer
    const resValidBearer = await worker.fetch(
      new Request('https://crestflow.app/api/reconcile-cron', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
      }),
      testEnv
    );
    assert.equal(resValidBearer.status, 200);
    const dataBearer = await resValidBearer.json();
    assert.equal(dataBearer.success, true);

    // 2d. Valid CRON_SECRET via x-cron-secret header
    const resValidHeader = await worker.fetch(
      new Request('https://crestflow.app/api/reconcile-cron', {
        method: 'POST',
        headers: { 'x-cron-secret': TEST_CRON_SECRET },
      }),
      testEnv
    );
    assert.equal(resValidHeader.status, 200);
    const dataHeader = await resValidHeader.json();
    assert.equal(dataHeader.success, true);
  });
});
