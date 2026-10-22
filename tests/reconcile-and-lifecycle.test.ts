import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env, SubscriptionRecord } from '../worker/types';
import {
  MockWebhookState,
  createMockFetch,
  createMockIdToken,
} from './mockWebhookFetch';
import { handleCronReconciliation } from '../worker/reconcile';

describe('Subscription Lifecycle, Plan Changes & Cron Reconciliation Suite', () => {
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

    const pubKeyObj = crypto.createPublicKey(keyPair.privateKey);
    const jwk = pubKeyObj.export({ format: 'jwk' }) as any;

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
      publicKeyJwk: { ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' },
    };

    globalThis.fetch = createMockFetch(mockState, originalFetch);

    testEnv = {
      ASSETS: { fetch: async () => new Response('Asset') },
      RAZORPAY_KEY_ID: 'rzp_test_key123',
      RAZORPAY_KEY_SECRET: 'rzp_test_secret123',
      RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_xyz',
      RAZORPAY_PLAN_MONTHLY: 'plan_monthly_123',
      RAZORPAY_PLAN_QUARTERLY: 'plan_quarterly_123',
      RAZORPAY_PLAN_HALF: 'plan_half_123',
      RAZORPAY_PLAN_YEARLY: 'plan_yearly_123',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: 'test-project',
        client_email: 'service-account@test-project.iam.gserviceaccount.com',
        private_key: keyPair.privateKey,
      }),
      TRIAL_LEDGER_PEPPER: 'test_pepper_9999',
      RESEND_API_KEY: 're_test_key_abc123',
      RESEND_FROM_EMAIL: 'CrestFlow <billing@crestflow.com>',
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. Cancellation (trialing): cancels in Razorpay immediately (cycle_end=0) but preserves access until trialEndsAt', async () => {
    const uid = 'user_trial_cancel';
    const trialEndsAt = new Date(Date.now() + 5 * 86400 * 1000).toISOString();
    const token = createMockIdToken(uid, 'trialer@example.com', keyPair.privateKey);

    mockState.firestoreSubscriptions.set(uid, {
      userId: uid,
      userEmail: 'trialer@example.com',
      plan: 'pro',
      status: 'trialing',
      razorpaySubscriptionId: 'sub_trial_rzp_1',
      trialEndsAt,
      accessUntil: trialEndsAt,
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });

    const res = await worker.fetch(
      new Request('https://crestflow.com/api/cancel-subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      testEnv
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.isTrialing, true);
    assert.equal(body.accessUntil, trialEndsAt);

    // Assert Razorpay was called with cancel_at_cycle_end: 0
    const cancelCall = mockState.cancellationsDetailed.find((c) => c.subId === 'sub_trial_rzp_1');
    assert.ok(cancelCall);
    assert.equal(cancelCall.cancelAtCycleEnd, 0);

    // Assert Firestore record has cancelled status and preserved accessUntil
    const updated = mockState.firestoreSubscriptions.get(uid);
    assert.equal(updated.status, 'cancelled');
    assert.equal(updated.cancelAtPeriodEnd, true);
    assert.equal(updated.accessUntil, trialEndsAt);
  });

  it('2. Cancellation (active): cancels in Razorpay at cycle end (cycle_end=1)', async () => {
    const uid = 'user_active_cancel';
    const cycleEndMs = Date.now() + 20 * 86400 * 1000;
    const accessUntil = new Date(cycleEndMs).toISOString();
    const token = createMockIdToken(uid, 'active@example.com', keyPair.privateKey);

    mockState.firestoreSubscriptions.set(uid, {
      userId: uid,
      userEmail: 'active@example.com',
      plan: 'monthly',
      status: 'active',
      razorpaySubscriptionId: 'sub_active_rzp_1',
      currentPeriodEnd: cycleEndMs,
      accessUntil,
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });

    const res = await worker.fetch(
      new Request('https://crestflow.com/api/cancel-subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      testEnv
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.isTrialing, false);

    // Assert Razorpay was called with cancel_at_cycle_end: 1
    const cancelCall = mockState.cancellationsDetailed.find((c) => c.subId === 'sub_active_rzp_1');
    assert.ok(cancelCall);
    assert.equal(cancelCall.cancelAtCycleEnd, 1);

    const updated = mockState.firestoreSubscriptions.get(uid);
    assert.equal(updated.status, 'cancelled');
    assert.equal(updated.cancelAtPeriodEnd, true);
    assert.equal(updated.accessUntil, accessUntil);
  });

  it('3. Plan Changes: cancels at period end and creates new subscription with start_at at that date', async () => {
    const uid = 'user_plan_change';
    const currentEndSec = Math.floor(Date.now() / 1000) + 15 * 86400;
    const token = createMockIdToken(uid, 'changer@example.com', keyPair.privateKey);

    mockState.firestoreSubscriptions.set(uid, {
      userId: uid,
      userEmail: 'changer@example.com',
      plan: 'monthly',
      status: 'active',
      razorpaySubscriptionId: 'sub_monthly_orig',
      currentPeriodEnd: currentEndSec * 1000,
      accessUntil: new Date(currentEndSec * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });

    const res = await worker.fetch(
      new Request('https://crestflow.com/api/change-plan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPlanKey: 'yearly' }),
      }),
      testEnv
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.newPlan, 'yearly');
    assert.ok(body.newSubscriptionId);

    // Assert existing sub was cancelled at cycle end
    const cancelCall = mockState.cancellationsDetailed.find((c) => c.subId === 'sub_monthly_orig');
    assert.ok(cancelCall);
    assert.equal(cancelCall.cancelAtCycleEnd, 1);

    // Assert new sub was created with start_at at period end
    const newRzpSub = mockState.razorpaySubscriptions.get(body.newSubscriptionId);
    assert.ok(newRzpSub);
    assert.equal(newRzpSub.plan_id, testEnv.RAZORPAY_PLAN_YEARLY);
    assert.equal(newRzpSub.start_at, currentEndSec);

    // Assert Firestore has pendingPlanChange registered
    const updated = mockState.firestoreSubscriptions.get(uid);
    assert.ok(updated.pendingPlanChange);
    assert.equal(updated.pendingPlanChange.newPlan, 'yearly');
    assert.equal(updated.pendingPlanChange.newSubscriptionId, body.newSubscriptionId);
  });

  it('4. Daily Cron Trigger: reconciles subscriptions, expires past access, and sends Resend emails', async () => {
    mockState.sentEmails = [];
    mockState.firestoreSubscriptions.clear();
    const nowMs = 1700000000000;

    // Sub 1: Expired access
    mockState.firestoreSubscriptions.set('user_expired', {
      userId: 'user_expired',
      userEmail: 'expired@example.com',
      userName: 'Expired User',
      status: 'active',
      accessUntil: new Date(nowMs - 10000).toISOString(),
    });

    // Sub 2: Trial day 5 (2 days remaining on 7d trial: 40h remaining)
    mockState.firestoreSubscriptions.set('user_trial_day5', {
      userId: 'user_trial_day5',
      userEmail: 'day5@example.com',
      userName: 'Day5 User',
      status: 'trialing',
      trialEndsAt: new Date(nowMs + 40 * 3600 * 1000).toISOString(),
      accessUntil: new Date(nowMs + 40 * 3600 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    });

    // Sub 3: 24h before first charge (18h remaining on trial)
    mockState.firestoreSubscriptions.set('user_charge_24h', {
      userId: 'user_charge_24h',
      userEmail: 'charge24h@example.com',
      userName: 'Charge24h User',
      plan: 'pro_monthly',
      status: 'trialing',
      trialEndsAt: new Date(nowMs + 18 * 3600 * 1000).toISOString(),
      accessUntil: new Date(nowMs + 18 * 3600 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    });

    // Sub 4: Charge failed / past due
    mockState.firestoreSubscriptions.set('user_charge_failed', {
      userId: 'user_charge_failed',
      userEmail: 'failed@example.com',
      userName: 'Failed User',
      status: 'past_due',
      accessUntil: new Date(nowMs + 2 * 86400 * 1000).toISOString(),
    });

    const stats = await handleCronReconciliation(testEnv, nowMs);
    assert.ok(stats.processed >= 4);
    assert.ok(stats.emailsSent >= 4);

    // Verify Expired
    assert.equal(mockState.firestoreSubscriptions.get('user_expired').status, 'expired');
    const expiredEmail = mockState.sentEmails.find((e) => e.to.includes('expired@example.com'));
    assert.ok(expiredEmail);
    assert.match(expiredEmail.subject, /subscription has expired/i);

    // Verify Day 5 email
    const day5Email = mockState.sentEmails.find((e) => e.to.includes('day5@example.com'));
    assert.ok(day5Email);
    assert.match(day5Email.subject, /trial ends in 2 days/i);
    assert.equal(mockState.firestoreSubscriptions.get('user_trial_day5').notifiedTrialDay5, true);

    // Verify 24h charge email
    const charge24Email = mockState.sentEmails.find((e) => e.to.includes('charge24h@example.com'));
    assert.ok(charge24Email);
    assert.match(charge24Email.subject, /subscription begins tomorrow/i);
    assert.equal(mockState.firestoreSubscriptions.get('user_charge_24h').notifiedCharge24h, true);

    // Verify Charge failed email
    const failedEmail = mockState.sentEmails.find((e) => e.to.includes('failed@example.com'));
    assert.ok(failedEmail);
    assert.match(failedEmail.subject, /payment failed/i);
    assert.equal(mockState.firestoreSubscriptions.get('user_charge_failed').notifiedChargeFailed, true);

    // Test Deduplication: Re-running cron should not re-send emails
    const initialEmailCount = mockState.sentEmails.length;
    const secondStats = await handleCronReconciliation(testEnv, nowMs);
    assert.equal(secondStats.emailsSent, 0);
    assert.equal(mockState.sentEmails.length, initialEmailCount);
  });
});
