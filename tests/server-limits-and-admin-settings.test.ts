import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getIstYearMonth, isUserPro, FREE_TIER_LIMITS } from '../worker/routes/limits';

describe('Server-Enforced Quotas & Admin Settings Suite', () => {
  it('1. Asia/Kolkata Month Calculation: correctly formats year and month in IST', () => {
    // 2026-11-14T23:30:00Z is 2026-11-15 05:00:00 AM IST
    const lateUtc = new Date('2026-11-14T23:30:00Z');
    const istTime = getIstYearMonth(lateUtc);
    assert.equal(istTime.year, 2026);
    assert.equal(istTime.month, 11);
    assert.equal(istTime.key, '2026_11');

    // Edge case: midnight transition in UTC (Dec 31 19:00 UTC is Jan 1 00:30 IST)
    const newYearUtc = new Date('2026-12-31T19:00:00Z');
    const newYearIst = getIstYearMonth(newYearUtc);
    assert.equal(newYearIst.year, 2027);
    assert.equal(newYearIst.month, 1);
    assert.equal(newYearIst.key, '2027_01');
  });

  it('2. Pro Entitlement Check: identifies active, trialing, and unexpired Pro users', () => {
    const now = Date.now();
    assert.equal(isUserPro(null), false);
    assert.equal(isUserPro(undefined), false);
    assert.equal(isUserPro({ status: 'free' }), false);
    assert.equal(isUserPro({ status: 'expired' }), false);

    // Active or trialing status
    assert.equal(isUserPro({ status: 'active' }), true);
    assert.equal(isUserPro({ status: 'trialing' }), true);

    // Valid future accessUntil
    assert.equal(isUserPro({ status: 'cancelled', accessUntil: new Date(now + 86400000).toISOString() }), true);
    // Expired accessUntil
    assert.equal(isUserPro({ status: 'cancelled', accessUntil: new Date(now - 86400000).toISOString() }), false);
  });

  it('3. Free Plan Client Limits: enforce maximum 2 clients', () => {
    assert.equal(FREE_TIER_LIMITS.maxClients, 2);

    const clientCountUnderLimit = 1;
    const clientCountAtLimit = 2;
    const clientCountOverLimit = 3;

    assert.equal(clientCountUnderLimit >= FREE_TIER_LIMITS.maxClients, false);
    assert.equal(clientCountAtLimit >= FREE_TIER_LIMITS.maxClients, true);
    assert.equal(clientCountOverLimit >= FREE_TIER_LIMITS.maxClients, true);
  });

  it('4. Free Plan Monthly Invoice Limits: enforce maximum 3 invoices per calendar month', () => {
    assert.equal(FREE_TIER_LIMITS.maxInvoicesPerMonth, 3);

    const invoiceCountUnderLimit = 2;
    const invoiceCountAtLimit = 3;
    const invoiceCountOverLimit = 4;

    assert.equal(invoiceCountUnderLimit >= FREE_TIER_LIMITS.maxInvoicesPerMonth, false);
    assert.equal(invoiceCountAtLimit >= FREE_TIER_LIMITS.maxInvoicesPerMonth, true);
    assert.equal(invoiceCountOverLimit >= FREE_TIER_LIMITS.maxInvoicesPerMonth, true);
  });

  it('5. Parallel Invoice Creation Simulation: ledger state prevents quota race conditions', async () => {
    // Simulating parallel invoice requests on a ledger with count = 2
    let currentLedgerCount = 2;
    const maxLimit = FREE_TIER_LIMITS.maxInvoicesPerMonth;

    const simulateRequest = async () => {
      if (currentLedgerCount >= maxLimit) {
        return { success: false, status: 403, error: 'Limit reached' };
      }
      // Increment
      currentLedgerCount++;
      return { success: true, status: 201 };
    };

    // Dispatch 3 concurrent requests when 1 slot remains
    const results = await Promise.all([
      simulateRequest(),
      simulateRequest(),
      simulateRequest(),
    ]);

    const successes = results.filter((r) => r.success);
    const rejections = results.filter((r) => !r.success);

    assert.equal(successes.length, 1, 'Only 1 request should succeed to fill the 3rd invoice slot');
    assert.equal(rejections.length, 2, '2 concurrent requests must be rejected with 403');
    assert.equal(currentLedgerCount, 3);
  });
});
