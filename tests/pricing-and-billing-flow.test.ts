import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRO_PLANS, TRIAL_PLAN, getTrialDisclosureText } from '../src/lib/subscriptionPlans';
import { TRIAL_PROMISE_COPY, getPlanDisclosureText } from '../src/shared/pricing';
import { resolveAccessFromSnapshot, normalizeEntitlementPayload } from '../src/lib/accessState';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Pricing Page, Plans Disclosure & Server-Governed Access Suite', () => {
  it('1. 3 Paid Plans + Trial Configuration: contains Trial (7d), Monthly (79), Quarterly (199), Yearly (699)', () => {
    assert.equal(PRO_PLANS.length, 3);
    assert.deepEqual(PRO_PLANS.map((p) => p.id), ['monthly', 'quarterly', 'yearly']);

    const monthly = PRO_PLANS.find((p) => p.id === 'monthly')!;
    const quarterly = PRO_PLANS.find((p) => p.id === 'quarterly')!;
    const yearly = PRO_PLANS.find((p) => p.id === 'yearly')!;

    assert.equal(TRIAL_PLAN.price, 0);
    assert.equal(TRIAL_PLAN.durationDays, 7);
    assert.equal(monthly.price, 79);
    assert.equal(quarterly.price, 199);
    assert.equal(yearly.price, 699);
    assert.equal(yearly.isBestValue, true);
    assert.equal(yearly.savingsBadge, 'Best value · Save 26%');
    assert.equal(yearly.monthlyEquivalent, 58);
  });

  it('2. Mandatory Disclosure Text: identical 7-day trial copy & clear subscription vs order disclosure', () => {
    assert.equal(getTrialDisclosureText(TRIAL_PLAN), TRIAL_PROMISE_COPY);

    const monthly = PRO_PLANS.find((p) => p.id === 'monthly')!;
    assert.match(getPlanDisclosureText(monthly, 'subscription'), /Charged ₹79 today.*month/i);
    assert.match(getPlanDisclosureText(monthly, 'order'), /Pay once, valid until .*no auto-renewal/i);

    const yearly = PRO_PLANS.find((p) => p.id === 'yearly')!;
    assert.match(getPlanDisclosureText(yearly, 'subscription'), /Charged ₹699 today.*year/i);
  });

  it('3. Access Authority: Client resolves purely from server validUntil > now & status', () => {
    const serverNowMs = 1700000000000;

    const expired = resolveAccessFromSnapshot(
      normalizeEntitlementPayload({ status: 'active', validUntil: new Date(serverNowMs - 60000).toISOString() }),
      serverNowMs
    );
    assert.equal(expired.state, 'expired');
    assert.equal(expired.canWrite, false);

    const trialing = resolveAccessFromSnapshot(
      normalizeEntitlementPayload({
        status: 'trialing',
        validUntil: new Date(serverNowMs + 5 * 86400000).toISOString(),
        trialStartedAt: new Date(serverNowMs - 2 * 86400000).toISOString(),
      }),
      serverNowMs
    );
    assert.equal(trialing.state, 'trialing');
    assert.equal(trialing.canWrite, true);
    assert.equal(trialing.daysLeft, 5);

    const explorer = resolveAccessFromSnapshot(normalizeEntitlementPayload(null), serverNowMs);
    assert.equal(explorer.state, 'none');
    assert.equal(explorer.isExploring, true);
    assert.equal(explorer.canWrite, false);
  });

  it('4. Valid Prices [79, 199, 699] across HTML, components and docs (zero 449 / 899)', () => {
    const filesToCheck = [
      'index.html',
      'public/refund-policy.html',
      'src/components/RefundPolicyPage.tsx',
      'src/shared/pricing.ts',
      'docs/BILLING_SPEC.md',
      'docs/GO_LIVE_CHECKLIST.md',
    ];
    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8');
      assert.ok(content.includes('79'), `${relPath} must include 79`);
      assert.ok(content.includes('199'), `${relPath} must include 199`);
      assert.ok(content.includes('699'), `${relPath} must include 699`);
      assert.ok(!/₹\s*449\b/.test(content), `${relPath} must not reference retired ₹449`);
      assert.ok(!/₹\s*899\b/.test(content), `${relPath} must not reference retired ₹899`);
    }
  });

  it('5. Safe Subscription Cancellation & Non-Blocking Action Gating', async () => {
    const { cancelRazorpaySubscription } = await import('../worker/razorpay');
    const mockEnv = { RAZORPAY_KEY_ID: 'rzp_test_123', RAZORPAY_KEY_SECRET: 'secret_123' } as any;
    assert.equal((await cancelRazorpaySubscription(mockEnv, 'order_mock_test_123')).status, 'cancelled');
    assert.equal((await cancelRazorpaySubscription(mockEnv, '')).status, 'cancelled');

    const appContent = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf8');
    assert.ok(appContent.includes('AccessProvider'), 'App.tsx must mount AccessProvider');
    assert.ok(appContent.includes('UpgradeSheet'), 'App.tsx must mount dismissible UpgradeSheet');
    assert.ok(!appContent.includes('SubscriptionWallPage'), 'App.tsx must not block workspace with SubscriptionWallPage');
  });
});
