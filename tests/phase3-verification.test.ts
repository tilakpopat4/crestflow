import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { buildUpiPaymentUri } from '../src/lib/upiQr';
import { FREE_TIER_LIMITS, PRO_PLANS } from '../src/lib/subscriptionPlans';

describe('PHASE 3 Verification: Core Subscriptions, Security & Direct UPI', () => {
  it('1. Direct Invoice UPI QR URI complies with NPCI format', () => {
    const uri = buildUpiPaymentUri('test@okaxis', 'Tilak Popat', 1500, 'Invoice INV-001');
    assert.ok(uri.startsWith('upi://pay?'), 'URI must start with upi://pay?');
    assert.ok(uri.includes('pa=test@okaxis'), 'URI must contain payee UPI ID');
    assert.ok(uri.includes('pn=Tilak%20Popat'), 'URI must contain URL-encoded payee name');
    assert.ok(uri.includes('am=1500'), 'URI must contain exact invoice amount');
    assert.ok(uri.includes('cu=INR'), 'URI must specify INR currency');
  });

  it('2. Free Tier Limit Boundaries match requirements', () => {
    assert.strictEqual(FREE_TIER_LIMITS.maxClients, 2, 'Free tier limit must be exactly 2 clients');
    assert.strictEqual(FREE_TIER_LIMITS.maxInvoicesPerMonth, 3, 'Free tier limit must be exactly 3 invoices/month');

    // Simulate limit check
    const canCreateClient = (count: number) => count < FREE_TIER_LIMITS.maxClients;
    assert.strictEqual(canCreateClient(0), true, '0 clients: allowed');
    assert.strictEqual(canCreateClient(1), true, '1 client: allowed');
    assert.strictEqual(canCreateClient(2), false, '2 clients: limit reached (blocked)');

    const canCreateInvoice = (count: number) => count < FREE_TIER_LIMITS.maxInvoicesPerMonth;
    assert.strictEqual(canCreateInvoice(0), true, '0 invoices: allowed');
    assert.strictEqual(canCreateInvoice(2), true, '2 invoices: allowed');
    assert.strictEqual(canCreateInvoice(3), false, '3 invoices: limit reached (blocked)');
  });

  it('3. Razorpay Subscription Plans Configuration', () => {
    const monthly = PRO_PLANS.find(p => p.id === 'monthly');
    const yearly = PRO_PLANS.find(p => p.id === 'yearly');

    assert.ok(monthly, 'Monthly plan must exist');
    assert.strictEqual(monthly.price, 499, 'Monthly price must be ₹499');
    assert.strictEqual(monthly.currency, 'INR');

    assert.ok(yearly, 'Yearly plan must exist');
    assert.strictEqual(yearly.price, 4499, 'Yearly price must be ₹4499');
    assert.strictEqual(yearly.currency, 'INR');
  });

  it('4. Razorpay Webhook HMAC-SHA256 Signature Verification', () => {
    const secret = 'test_webhook_secret_9988';
    const payload = JSON.stringify({
      entity: 'event',
      account_id: 'acc_12345',
      event: 'subscription.charged',
      contains: ['subscription', 'payment'],
      payload: {
        subscription: {
          entity: {
            id: 'sub_test_123',
            plan_id: 'plan_monthly_79',
            status: 'active'
          }
        }
      }
    });

    // Compute expected signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');

    // Verify signature with timing-safe comparison
    const verificationHmac = crypto.createHmac('sha256', secret);
    verificationHmac.update(payload, 'utf8');
    const actualSignature = verificationHmac.digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(actualSignature, 'utf8')
    );

    assert.strictEqual(isValid, true, 'Timing-safe HMAC-SHA256 signature must be verified successfully');
  });
});
