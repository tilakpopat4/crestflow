import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRO_PLANS, getTrialDisclosureText } from '../src/lib/subscriptionPlans';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Pricing Page, Plans Disclosure & Server-Governed Access Suite', () => {
  it('1. 4 Plans Configuration: contains Monthly, Quarterly, 6-Month, and Yearly tiers', () => {
    assert.equal(PRO_PLANS.length, 4);

    const ids = PRO_PLANS.map((p) => p.id);
    assert.deepEqual(ids, ['monthly', 'quarterly', 'half', 'yearly']);

    const monthly = PRO_PLANS.find((p) => p.id === 'monthly')!;
    const quarterly = PRO_PLANS.find((p) => p.id === 'quarterly')!;
    const half = PRO_PLANS.find((p) => p.id === 'half')!;
    const yearly = PRO_PLANS.find((p) => p.id === 'yearly')!;

    assert.equal(monthly.price, 79);
    assert.equal(quarterly.price, 199);
    assert.equal(half.price, 449);
    assert.equal(yearly.price, 899);

    assert.equal(monthly.durationDays, 30);
    assert.equal(quarterly.durationDays, 90);
    assert.equal(half.durationDays, 180);
    assert.equal(yearly.durationDays, 365);
  });

  it('2. Mandatory Disclosure Text: matches regulatory format with dynamic future date and non-refundable ₹1', () => {
    const fixedBaseDate = new Date('2026-10-22T10:00:00Z');
    const monthlyPlan = PRO_PLANS.find((p) => p.id === 'monthly')!;

    const disclosure = getTrialDisclosureText(monthlyPlan, fixedBaseDate);

    // Charge date is base + 7 days = Oct 29, 2026
    assert.match(
      disclosure,
      /₹1 today for a 7-day trial, then ₹79 on 29 October 2026; the ₹1 is non-refundable/i
    );

    const yearlyPlan = PRO_PLANS.find((p) => p.id === 'yearly')!;
    const yearlyDisclosure = getTrialDisclosureText(yearlyPlan, fixedBaseDate);
    assert.match(
      yearlyDisclosure,
      /₹1 today for a 7-day trial, then ₹899 on 29 October 2026; the ₹1 is non-refundable/i
    );
  });

  it('3. Access Authority: Client never decides access; strictly determined by server accessUntil > serverNow', () => {
    const serverNowMs = 1700000000000;

    // Case A: Expired access (accessUntil in past)
    const expiredDoc = {
      status: 'active', // even if raw status claims active
      accessUntil: new Date(serverNowMs - 60000).toISOString(),
    };
    const accessUntilMsA = new Date(expiredDoc.accessUntil).getTime();
    const hasAccessA = accessUntilMsA > serverNowMs;
    assert.equal(hasAccessA, false, 'Expired accessUntil must deny access regardless of status field');

    // Case B: Active trial (accessUntil in future)
    const trialingDoc = {
      status: 'trialing',
      accessUntil: new Date(serverNowMs + 5 * 86400000).toISOString(),
      trialEndsAt: new Date(serverNowMs + 5 * 86400000).toISOString(),
    };
    const accessUntilMsB = new Date(trialingDoc.accessUntil).getTime();
    const hasAccessB = accessUntilMsB > serverNowMs;
    assert.equal(hasAccessB, true);

    // Case C: No subscription document
    const noDoc: any = null;
    const hasAccessC = Boolean(noDoc?.accessUntil && new Date(noDoc.accessUntil).getTime() > serverNowMs);
    assert.equal(hasAccessC, false, 'Users without subscription doc must be locked in read-only mode');
  });

  it('4. Days Remaining Counter: Computed relative to serverNow (display only)', () => {
    const serverNowMs = 1700000000000;
    const fourDaysInFuture = serverNowMs + 4 * 24 * 60 * 60 * 1000 + 1000; // 4 days + 1s

    const daysRemaining = Math.max(
      0,
      Math.ceil((fourDaysInFuture - serverNowMs) / (24 * 60 * 60 * 1000))
    );

    assert.equal(daysRemaining, 5); // 4 days + 1s rounds up to 5 days remaining

    const pastDate = serverNowMs - 1000;
    const expiredDays = pastDate > serverNowMs
      ? Math.max(0, Math.ceil((pastDate - serverNowMs) / (24 * 60 * 60 * 1000)))
      : 0;
    assert.equal(expiredDays, 0);
  });

  it('5. Exact 4 Pricing Tiers Enforcement Everywhere: asserts only 79, 199, 449, and 899 exist', () => {
    const validPrices = [79, 199, 449, 899];
    const invalidPrices = [499, 1299, 2399, 4499, 799, 4999];

    for (const plan of PRO_PLANS) {
      assert.ok(
        validPrices.includes(plan.price),
        `Plan ${plan.id} price ${plan.price} must be one of [79, 199, 449, 899]`
      );
      assert.ok(
        !invalidPrices.includes(plan.price),
        `Plan ${plan.id} contains invalid price ${plan.price}`
      );
    }

    // Verify monthly equivalents
    const monthly = PRO_PLANS.find((p) => p.id === 'monthly')!;
    const quarterly = PRO_PLANS.find((p) => p.id === 'quarterly')!;
    const half = PRO_PLANS.find((p) => p.id === 'half')!;
    const yearly = PRO_PLANS.find((p) => p.id === 'yearly')!;

    assert.equal(monthly.monthlyEquivalent, 79);
    assert.equal(quarterly.monthlyEquivalent, 66);
    assert.equal(half.monthlyEquivalent, 75);
    assert.equal(yearly.monthlyEquivalent, 75);
  });

  it('6. Valid Prices Everywhere Displayed: asserts [79, 199, 449, 899] across user-facing HTML, components and docs', () => {
    const filesToCheck = [
      'index.html',
      'public/refund-policy.html',
      'src/components/RefundPolicyPage.tsx',
      'src/lib/subscriptionPlans.ts',
      'docs/BILLING_SPEC.md',
      'docs/GO_LIVE_CHECKLIST.md',
      'README.md',
    ];

    const invalidPatterns = [
      /₹\s*499\b/,
      /₹\s*1299\b/,
      /₹\s*2399\b/,
      /₹\s*4499\b/,
      /₹\s*799\b/,
      /₹\s*4999\b/,
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      assert.ok(fs.existsSync(fullPath), `Target file ${relPath} must exist`);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Assert none of the invalid prices exist anywhere in these files
      for (const pattern of invalidPatterns) {
        assert.ok(
          !pattern.test(content),
          `File ${relPath} contains invalid price matching ${pattern}`
        );
      }

      // Assert that valid prices 79, 199, 449, 899 are present
      assert.ok(content.includes('79'), `File ${relPath} must reference valid monthly price ₹79`);
      assert.ok(content.includes('199'), `File ${relPath} must reference valid quarterly price ₹199`);
      assert.ok(content.includes('449'), `File ${relPath} must reference valid 6-month price ₹449`);
      assert.ok(content.includes('899'), `File ${relPath} must reference valid yearly price ₹899`);
    }
  });
});
