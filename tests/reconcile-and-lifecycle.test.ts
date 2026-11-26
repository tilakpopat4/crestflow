import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env } from '../worker/types';
import { MockWebhookState, createMockFetch, createMockIdToken } from './mockWebhookFetch';
import { handleCronReconciliation } from '../worker/reconcile';

describe('Entitlement Lifecycle, Cancellation & Cron Reconciliation Suite', () => {
  let originalFetch: typeof globalThis.fetch;
  let keyPair: crypto.KeyPairSyncResult<string, string>;
  let mockState: MockWebhookState;
  let testEnv: Env;

  before(() => {
    keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const jwk = crypto.createPublicKey(keyPair.privateKey).export({ format: 'jwk' }) as any;

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
      publicKeyJwk: { ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' },
    };
    globalThis.fetch = createMockFetch(mockState, originalFetch);

    testEnv = {
      ASSETS: { fetch: async () => new Response('Asset') },
      BASE_URL: 'https://crestflow.space',
      RAZORPAY_KEY_ID: 'rzp_test_key123',
      RAZORPAY_KEY_SECRET: 'rzp_test_secret123',
      RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_xyz',
      RAZORPAY_PLAN_MONTHLY: 'plan_monthly_123',
      RAZORPAY_PLAN_QUARTERLY: 'plan_quarterly_123',
      RAZORPAY_PLAN_YEARLY: 'plan_yearly_123',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: 'test-project',
        client_email: 'service-account@test-project.iam.gserviceaccount.com',
        private_key: keyPair.privateKey,
      }),
      TRIAL_LEDGER_PEPPER: 'test_pepper_9999',
      RESEND_API_KEY: 're_test_key_abc123',
      RESEND_FROM_EMAIL: 'CrestFlow <billing@crestflow.space>',
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    mockState.entitlements!.clear();
    mockState.cancellationsDetailed = [];
    mockState.sentEmails = [];
  });

  it('1. Cancellation (trialing): explains cardless trial has no auto-charge and preserves validUntil', async () => {
    const uid = 'user_trial_cancel';
    const validUntil = new Date(Date.now() + 5 * 86400 * 1000).toISOString();
    const token = createMockIdToken(uid, 'trialer@example.com', keyPair.privateKey);

    mockState.entitlements!.set(uid, {
      userId: uid,
      userEmail: 'trialer@example.com',
      plan: 'pro_trial',
      status: 'trialing',
      trialUsed: true,
      validUntil,
      cancelAtPeriodEnd: false,
    });

    const res = await worker.fetch(
      new Request('https://crestflow.space/api/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }),
      testEnv
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.status, 'trialing');
    assert.equal(body.cancelAtPeriodEnd, false);
    assert.equal(body.validUntil, validUntil);
    assert.equal(mockState.cancellationsDetailed.length, 0);
  });

  it('2. Cancellation (active subscription): cancels in Razorpay at cycle end (cycle_end=1) & retains validUntil', async () => {
    const uid = 'user_active_cancel';
    const validUntil = new Date(Date.now() + 20 * 86400 * 1000).toISOString();
    const token = createMockIdToken(uid, 'active@example.com', keyPair.privateKey);

    mockState.entitlements!.set(uid, {
      userId: uid,
      userEmail: 'active@example.com',
      plan: 'pro_monthly',
      billingCycle: 'monthly',
      status: 'active',
      checkoutMode: 'subscription',
      razorpaySubscriptionId: 'sub_active_rzp_1',
      validUntil,
      cancelAtPeriodEnd: false,
    });

    const res = await worker.fetch(
      new Request('https://crestflow.space/api/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }),
      testEnv
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.cancelAtPeriodEnd, true);

    const cancelCall = mockState.cancellationsDetailed.find((c) => c.subId === 'sub_active_rzp_1');
    assert.ok(cancelCall);
    assert.equal(cancelCall.cancelAtCycleEnd, 1);

    const updated = mockState.entitlements!.get(uid);
    assert.equal(updated.status, 'active');
    assert.equal(updated.cancelAtPeriodEnd, true);
    assert.equal(updated.validUntil, validUntil);
  });

  it('3. Plan Changes: rejected with PLAN_SWITCH_DISABLED during active period', async () => {
    const token = createMockIdToken('user_plan_change', 'changer@example.com', keyPair.privateKey);
    const res = await worker.fetch(
      new Request('https://crestflow.space/api/change-plan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanKey: 'yearly' }),
      }),
      testEnv
    );
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as any).code, 'PLAN_SWITCH_DISABLED');
  });

  it('4. Daily Cron Trigger: reconciles entitlements, expires past access, and sends emails idempotently', async () => {
    const nowMs = 1700000000000;

    mockState.entitlements!.set('user_expired', {
      userId: 'user_expired',
      userEmail: 'expired@example.com',
      userName: 'Expired User',
      status: 'active',
      plan: 'pro_monthly',
      validUntil: new Date(nowMs - 10000).toISOString(),
    });

    mockState.entitlements!.set('user_trial_day5', {
      userId: 'user_trial_day5',
      userEmail: 'day5@example.com',
      userName: 'Day5 User',
      status: 'trialing',
      plan: 'pro_trial',
      validUntil: new Date(nowMs + 40 * 3600 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    });

    mockState.entitlements!.set('user_charge_failed', {
      userId: 'user_charge_failed',
      userEmail: 'failed@example.com',
      userName: 'Failed User',
      status: 'grace',
      plan: 'pro_monthly',
      validUntil: new Date(nowMs + 2 * 86400 * 1000).toISOString(),
      graceUntil: new Date(nowMs + 2 * 86400 * 1000).toISOString(),
    });

    const stats = await handleCronReconciliation(testEnv, nowMs);
    assert.ok(stats.processed >= 3);
    assert.ok(stats.emailsSent >= 3);

    assert.equal(mockState.entitlements!.get('user_expired').status, 'expired');
    assert.ok(mockState.sentEmails.some((e) => e.to.includes('expired@example.com') && /expired/i.test(e.subject)));
    assert.ok(mockState.sentEmails.some((e) => e.to.includes('day5@example.com') && /2 days left/i.test(e.subject)));
    assert.ok(mockState.sentEmails.some((e) => e.to.includes('failed@example.com') && /Payment failed/i.test(e.subject)));

    const initialCount = mockState.sentEmails.length;
    const secondStats = await handleCronReconciliation(testEnv, nowMs);
    assert.equal(secondStats.emailsSent, 0);
    assert.equal(mockState.sentEmails.length, initialCount);
  });
});
