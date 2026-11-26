import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env } from '../worker/types';
import { MockWebhookState, createMockFetch, createMockIdToken } from './mockWebhookFetch';

function generateSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('Billing Grace Period & Cardless Trial Enforcement Suite', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockState: MockWebhookState;
  let testEnv: Env;
  let privateKeyPem: string;
  const TEST_WEBHOOK_SECRET = 'rzp_webhook_secret_review';

  before(() => {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKeyPem = keyPair.privateKey;
    const jwk = crypto.createPublicKey(privateKeyPem).export({ format: 'jwk' }) as any;

    originalFetch = globalThis.fetch;
    mockState = {
      processedEvents: new Set(),
      firestoreSubscriptions: new Map(),
      entitlements: new Map(),
      trialClaims: new Map(),
      trialLedger: new Map(),
      razorpaySubscriptions: new Map(),
      refundedPayments: [],
      cancelledSubscriptions: [],
      cancellationsDetailed: [],
      sentEmails: [],
      publicKeyJwk: { ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' },
    };
    globalThis.fetch = createMockFetch(mockState, originalFetch);

    testEnv = {
      ASSETS: { fetch: async () => new Response('Asset') },
      BASE_URL: 'https://crestflow.space',
      CRON_SECRET: 'cron_secret_high_entropy_9988',
      RAZORPAY_KEY_ID: 'rzp_test_key1',
      RAZORPAY_KEY_SECRET: 'rzp_test_sec1',
      RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
      TRIAL_LEDGER_PEPPER: 'test_pepper_val',
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: 'test-project',
        client_email: 'test@serviceaccount.com',
        private_key: privateKeyPem,
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
    mockState.trialClaims!.clear();
    mockState.trialLedger.clear();
    mockState.razorpaySubscriptions.clear();
  });

  it('1. Grace period: set graceUntil ONCE (periodEnd + 3 days) and repeated failures do not extend it', async () => {
    const subId = 'sub_grace_test_1';
    const userId = 'usr_grace_1';
    const periodEndSec = Math.floor((Date.now() + 86400_000) / 1000);
    const expectedGraceIso = new Date(periodEndSec * 1000 + 3 * 24 * 60 * 60 * 1000).toISOString();

    mockState.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'pending',
      current_end: periodEndSec,
      notes: { uid: userId },
    });

    for (let i = 1; i <= 3; i++) {
      const body = JSON.stringify({
        event: 'payment.failed',
        event_id: `evt_fail_${i}`,
        created_at: periodEndSec + i * 1000,
        payload: { subscription: { entity: { id: subId } } },
      });
      const res = await worker.fetch(
        new Request('https://crestflow.space/api/razorpay-webhook', {
          method: 'POST',
          headers: { 'x-razorpay-signature': generateSignature(body, TEST_WEBHOOK_SECRET) },
          body,
        }),
        testEnv
      );
      assert.equal(res.status, 200);
      const ent = mockState.entitlements!.get(userId);
      assert.equal(ent.status, 'grace');
      assert.equal(ent.graceUntil, expectedGraceIso, `Attempt ${i} must keep original graceUntil`);
      assert.equal(ent.validUntil, expectedGraceIso);
    }
  });

  it('2. Subscription authenticated without payment does NOT grant fake card trial', async () => {
    const subId = 'sub_auth_only_1';
    const userId = 'usr_auth_only_1';
    mockState.razorpaySubscriptions.set(subId, { id: subId, status: 'authenticated', notes: { uid: userId } });

    const body = JSON.stringify({
      event: 'subscription.authenticated',
      event_id: 'evt_auth_only_1',
      payload: { subscription: { entity: { id: subId } } },
    });
    const res = await worker.fetch(
      new Request('https://crestflow.space/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(body, TEST_WEBHOOK_SECRET) },
        body,
      }),
      testEnv
    );
    assert.equal(res.status, 200);
    assert.equal(mockState.entitlements!.get(userId), undefined, 'Must not grant trial on Razorpay subscription.authenticated');
  });

  it('3. Cardless trial enforces 1-trial-per-person across normalized email variants', async () => {
    const tokenA = createMockIdToken('usr_norm_a', 'tilak.popat@gmail.com', privateKeyPem);
    const resA = await worker.fetch(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: '{}',
      }),
      testEnv
    );
    assert.equal(resA.status, 200);

    const tokenB = createMockIdToken('usr_norm_b', 'tilakpopat+second@googlemail.com', privateKeyPem);
    const resB = await worker.fetch(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
        body: '{}',
      }),
      testEnv
    );
    assert.equal(resB.status, 403);
    assert.equal(((await resB.json()) as any).code, 'TRIAL_ALREADY_CLAIMED');
  });
});
