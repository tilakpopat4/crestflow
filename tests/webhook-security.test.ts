import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { handleRazorpayWebhook } from '../worker/routes/webhook';
import { Env } from '../worker/types';
import { createMockFetch, MockWebhookState } from './mockWebhookFetch';

const state: MockWebhookState = {
  processedEvents: new Set<string>(),
  firestoreSubscriptions: new Map<string, any>(),
  razorpaySubscriptions: new Map<string, any>(),
};

function generateWebhookSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  return hmac.digest('hex');
}

const { privateKey: testPrivateKeyPem } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const TEST_SECRET = 'rzp_test_secret_123456';
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
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  state.processedEvents.clear();
  state.firestoreSubscriptions.clear();
  state.razorpaySubscriptions.clear();
  globalThis.fetch = createMockFetch(state, originalFetch) as any;
});

describe('POST /api/razorpay-webhook Security & State Machine', () => {
  it('1. Forged Signature: Request with invalid or altered signature is rejected (400)', async () => {
    const rawBody = JSON.stringify({ event: 'subscription.charged', event_id: 'evt_forged_1' });
    const forgedSignature = 'c0ffee0000000000000000000000000000000000000000000000000000000000';

    const req = new Request('http://localhost/api/razorpay-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': forgedSignature,
      },
      body: rawBody,
    });

    const res = await handleRazorpayWebhook(req, TEST_ENV);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid webhook signature');
  });

  it('2. Replayed Event: Repeated event ID is deduplicated and returns 200 fast without mutating', async () => {
    const eventId = 'evt_duplicate_test_100';
    const subId = 'sub_test_dup_1';
    const userId = 'user_dup_123';

    state.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'active',
      current_start: 1700000000,
      current_end: 1702592000,
      notes: { uid: userId },
    });

    const rawBody = JSON.stringify({
      event: 'subscription.activated',
      event_id: eventId,
      created_at: 1700000000,
      payload: {
        subscription: { entity: { id: subId } },
      },
    });

    const signature = generateWebhookSignature(rawBody, TEST_SECRET);

    const req1 = new Request('http://localhost/api/razorpay-webhook', {
      method: 'POST',
      headers: { 'x-razorpay-signature': signature },
      body: rawBody,
    });
    const res1 = await handleRazorpayWebhook(req1, TEST_ENV);
    assert.strictEqual(res1.status, 200);
    const data1 = await res1.json();
    assert.strictEqual(data1.status, 'ok');
    assert.strictEqual(data1.duplicate, undefined);

    const req2 = new Request('http://localhost/api/razorpay-webhook', {
      method: 'POST',
      headers: { 'x-razorpay-signature': signature },
      body: rawBody,
    });
    const res2 = await handleRazorpayWebhook(req2, TEST_ENV);
    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.strictEqual(data2.duplicate, true, 'Replayed event must return duplicate: true');
  });

  it('3. Wrong or Missing UID: Re-fetched subscription with missing notes.uid is ignored', async () => {
    const subId = 'sub_no_uid';

    state.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'active',
      notes: {},
    });

    const rawBody = JSON.stringify({
      event: 'subscription.charged',
      event_id: 'evt_no_uid_1',
      payload: {
        subscription: { entity: { id: subId } },
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
    assert.strictEqual(data.status, 'ignored');
    assert.strictEqual(data.reason, 'missing notes.uid');
  });

  it('4. Out-of-order Events: Older event arriving after newer event does not revert state', async () => {
    const subId = 'sub_ooo_test';
    const userId = 'user_ooo_456';

    state.firestoreSubscriptions.set(userId, {
      userId,
      status: 'active',
      lastEventTimestamp: 2000000000,
    });

    state.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'pending',
      notes: { uid: userId },
    });

    const rawBody = JSON.stringify({
      event: 'subscription.pending',
      event_id: 'evt_stale_1',
      created_at: 1000000,
      payload: {
        subscription: { entity: { id: subId } },
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
    assert.strictEqual(data.ignored, 'out-of-order event');
    assert.strictEqual(state.firestoreSubscriptions.get(userId).status, 'active');
  });

  it('5. State Transitions per BILLING_SPEC: pending sets past_due with 3-day grace period', async () => {
    const subId = 'sub_pending_grace';
    const userId = 'user_grace_789';

    state.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'pending',
      notes: { uid: userId },
    });

    const rawBody = JSON.stringify({
      event: 'subscription.pending',
      event_id: 'evt_grace_1',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        subscription: { entity: { id: subId } },
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
    assert.strictEqual(data.subscriptionStatus, 'past_due');

    const accessUntilTime = new Date(data.accessUntil).getTime();
    const expectedMinGrace = Date.now() + 2 * 24 * 60 * 60 * 1000;
    assert.ok(accessUntilTime > expectedMinGrace, 'accessUntil must be granted during 3-day grace period');
  });

  it('6. State Transitions per BILLING_SPEC: halted sets status expired immediately', async () => {
    const subId = 'sub_halted_1';
    const userId = 'user_halted_1';

    state.razorpaySubscriptions.set(subId, {
      id: subId,
      status: 'halted',
      notes: { uid: userId },
    });

    const rawBody = JSON.stringify({
      event: 'subscription.halted',
      event_id: 'evt_halt_1',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        subscription: { entity: { id: subId } },
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
    assert.strictEqual(data.subscriptionStatus, 'expired');
    const accessUntilTime = new Date(data.accessUntil).getTime();
    assert.ok(accessUntilTime < Date.now(), 'accessUntil must be in the past for expired subscriptions');
  });
});
