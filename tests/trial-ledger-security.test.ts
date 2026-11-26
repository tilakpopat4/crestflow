import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { handleCreateSubscription } from '../worker/routes/subscription';
import { handleActivateTrial } from '../worker/routes/trial';
import {
  normalizeGoogleEmail,
  normalizeUpiVpa,
  hashIdentifier,
} from '../worker/trialLedger';
import { Env } from '../worker/types';
import { createMockFetch, MockWebhookState, createMockIdToken } from './mockWebhookFetch';

const state: MockWebhookState = {
  processedEvents: new Set<string>(),
  firestoreSubscriptions: new Map<string, any>(),
  entitlements: new Map<string, any>(),
  trialClaims: new Map<string, any>(),
  trialLedger: new Map<string, any>(),
  razorpaySubscriptions: new Map<string, any>(),
  refundedPayments: [],
  cancelledSubscriptions: [],
  cancellationsDetailed: [],
  sentEmails: [],
};

const TEST_PEPPER = 'test_salted_pepper_secret_abc123';

const { privateKey: testPrivateKeyPem } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const getToken = (uid: string, email: string) => createMockIdToken(uid, email, testPrivateKeyPem);

const TEST_ENV: Env = {
  ASSETS: { fetch: async () => new Response('Asset') },
  RAZORPAY_KEY_ID: 'rzp_test_key_123',
  RAZORPAY_KEY_SECRET: 'rzp_test_sec_456',
  RAZORPAY_WEBHOOK_SECRET: 'rzp_test_secret_778899',
  RAZORPAY_PLAN_MONTHLY: 'plan_monthly_1',
  RAZORPAY_PLAN_QUARTERLY: 'plan_quarterly_1',
  RAZORPAY_PLAN_YEARLY: 'plan_yearly_1',
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
    project_id: 'test-project',
    client_email: 'test@serviceaccount.com',
    private_key: testPrivateKeyPem,
  }),
  FIREBASE_PROJECT_ID: 'test-project',
  TRIAL_LEDGER_PEPPER: TEST_PEPPER,
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  state.processedEvents.clear();
  state.firestoreSubscriptions.clear();
  state.entitlements!.clear();
  state.trialClaims!.clear();
  state.trialLedger.clear();
  state.razorpaySubscriptions.clear();
  state.refundedPayments = [];
  state.cancelledSubscriptions = [];
  const pubKeyObj = crypto.createPublicKey(testPrivateKeyPem);
  state.publicKeyJwk = { ...(pubKeyObj.export({ format: 'jwk' }) as any), kid: 'mock_kid', alg: 'RS256', use: 'sig' };
  globalThis.fetch = createMockFetch(state, originalFetch) as any;
});

describe('Trial Claims Anti-Abuse & Anti-Bypass Suite', () => {
  it('1. Email Normalization: Strips Gmail dots and +tags consistently', () => {
    assert.strictEqual(normalizeGoogleEmail('Tilak.Popat@gmail.com'), 'tilakpopat@gmail.com');
    assert.strictEqual(normalizeGoogleEmail('tilak.popat+freelance@googlemail.com'), 'tilakpopat@gmail.com');
    assert.strictEqual(normalizeGoogleEmail('T.I.L.A.K+12345@GMAIL.COM'), 'tilak@gmail.com');
    assert.strictEqual(normalizeUpiVpa(' Tilak@OkAxis '), 'tilak@okaxis');
  });

  it('2. Second Account with Dotted/Tagged Email: Denied cardless trial via trialClaims', async () => {
    const emailHash = await hashIdentifier(normalizeGoogleEmail('tilakpopat@gmail.com'), TEST_PEPPER);
    state.trialClaims!.set(`email_${emailHash}`, {
      claimKey: `email_${emailHash}`,
      type: 'email',
      claimedByUid: 'user_orig_1',
      claimedAt: new Date(Date.now() - 86400000).toISOString(),
    });

    const token = getToken('user_attacker_2', 't.i.l.a.k.popat+bonus@gmail.com');
    const res = await handleActivateTrial(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      }),
      TEST_ENV
    );
    assert.strictEqual(res.status, 403);
    const data = (await res.json()) as any;
    assert.strictEqual(data.code, 'TRIAL_ALREADY_CLAIMED');
  });

  it('3. Double-Click Race Condition: Concurrent /api/activate-trial only awards one trial', async () => {
    const token = getToken('user_racer_1', 'speedy@gmail.com');
    const makeReq = () =>
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      });

    const [res1, res2] = await Promise.all([
      handleActivateTrial(makeReq(), TEST_ENV),
      handleActivateTrial(makeReq(), TEST_ENV),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.strictEqual(statuses.filter((s) => s === 200).length, 1, 'Exactly 1 concurrent trial claim succeeds');
    assert.ok([403, 409, 429].includes(statuses.find((s) => s !== 200)!));
  });

  it('4. Paid Subscription Creation skips trial entirely and returns immediate paid checkout', async () => {
    const token = getToken('user_direct_pay_1', 'directpay@gmail.com');
    const res = await handleCreateSubscription(
      new Request('https://crestflow.space/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planKey: 'monthly' }),
      }),
      TEST_ENV
    );
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(data.mode, 'subscription');
    assert.ok(data.subscriptionId);
    assert.strictEqual(data.amount, 7900);
  });

  it('5. Rejects trial planKey on /api/create-subscription and 6-month planKey', async () => {
    const token = getToken('user_invalid_plan', 'plan@gmail.com');
    const resTrial = await handleCreateSubscription(
      new Request('https://crestflow.space/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planKey: 'trial' }),
      }),
      TEST_ENV
    );
    assert.strictEqual(resTrial.status, 400);

    const resHalf = await handleCreateSubscription(
      new Request('https://crestflow.space/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planKey: 'half' }),
      }),
      TEST_ENV
    );
    assert.strictEqual(resHalf.status, 400);
  });

  it('6. Rejects mid-period plan switch while an active paid period is running', async () => {
    const uid = 'user_mid_period_1';
    state.entitlements!.set(uid, {
      userId: uid,
      status: 'active',
      plan: 'pro_monthly',
      billingCycle: 'monthly',
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
    });
    const token = getToken(uid, 'activeuser@gmail.com');
    const res = await handleCreateSubscription(
      new Request('https://crestflow.space/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planKey: 'yearly' }),
      }),
      TEST_ENV
    );
    assert.strictEqual(res.status, 409);
  });
});
