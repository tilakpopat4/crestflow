import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleActivateTrial } from '../worker/routes/trial';
import { computeEntitlementAccess } from '../src/lib/subscriptionStateUtils';
import { Env } from '../worker/types';
import { createMockFetch, MockWebhookState, createMockIdToken } from './mockWebhookFetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  state.entitlements!.clear();
  state.trialClaims!.clear();
  state.trialLedger.clear();
  state.razorpaySubscriptions.clear();
  state.refundedPayments = [];
  state.cancelledSubscriptions = [];

  const pubKeyObj = crypto.createPublicKey(testPrivateKeyPem);
  state.publicKeyJwk = { ...(pubKeyObj.export({ format: 'jwk' }) as any), kid: 'mock_kid', alg: 'RS256', use: 'sig' };
  globalThis.fetch = createMockFetch(state, originalFetch) as typeof fetch;
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
  });

  it('2. First-time eligible user activates 7-day trial with ₹0 cost, no card, and atomic trialClaims', async () => {
    const token = getToken('usr_eligible_1', 'designer@studio.com');
    const res = await handleActivateTrial(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      }),
      TEST_ENV
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.success, true);
    assert.equal(data.status, 'trialing');
    assert.equal(data.plan, 'pro_trial');
    assert.equal(data.trialUsed, true);
    assert.ok(data.validUntil);

    const diffHours = (new Date(data.validUntil).getTime() - Date.now()) / (1000 * 60 * 60);
    assert.ok(diffHours >= 167 && diffHours <= 169);

    const entDoc = state.entitlements!.get('usr_eligible_1');
    assert.ok(entDoc);
    assert.equal(entDoc.status, 'trialing');
    assert.equal(entDoc.trialUsed, true);
    assert.ok(state.trialClaims!.has('uid_usr_eligible_1'));
    assert.equal(state.razorpaySubscriptions.size, 0);
  });

  it('3. Rejects second trial attempt by same account UID with 403', async () => {
    state.entitlements!.set('usr_repeat_1', {
      userId: 'usr_repeat_1',
      status: 'expired',
      plan: 'pro_trial',
      trialUsed: true,
      trialStartedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      validUntil: new Date(Date.now() - 86400000).toISOString(),
    });

    const token = getToken('usr_repeat_1', 'photographer@studio.com');
    const res = await handleActivateTrial(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      }),
      TEST_ENV
    );
    assert.equal(res.status, 403);
    const data = (await res.json()) as any;
    assert.equal(data.code, 'TRIAL_ALREADY_CLAIMED');
  });

  it('4. Rejects trial attempt by different account with dotted/+tag email variant (anti-abuse)', async () => {
    const token1 = getToken('usr_original', 'editor@gmail.com');
    const res1 = await handleActivateTrial(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
        body: JSON.stringify({}),
      }),
      TEST_ENV
    );
    assert.equal(res1.status, 200);

    const token2 = getToken('usr_sybil', 'e.di.tor+promo@gmail.com');
    const res2 = await handleActivateTrial(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
        body: JSON.stringify({}),
      }),
      TEST_ENV
    );
    assert.equal(res2.status, 403);
    assert.equal(((await res2.json()) as any).code, 'TRIAL_ALREADY_CLAIMED');
  });

  it('5. Rejects trial attempt by active paid subscriber with 409', async () => {
    state.entitlements!.set('usr_paid_active', {
      userId: 'usr_paid_active',
      status: 'active',
      plan: 'pro_monthly',
      validUntil: new Date(Date.now() + 86400000 * 25).toISOString(),
    });

    const token = getToken('usr_paid_active', 'director@cinema.com');
    const res = await handleActivateTrial(
      new Request('https://crestflow.space/api/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      }),
      TEST_ENV
    );
    assert.equal(res.status, 409);
  });

  it('6. Trial countdown computes remaining days accurately and expires immediately at 168h boundary', () => {
    const startMs = Date.parse('2026-11-18T10:00:00Z');
    const endIso = new Date(startMs + 7 * 24 * 60 * 60 * 1000).toISOString();
    const trialDoc = {
      userId: 'usr_trial_countdown',
      plan: 'pro_trial',
      billingCycle: 'trial',
      status: 'trialing',
      trialUsed: true,
      trialStartedAt: new Date(startMs).toISOString(),
      validUntil: endIso,
    };

    const day0 = computeEntitlementAccess({ entitlementDoc: trialDoc, serverNow: startMs });
    assert.equal(day0.state, 'trialing');
    assert.equal(day0.canWrite, true);
    assert.equal(day0.daysLeft, 7);

    const after7DaysMs = startMs + 7 * 24 * 60 * 60 * 1000 + 1000;
    const expired = computeEntitlementAccess({ entitlementDoc: trialDoc, serverNow: after7DaysMs });
    assert.equal(expired.canWrite, false);
    assert.equal(expired.state, 'expired');
    assert.equal(expired.daysLeft, 0);
  });

  it('7. AccessStatusBadgeButton renders Trial countdown in GlobalHeader', () => {
    const badgeSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/header/AccessStatusBadgeButton.tsx'), 'utf8');
    const headerSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/GlobalHeader.tsx'), 'utf8');
    assert.ok(headerSrc.includes('AccessStatusBadgeButton'));
    assert.match(badgeSrc, /Trial: \$\{access\.daysLeft\}/);
  });
});
