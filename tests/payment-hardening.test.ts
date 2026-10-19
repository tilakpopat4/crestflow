import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  getYoupiApiUrl,
  getYoupiPortalUrl,
  getYoupiGatewayUrl,
  getReceivingUpiId,
  checkPaymentStatus,
  activateSubscription
} from '../src/lib/youpiService';

describe('YouPI Gateway URL & Endpoint Architecture', () => {
  it('correctly defaults API URL to port 6100 for REST and SSE operations', () => {
    const apiUrl = getYoupiApiUrl();
    assert.ok(apiUrl.includes('6100'), `Expected API URL on port 6100, got: ${apiUrl}`);
  });

  it('correctly defaults Portal URL to port 7000 for customer checkout pages and QR', () => {
    const portalUrl = getYoupiPortalUrl();
    assert.ok(portalUrl.includes('7000'), `Expected Portal URL on port 7000, got: ${portalUrl}`);
  });

  it('maintains getYoupiGatewayUrl for backward compatibility referencing portal port', () => {
    const gatewayUrl = getYoupiGatewayUrl();
    assert.strictEqual(gatewayUrl, getYoupiPortalUrl());
  });

  it('returns configured receiving UPI ID', () => {
    const upiId = getReceivingUpiId();
    assert.ok(upiId && upiId.includes('@'), `Expected valid UPI VPA, got: ${upiId}`);
  });
});

describe('Execution Rule 5 & 6: Zero-Touch Anti-Tamper Payment Hardening', () => {
  it('strictly rejects activateSubscription when payment status is not SUCCESS (e.g. PENDING)', async () => {
    // Intercept global fetch to simulate a pending payment on the gateway
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/v1/payments/pay_test_pending')) {
        return {
          ok: true,
          json: async () => ({
            status: 'PENDING',
            orderId: 'CF-SUB-TEST-001',
            amount: '49.00'
          })
        } as any;
      }
      return originalFetch(url);
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await activateSubscription({
            userId: 'user_attacker_1',
            orderId: 'CF-SUB-TEST-001',
            paymentId: 'pay_test_pending',
            amount: 49
          });
        },
        /Cannot activate subscription: Payment pay_test_pending status is "PENDING", not SUCCESS/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('strictly rejects activateSubscription when gateway is unreachable or payment not found', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/v1/payments/pay_test_not_found')) {
        return {
          ok: false,
          status: 404
        } as any;
      }
      return originalFetch(url);
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await activateSubscription({
            userId: 'user_attacker_2',
            orderId: 'CF-SUB-TEST-002',
            paymentId: 'pay_test_not_found',
            amount: 49
          });
        },
        /Cannot activate subscription: Payment pay_test_not_found status is "UNVERIFIED", not SUCCESS/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('allows activateSubscription when payment status is legitimately verified as SUCCESS by payment-api', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/v1/payments/pay_test_success')) {
        return {
          ok: true,
          json: async () => ({
            status: 'SUCCESS',
            orderId: 'CF-SUB-TEST-003',
            amount: '49.00',
            utr: '429218291039'
          })
        } as any;
      }
      return originalFetch(url);
    }) as any;

    try {
      const result = await activateSubscription({
        userId: 'user_legit_3',
        orderId: 'CF-SUB-TEST-003',
        paymentId: 'pay_test_success',
        amount: 49,
        utr: '429218291039'
      });
      assert.strictEqual(result, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
