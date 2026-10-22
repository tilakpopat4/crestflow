import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { handleCreateSubscription } from '../worker/routes/subscription';
import { handleRazorpayWebhook } from '../worker/routes/webhook';
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

function generateWebhookSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  return hmac.digest('hex');
}

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

    // Mock Razorpay Subscriptions creation POST /v1/subscriptions
    if (urlStr.includes('api.razorpay.com/v1/subscriptions') && init?.method === 'POST' && !urlStr.endsWith('/cancel')) {
      const body = JSON.parse((init.body as string) || '{}');
      const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const subObj = {
        id: subId,
        status: 'created',
        notes: body.notes,
        current_start: body.start_at || Math.floor(Date.now() / 1000),
        current_end: (body.start_at || Math.floor(Date.now() / 1000)) + 30 * 86400,
      };
      state.razorpaySubscriptions.set(subId, subObj);
      return new Response(JSON.stringify(subObj), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return mockNetwork(input, init);
  }) as any;
});

describe('Trial Ledger Anti-Abuse & Anti-Bypass Suite', () => {
  it('1. Email Normalization: Strips Gmail dots and +tags consistently', () => {
    assert.strictEqual(normalizeGoogleEmail('Tilak.Popat@gmail.com'), 'tilakpopat@gmail.com');
    assert.strictEqual(normalizeGoogleEmail('tilak.popat+freelance@googlemail.com'), 'tilakpopat@gmail.com');
    assert.strictEqual(normalizeGoogleEmail('T.I.L.A.K+12345@GMAIL.COM'), 'tilak@gmail.com');
    assert.strictEqual(normalizeUpiVpa(' Tilak@OkAxis '), 'tilak@okaxis');
  });

  it('2. Second Account with Dotted/Tagged Email: Denied trial creation', async () => {
    // 1st account used trial previously with clean email
    const originalEmail = 'tilakpopat@gmail.com';
    const emailHash = await hashIdentifier(normalizeGoogleEmail(originalEmail), TEST_PEPPER);

    // Mark as used in trial_ledger
    state.trialLedger.set(emailHash, {
      hash: emailHash,
      status: 'used',
      claimedByUid: 'user_orig_1',
      usedAt: Date.now() - 86400000,
    });

    // 2nd account signs in with dots and +tags
    const duplicateEmail = 't.i.l.a.k.popat+bonus@gmail.com';
    const token = getToken('user_attacker_2', duplicateEmail);

    const req = new Request('http://localhost/api/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planKey: 'monthly' }),
    });

    const res = await handleCreateSubscription(req, TEST_ENV);
    assert.strictEqual(res.status, 403, 'Second account with same normalized email must be denied trial');
    const data = await res.json();
    assert.ok(data.error.includes('Free trial already claimed'));
  });

  it('3. Same VPA Abuse Detected After Payment: Cancels subscription and refunds ₹1', async () => {
    const usedVpa = 'tilakfilms@okaxis';
    const vpaHash = await hashIdentifier(normalizeUpiVpa(usedVpa), TEST_PEPPER);

    // VPA was already claimed by user_legit_1
    state.trialLedger.set(vpaHash, {
      hash: vpaHash,
      status: 'used',
      claimedByUid: 'user_legit_1',
      usedAt: Date.now() - 100000,
    });

    // Attacker signs up with a different fresh email, but pays using the SAME VPA
    const subId = 'sub_abuse_vpa_test';
    const attackerUid = 'user_attacker_vpa';
    state.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'authenticated',
      notes: { uid: attackerUid, userEmail: 'newfreshuser@yahoo.com' },
    });

    const rawBody = JSON.stringify({
      event: 'subscription.authenticated',
      event_id: 'evt_vpa_abuse_1',
      payload: {
        subscription: { entity: { id: subId } },
        payment: {
          entity: {
            id: 'pay_vpa_abuse_999',
            vpa: usedVpa, // Already used VPA
            amount: 100, // ₹1
          },
        },
      },
    });

    const signature = generateWebhookSignature(rawBody, TEST_SECRET);
    const req = new Request('http://localhost/api/razorpay-webhook', {
      method: 'POST',
      headers: { 'x-razorpay-signature': signature },
      body: rawBody,
    });

    const res = await handleRazorpayWebhook(req, TEST_ENV);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.status, 'abused', 'Abuse must be detected');
    assert.strictEqual(data.action, 'cancelled_and_refunded');

    // Verify subscription was cancelled in Razorpay
    assert.ok(state.cancelledSubscriptions.includes(subId), 'Subscription must be cancelled');

    // Verify ₹1 refund was issued
    const refund = state.refundedPayments.find((r) => r.paymentId === 'pay_vpa_abuse_999');
    assert.ok(refund, '₹1 refund must be triggered');
    assert.strictEqual(refund.amount, 100);

    // Verify user is marked expired in Firestore
    const userSub = state.firestoreSubscriptions.get(attackerUid);
    assert.strictEqual(userSub.status, 'expired', 'User subscription must be expired immediately');
  });

  it('4. Double-Click Race Condition: Simultaneous trial reservations handle lock safely', async () => {
    const email = 'speedy@gmail.com';
    const token = getToken('user_racer_1', email);

    const makeRequest = () =>
      new Request('http://localhost/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planKey: 'monthly' }),
      });

    // Fire two requests concurrently
    const [res1, res2] = await Promise.all([
      handleCreateSubscription(makeRequest(), TEST_ENV),
      handleCreateSubscription(makeRequest(), TEST_ENV),
    ]);

    // One must succeed, the other is handled idempotently or rejected by concurrency lock
    assert.ok([200, 429].includes(res1.status));
    assert.ok([200, 429].includes(res2.status));
  });

  it('5. Returning User: User with past subscription history starts immediately without trial', async () => {
    const returningUid = 'user_returning_99';
    state.firestoreSubscriptions.set(returningUid, {
      userId: returningUid,
      status: 'expired',
      hasHadSubscription: true,
    });

    const token = getToken(returningUid, 'returning@gmail.com');
    const req = new Request('http://localhost/api/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planKey: 'monthly' }),
    });

    const res = await handleCreateSubscription(req, TEST_ENV);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.isFirstTime, false, 'Returning user must not get trial addon');
  });

  it('6. Expired Unpaid Reservation: Releases after 30 minutes for new attempt', async () => {
    const email = 'abandoned@gmail.com';
    const emailHash = await hashIdentifier(normalizeGoogleEmail(email), TEST_PEPPER);

    // Set an unpaid reservation that was created 45 minutes ago (expired > 30m)
    state.trialLedger.set(emailHash, {
      hash: emailHash,
      status: 'reserved',
      claimedByUid: 'user_abandoned_1',
      reservedAt: Date.now() - 45 * 60 * 1000,
      expiresAt: Date.now() - 15 * 60 * 1000, // Expired 15 mins ago
    });

    // User attempts reservation again
    const token = getToken('user_abandoned_1', email);
    const req = new Request('http://localhost/api/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planKey: 'monthly' }),
    });

    const res = await handleCreateSubscription(req, TEST_ENV);
    assert.strictEqual(res.status, 200, 'Expired reservation must be released and allowed');
    const data = await res.json();
    assert.strictEqual(data.isFirstTime, true);
  });
});
