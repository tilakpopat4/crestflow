import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyRazorpayPaymentSignature } from '../worker/razorpay';

describe('Razorpay Standard Web Checkout Integration', () => {
  const testSecret = '0M9VNSeBmTyk7m3tpl577xfQ';
  const orderId = 'order_test_1234567890';
  const paymentId = 'pay_test_9876543210';

  it('1. correctly generates and verifies valid HMAC-SHA256 payment signature', async () => {
    // Generate signature per Razorpay standard: HMAC-SHA256(order_id + "|" + payment_id, secret)
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(payload)
      .digest('hex');

    const isValid = await verifyRazorpayPaymentSignature(orderId, paymentId, validSignature, testSecret);
    assert.strictEqual(isValid, true, 'Valid signature must return true');
  });

  it('2. rejects forged or mismatched signature', async () => {
    const invalidSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    const isValid = await verifyRazorpayPaymentSignature(orderId, paymentId, invalidSignature, testSecret);
    assert.strictEqual(isValid, false, 'Forged signature must return false');
  });

  it('3. rejects when required parameters are missing', async () => {
    assert.strictEqual(await verifyRazorpayPaymentSignature('', paymentId, 'sig', testSecret), false);
    assert.strictEqual(await verifyRazorpayPaymentSignature(orderId, '', 'sig', testSecret), false);
    assert.strictEqual(await verifyRazorpayPaymentSignature(orderId, paymentId, '', testSecret), false);
    assert.strictEqual(await verifyRazorpayPaymentSignature(orderId, paymentId, 'sig', ''), false);
  });
});
