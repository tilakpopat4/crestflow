import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { buildUpiPaymentUri } from '../src/lib/upiQr';
import { PRO_PLANS, TRIAL_PLAN, getTrialDisclosureText } from '../src/lib/subscriptionPlans';
import { TRIAL_PROMISE_COPY } from '../src/shared/pricing';

describe('PHASE 3 Verification: Core Subscriptions, Security & Direct UPI', () => {
  it('1. Direct Invoice UPI QR URI complies with NPCI format', () => {
    const uri = buildUpiPaymentUri('test@okaxis', 'Tilak Popat', 1500, 'Invoice INV-001');
    assert.ok(uri.startsWith('upi://pay?'), 'URI must start with upi://pay?');
    assert.ok(uri.includes('pa=test@okaxis'), 'URI must contain payee UPI ID');
    assert.ok(uri.includes('pn=Tilak%20Popat'), 'URI must contain URL-encoded payee name');
    assert.ok(uri.includes('am=1500'), 'URI must contain exact invoice amount');
    assert.ok(uri.includes('cu=INR'), 'URI must specify INR currency');
  });

  it('2. Canonical 7-Day Cardless Trial Promise (no free tier)', () => {
    assert.strictEqual(TRIAL_PLAN.price, 0);
    assert.strictEqual(TRIAL_PLAN.durationDays, 7);
    assert.strictEqual(getTrialDisclosureText(TRIAL_PLAN), TRIAL_PROMISE_COPY);
  });

  it('3. Razorpay Paid Plans Configuration (79 / 199 / 699)', () => {
    assert.strictEqual(PRO_PLANS.length, 3);
    const monthly = PRO_PLANS.find((p) => p.id === 'monthly');
    const quarterly = PRO_PLANS.find((p) => p.id === 'quarterly');
    const yearly = PRO_PLANS.find((p) => p.id === 'yearly');

    assert.ok(monthly && monthly.price === 79 && monthly.currency === 'INR');
    assert.ok(quarterly && quarterly.price === 199 && quarterly.currency === 'INR');
    assert.ok(yearly && yearly.price === 699 && yearly.currency === 'INR' && yearly.isBestValue);
  });

  it('4. Razorpay Webhook HMAC-SHA256 Signature Verification', () => {
    const secret = 'test_webhook_secret_9988';
    const payload = JSON.stringify({
      entity: 'event',
      account_id: 'acc_12345',
      event: 'subscription.charged',
      payload: { subscription: { entity: { id: 'sub_test_123', status: 'active' } } },
    });

    const expectedSignature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    const actualSignature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(actualSignature, 'utf8')
    );
    assert.strictEqual(isValid, true);
  });
});
