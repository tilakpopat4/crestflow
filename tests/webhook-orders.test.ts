import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { handleRazorpayWebhook } from '../worker/routes/webhook';
import { Env } from '../worker/types';
import { createMockFetch } from './mockWebhookFetch';

const state: any = {
  processedEvents: new Set<string>(),
  firestoreSubscriptions: new Map<string, any>(),
  entitlements: new Map<string, any>(),
  razorpaySubscriptions: new Map<string, any>(),
  refundedPayments: [],
  cancelledSubscriptions: [],
  cancellationsDetailed: [],
  sentEmails: [],
};

function generateWebhookSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
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
  state.entitlements.clear();
  state.razorpaySubscriptions.clear();
  globalThis.fetch = createMockFetch(state, originalFetch) as any;
});

describe('Razorpay Fallback Order Webhooks (TEST Mode Verification)', () => {
  it('1. order.paid: activates pro entitlement with order checkoutMode and validUntil', async () => {
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

    const req = new Request('http://localhost/api/razorpay-webhook', {
      method: 'POST',
      headers: { 'x-razorpay-signature': generateWebhookSignature(rawBody, TEST_SECRET) },
      body: rawBody,
    });

    const res = await handleRazorpayWebhook(req, TEST_ENV);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.entitlementStatus, 'active');
    assert.ok(data.validUntil);

    const saved = state.entitlements.get(userId);
    assert.strictEqual(saved.status, 'active');
    assert.strictEqual(saved.plan, 'pro_monthly');
    assert.strictEqual(saved.billingCycle, 'monthly');
    assert.strictEqual(saved.checkoutMode, 'order');
  });

  it('2. payment.captured: rejects legacy ₹1 fee orders and activates paid ₹699 yearly orders', async () => {
    const legacyBody = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_legacy_1rs',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: 'pay_1rs_old',
            order_id: 'order_1rs_old',
            status: 'captured',
            amount: 100,
            notes: { uid: 'usr_legacy_1', planKey: 'monthly' },
          },
        },
      },
    });
    const resLegacy = await handleRazorpayWebhook(
      new Request('http://localhost/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateWebhookSignature(legacyBody, TEST_SECRET) },
        body: legacyBody,
      }),
      TEST_ENV
    );
    assert.strictEqual(resLegacy.status, 200);
    assert.strictEqual((await resLegacy.json()).reason, 'amount below plan minimum');
    assert.strictEqual(state.entitlements.get('usr_legacy_1'), undefined);

    const yearlyBody = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_yearly_captured_1',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: 'pay_yearly_699',
            order_id: 'order_yearly_699',
            status: 'captured',
            amount: 69900,
            notes: { uid: 'usr_yearly_buyer', planKey: 'yearly', userEmail: 'yearly@crestflow.dev' },
          },
        },
      },
    });
    const resYearly = await handleRazorpayWebhook(
      new Request('http://localhost/api/razorpay-webhook', {
        method: 'POST',
        headers: { 'x-razorpay-signature': generateWebhookSignature(yearlyBody, TEST_SECRET) },
        body: yearlyBody,
      }),
      TEST_ENV
    );
    assert.strictEqual(resYearly.status, 200);
    const saved = state.entitlements.get('usr_yearly_buyer');
    assert.strictEqual(saved.status, 'active');
    assert.strictEqual(saved.plan, 'pro_yearly');
    assert.ok(new Date(saved.validUntil).getTime() > Date.now() + 360 * 86400 * 1000);
  });
});
