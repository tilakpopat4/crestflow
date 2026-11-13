import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { handleRazorpayWebhook } from '../worker/routes/webhook';
import { Env } from '../worker/types';
import { createMockFetch, MockWebhookState } from './mockWebhookFetch';

const state: any = {
  processedEvents: new Set<string>(),
  firestoreSubscriptions: new Map<string, any>(),
  razorpaySubscriptions: new Map<string, any>(),
  sentEmails: [],
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

const TEST_SECRET = 'rzp_test_secret_orders';
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

describe('Razorpay Standard Checkout Order Webhooks (Live Connection)', () => {
  it('1. order.paid: successfully activates pro subscription and sets accessUntil', async () => {
    const orderId = 'order_live_123';
    const userId = 'usr_live_buyer_1';

    const rawBody = JSON.stringify({
      event: 'order.paid',
      event_id: 'evt_order_paid_live_1',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        order: {
          entity: {
            id: orderId,
            amount: 7900,
            status: 'paid',
            notes: { uid: userId, planKey: 'monthly', userEmail: 'buyer@crestflow.dev' },
          },
        },
        payment: {
          entity: {
            id: 'pay_live_456',
            order_id: orderId,
            status: 'captured',
            amount: 7900,
            method: 'upi',
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
    assert.strictEqual(data.subscriptionStatus, 'active');
    assert.ok(data.accessUntil);

    const accessUntilMs = new Date(data.accessUntil).getTime();
    assert.ok(accessUntilMs > Date.now() + 25 * 86400 * 1000);

    const saved = state.firestoreSubscriptions.get(userId);
    assert.strictEqual(saved.status, 'active');
    assert.strictEqual(saved.plan, 'pro');
    assert.strictEqual(saved.billingCycle, 'monthly');
  });

  it('2. payment.captured: grants 7-day trial access for ₹1 order payment', async () => {
    const paymentId = 'pay_trial_live_1';
    const userId = 'usr_trial_buyer_2';

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_trial_captured_live_2',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: 'order_trial_live_2',
            status: 'captured',
            amount: 100,
            notes: { uid: userId, planKey: 'trial', userEmail: 'trial@crestflow.dev' },
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
    assert.strictEqual(data.subscriptionStatus, 'trialing');
    assert.ok(data.accessUntil);

    const saved = state.firestoreSubscriptions.get(userId);
    assert.strictEqual(saved.status, 'trialing');
    assert.strictEqual(saved.hasHadTrial, true);
  });
});
