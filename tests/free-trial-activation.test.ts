import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleActivateTrial } from '../worker/routes/trial';
import { computeSubscriptionAccess } from '../src/lib/subscriptionStateUtils';
import { Env } from '../worker/types';
import { createMockFetch, MockWebhookState, createMockIdToken } from './mockWebhookFetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const state: MockWebhookState = {
  processedEvents: new Set<string>(),
  firestoreSubscriptions: new Map<string, any>(),
  trialLedger: new Map<string, any>(),
  razorpaySubscriptions: new Map<string, any>(),
  refundedPayments: [],
  cancelledSubscriptions: [],
};

const TEST_SECRET = 'rzp_test_secret_778899';
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
  RAZORPAY_WEBHOOK_SECRET: TEST_SECRET,
  RAZORPAY_PLAN_MONTHLY: 'plan_monthly_1',
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
  state.trialLedger.clear();
  state.razorpaySubscriptions.clear();
  state.refundedPayments = [];
  state.cancelledSubscriptions = [];

  const mockNetwork = createMockFetch(state, originalFetch);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    // Mock Google JWKS endpoint for verifyFirebaseIdToken
    if (urlStr.includes('securetoken@system.gserviceaccount.com')) {
      const pubKeyObj = crypto.createPublicKey(testPrivateKeyPem);
      const jwk = pubKeyObj.export({ format: 'jwk' }) as any;
      return new Response(
        JSON.stringify({
          keys: [{ ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return mockNetwork(input, init);
  }) as typeof fetch;
});

describe('POST /api/activate-trial Master Verification Suite', () => {
  it('1. Rejects unauthenticated request with 401', async () => {
    const req = new Request('https://crestflow.space/api/activate-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await handleActivateTrial(req, TEST_ENV);
    assert.equal(res.status, 401);
    const json = await res.json() as any;
    assert.match(json.error, /Missing authorization header/i);
  });

  it('2. First-time eligible user activates 7-day trial with ₹0 cost and no Razorpay', async () => {
    const token = await getToken('usr_eligible_1', 'designer@studio.com');
    const req = new Request('https://crestflow.space/api/activate-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const res = await handleActivateTrial(req, TEST_ENV);
    assert.equal(res.status, 200);
    const data = await res.json() as any;

    assert.equal(data.success, true);
    assert.equal(data.plan, 'pro');
    assert.ok(data.accessUntil);

    // Verify accessUntil is ~7 days (168 hours) from now
    const nowMs = Date.now();
    const accessUntilMs = new Date(data.accessUntil).getTime();
    const diffHours = (accessUntilMs - nowMs) / (1000 * 60 * 60);
    assert.ok(diffHours >= 167 && diffHours <= 169, `Expected ~168 hours, got ${diffHours}`);

    // Verify Firestore subscription doc was saved
    const subDoc = state.firestoreSubscriptions.get('usr_eligible_1');
    assert.ok(subDoc);
    assert.equal(subDoc.status, 'trialing');
    assert.equal(subDoc.plan, 'pro');
    assert.equal(subDoc.trialClaimed, true);
    assert.ok(subDoc.trialStartedAt);
    assert.ok(subDoc.trialClaimedAt);

    // Zero Razorpay interactions
    assert.equal(state.razorpaySubscriptions.size, 0);
  });

  it('3. Rejects second trial attempt by same account UID with 403', async () => {
    // Simulate user who already claimed trial in their Firestore sub record
    state.firestoreSubscriptions.set('usr_repeat_1', {
      status: 'active',
      plan: 'trial',
      trialClaimed: true,
      trialStartedAt: new Date(Date.now() - 3600000).toISOString(),
      accessUntil: new Date(Date.now() + 86400000 * 6).toISOString(),
    });

    const token = await getToken('usr_repeat_1', 'photographer@studio.com');
    const req = new Request('https://crestflow.space/api/activate-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const res = await handleActivateTrial(req, TEST_ENV);
    assert.equal(res.status, 403);
    const data = await res.json() as any;
    assert.match(data.error, /Free trial already claimed for this account/i);
  });

  it('4. Rejects trial attempt by different account with same email address (anti-abuse)', async () => {
    // First user claims trial
    const token1 = await getToken('usr_original', 'editor@gmail.com');
    const req1 = new Request('https://crestflow.space/api/activate-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({}),
    });
    const res1 = await handleActivateTrial(req1, TEST_ENV);
    assert.equal(res1.status, 200);

    // Second user with same email (or dotted variation e.g. e.di.tor@gmail.com)
    const token2 = await getToken('usr_sybil', 'e.di.tor+promo@gmail.com');
    const req2 = new Request('https://crestflow.space/api/activate-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({}),
    });
    const res2 = await handleActivateTrial(req2, TEST_ENV);
    assert.equal(res2.status, 403);
    const data2 = await res2.json() as any;
    assert.match(data2.error, /already claimed for this Google account/i);
  });

  it('5. Rejects trial attempt by active paid subscriber with 409', async () => {
    // User already has an active paid monthly subscription
    state.firestoreSubscriptions.set('usr_paid_active', {
      status: 'active',
      plan: 'monthly',
      accessUntil: new Date(Date.now() + 86400000 * 25).toISOString(),
    });

    const token = await getToken('usr_paid_active', 'director@cinema.com');
    const req = new Request('https://crestflow.space/api/activate-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const res = await handleActivateTrial(req, TEST_ENV);
    assert.equal(res.status, 409);
    const data = await res.json() as any;
    assert.match(data.error, /already has an active subscription/i);
  });

  it('6. Trial countdown computes remaining days accurately and locks workspace immediately at 168h expiry', () => {
    const startMs = Date.parse('2026-11-18T10:00:00Z');
    const endIso = new Date(startMs + 7 * 24 * 60 * 60 * 1000).toISOString();
    const trialDoc = {
      userId: 'usr_trial_countdown',
      plan: 'pro' as any,
      billingCycle: 'trial' as any,
      status: 'trialing' as const,
      trialClaimed: true,
      trialEndsAt: endIso,
      accessUntil: endIso,
      updatedAt: startMs,
    };

    // Day 0 -> 7 days remaining
    const day0 = computeSubscriptionAccess({
      isSubscriptionFeatureEnabled: true,
      isWhitelisted: false,
      subscriptionDoc: trialDoc,
      serverMe: { serverNow: new Date(startMs).toISOString(), status: 'trialing', accessUntil: endIso, trialEndsAt: endIso, trialClaimed: true },
      clientNowMs: startMs,
    });
    assert.equal(day0.isTrialing, true);
    assert.equal(day0.hasAccess, true);
    assert.equal(day0.daysRemaining, 7);

    // After 7 days (168h + 1s) -> immediately locks workspace into TRIAL_EXPIRED
    const after7DaysMs = startMs + 7 * 24 * 60 * 60 * 1000 + 1000;
    const expired = computeSubscriptionAccess({
      isSubscriptionFeatureEnabled: true,
      isWhitelisted: false,
      subscriptionDoc: trialDoc,
      serverMe: { serverNow: new Date(startMs).toISOString(), status: 'trialing', accessUntil: endIso, trialEndsAt: endIso, trialClaimed: true },
      clientNowMs: after7DaysMs,
    });
    assert.equal(expired.hasAccess, false);
    assert.equal(expired.isTrialing, false);
    assert.equal(expired.daysRemaining, 0);
    assert.equal(expired.stateMachine, 'TRIAL_EXPIRED');
    assert.equal(expired.isTrialEligible, false);
  });

  it('7. GlobalHeader renders remaining trial days when on 7-day free trial', () => {
    const headerSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/GlobalHeader.tsx'), 'utf8');
    assert.match(headerSrc, /subscriptionState\.isTrialing/);
    assert.match(headerSrc, /Trial • \$\{subscriptionState\.daysRemaining\}/);
  });
});
