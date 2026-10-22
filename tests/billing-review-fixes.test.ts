import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/index';
import { Env } from '../worker/types';
import { MockWebhookState, createMockFetch } from './mockWebhookFetch';
import { hashIdentifier, normalizeGoogleEmail, normalizeUpiVpa } from '../worker/trialLedger';

function generateSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  return hmac.digest('hex');
}

describe('Billing Review Fixes Verification Suite', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockState: MockWebhookState;
  let testEnv: Env;
  const TEST_WEBHOOK_SECRET = 'rzp_webhook_secret_review';
  const TEST_CRON_SECRET = 'cron_secret_high_entropy_9988';
  const TEST_PEPPER = 'test_pepper_val';

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
      TRIAL_LEDGER_PEPPER: TEST_PEPPER,
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

  it('1. Grace period: set graceUntil ONCE (periodEnd + 3 days) and 3 repeated failures do not extend it', async () => {
    const subId = 'sub_grace_test_1';
    const userId = 'usr_grace_1';
    const periodEndSec = 1774345200; // fixed future timestamp
    const expectedInitialGraceMs = periodEndSec * 1000 + 3 * 24 * 60 * 60 * 1000;
    const expectedInitialGraceIso = new Date(expectedInitialGraceMs).toISOString();

    mockState.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'pending',
      current_end: periodEndSec,
      notes: { uid: userId },
    });

    // Failure 1 (Day 0)
    const body1 = JSON.stringify({
      event: 'payment.failed',
      event_id: 'evt_fail_1',
      created_at: periodEndSec + 10,
      payload: { subscription: { entity: { id: subId } } },
    });
    const res1 = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(body1, TEST_WEBHOOK_SECRET) },
        body: body1,
      }),
      testEnv
    );
    assert.equal(res1.status, 200);

    const subAfterFail1 = mockState.firestoreSubscriptions.get(userId);
    assert.equal(subAfterFail1.status, 'past_due');
    assert.equal(subAfterFail1.graceUntil, expectedInitialGraceIso);
    assert.equal(subAfterFail1.accessUntil, expectedInitialGraceIso);

    // Failure 2 (Day 1 retry)
    const body2 = JSON.stringify({
      event: 'payment.failed',
      event_id: 'evt_fail_2',
      created_at: periodEndSec + 86400,
      payload: { subscription: { entity: { id: subId } } },
    });
    const res2 = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(body2, TEST_WEBHOOK_SECRET) },
        body: body2,
      }),
      testEnv
    );
    assert.equal(res2.status, 200);

    const subAfterFail2 = mockState.firestoreSubscriptions.get(userId);
    assert.equal(subAfterFail2.graceUntil, expectedInitialGraceIso, 'Grace period must NOT extend on retry 2');
    assert.equal(subAfterFail2.accessUntil, expectedInitialGraceIso);

    // Failure 3 (Day 2 retry)
    const body3 = JSON.stringify({
      event: 'payment.failed',
      event_id: 'evt_fail_3',
      created_at: periodEndSec + 2 * 86400,
      payload: { subscription: { entity: { id: subId } } },
    });
    const res3 = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(body3, TEST_WEBHOOK_SECRET) },
        body: body3,
      }),
      testEnv
    );
    assert.equal(res3.status, 200);

    const subAfterFail3 = mockState.firestoreSubscriptions.get(userId);
    assert.equal(subAfterFail3.graceUntil, expectedInitialGraceIso, 'Grace period must NOT extend on retry 3');
    assert.equal(subAfterFail3.accessUntil, expectedInitialGraceIso);
  });

  it('2. Trial: grant trialing only after ₹1 payment captured & trialEndsAt equals subscription start_at', async () => {
    const subId = 'sub_trial_capture_1';
    const userId = 'usr_trial_capture_1';
    // Short start_at in test mode (e.g. 10 minutes in the future)
    const shortStartAtSec = Math.floor(Date.now() / 1000) + 600;
    const expectedTrialEndsAtIso = new Date(shortStartAtSec * 1000).toISOString();

    mockState.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'authenticated',
      start_at: shortStartAtSec,
      paid_count: 0,
      notes: { uid: userId },
    });

    // Step A: subscription.authenticated WITHOUT payment captured
    const uncapturedBody = JSON.stringify({
      event: 'subscription.authenticated',
      event_id: 'evt_uncaptured_1',
      payload: {
        subscription: { entity: { id: subId } },
        payment: { entity: { id: 'pay_init_1', status: 'authorized' } },
      },
    });
    const resA = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(uncapturedBody, TEST_WEBHOOK_SECRET) },
        body: uncapturedBody,
      }),
      testEnv
    );
    assert.equal(resA.status, 200);
    const subUncaptured = mockState.firestoreSubscriptions.get(userId);
    assert.equal(subUncaptured.status, 'pending', 'Must NOT grant trialing before payment is confirmed captured');

    // Step B: payment.captured confirms ₹1 payment
    mockState.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'authenticated',
      start_at: shortStartAtSec,
      paid_count: 1,
      notes: { uid: userId },
    });
    const capturedBody = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_captured_1',
      payload: {
        subscription: { entity: { id: subId } },
        payment: { entity: { id: 'pay_init_1', status: 'captured', amount: 100 } },
      },
    });
    const resB = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(capturedBody, TEST_WEBHOOK_SECRET) },
        body: capturedBody,
      }),
      testEnv
    );
    assert.equal(resB.status, 200);

    const subCaptured = mockState.firestoreSubscriptions.get(userId);
    assert.equal(subCaptured.status, 'trialing');
    assert.equal(subCaptured.trialEndsAt, expectedTrialEndsAtIso, 'trialEndsAt must equal subscription start_at');
    assert.equal(subCaptured.accessUntil, expectedTrialEndsAtIso);
  });

  it('3. Trial Abuse: duplicate email revokes access immediately, cancels subscription, and refunds ₹1', async () => {
    const subId = 'sub_email_abuse_1';
    const attackerUid = 'usr_attacker_email';
    const victimUid = 'usr_legit_user';
    const email = 'tilakpopat@gmail.com';

    // Seed email hash in trial_ledger as used by legitimate user
    const emailHash = await hashIdentifier(normalizeGoogleEmail(email), TEST_PEPPER);
    mockState.trialLedger.set(emailHash, {
      hash: emailHash,
      type: 'email',
      status: 'used',
      claimedByUid: victimUid,
    });

    mockState.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'authenticated',
      notes: { uid: attackerUid, userEmail: email },
    });

    const body = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_email_abuse_payment',
      payload: {
        subscription: { entity: { id: subId } },
        payment: { entity: { id: 'pay_email_abuse', amount: 100, email, status: 'captured' } },
      },
    });

    const res = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(body, TEST_WEBHOOK_SECRET) },
        body,
      }),
      testEnv
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'abused');

    // Verify subscription cancelled in Razorpay
    assert.ok(mockState.cancelledSubscriptions.includes(subId), 'Subscription must be cancelled in Razorpay');
    // Verify ₹1 refunded
    const refund = mockState.refundedPayments.find((r) => r.paymentId === 'pay_email_abuse');
    assert.ok(refund, '₹1 verification payment must be refunded');
    assert.equal(refund!.amount, 100);

    // Verify access revoked in Firestore
    const sub = mockState.firestoreSubscriptions.get(attackerUid);
    assert.equal(sub.status, 'expired');
    assert.ok(new Date(sub.accessUntil).getTime() < Date.now());
  });

  it('4. Trial Abuse: duplicate UPI VPA revokes access immediately, cancels subscription, and refunds ₹1', async () => {
    const subId = 'sub_vpa_abuse_review_1';
    const attackerUid = 'usr_attacker_vpa_review';
    const victimUid = 'usr_legit_vpa_user';
    const upiVpa = 'attacker@okaxis';

    // Seed VPA hash in trial_ledger as used by legitimate user
    const vpaHash = await hashIdentifier(normalizeUpiVpa(upiVpa), TEST_PEPPER);
    mockState.trialLedger.set(vpaHash, {
      hash: vpaHash,
      type: 'vpa',
      status: 'used',
      claimedByUid: victimUid,
    });

    mockState.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'authenticated',
      notes: { uid: attackerUid },
    });

    const body = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_vpa_abuse_review_payment',
      payload: {
        subscription: { entity: { id: subId } },
        payment: { entity: { id: 'pay_vpa_abuse_review', amount: 100, vpa: upiVpa, status: 'captured' } },
      },
    });

    const res = await worker.fetch(
      new Request('https://crestflow.app/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateSignature(body, TEST_WEBHOOK_SECRET) },
        body,
      }),
      testEnv
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'abused');

    // Verify subscription cancelled in Razorpay
    assert.ok(mockState.cancelledSubscriptions.includes(subId), 'Subscription must be cancelled in Razorpay');
    // Verify ₹1 refunded
    const refund = mockState.refundedPayments.find((r) => r.paymentId === 'pay_vpa_abuse_review');
    assert.ok(refund, '₹1 verification payment must be refunded');
    assert.equal(refund!.amount, 100);

    // Verify access revoked in Firestore
    const sub = mockState.firestoreSubscriptions.get(attackerUid);
    assert.equal(sub.status, 'expired');
    assert.ok(new Date(sub.accessUntil).getTime() < Date.now());
  });
});

