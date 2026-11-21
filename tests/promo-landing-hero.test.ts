import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Unauthenticated Promo Page & Dashboard Preview Suite', () => {
  test('1. CenteredProductHero contains headline, 7-day trial button, compare plans button, and rating', () => {
    const heroPath = path.join(process.cwd(), 'src/components/promo/CenteredProductHero.tsx');
    assert.ok(fs.existsSync(heroPath), 'CenteredProductHero.tsx must exist');

    const heroSource = fs.readFileSync(heroPath, 'utf-8');
    assert.ok(heroSource.includes('Invoice. Scan.'), 'Hero must contain headline');
    assert.ok(heroSource.includes('Start 7-Day Trial'), 'Must contain Start 7-Day Trial CTA button');
    assert.ok(heroSource.includes('Compare Plans'), 'Must contain Compare Plans CTA button');
    assert.ok(heroSource.includes('DashboardPreviewMock'), 'Must embed DashboardPreviewMock');
    assert.ok(heroSource.includes('4.9 out of 5'), 'Must show social proof rating');
  });

  test('2. DashboardPreviewMock renders realistic financial stats and client deliverables', () => {
    const mockPath = path.join(process.cwd(), 'src/components/promo/DashboardPreviewMock.tsx');
    assert.ok(fs.existsSync(mockPath), 'DashboardPreviewMock.tsx must exist');

    const mockSource = fs.readFileSync(mockPath, 'utf-8');
    assert.ok(mockSource.includes('Total Earned'), 'Must show Total Earned metric');
    assert.ok(mockSource.includes('₹1,48,500'), 'Must show realistic INR earnings');
    assert.ok(mockSource.includes('Total Due'), 'Must show Total Due metric');
    assert.ok(mockSource.includes('₹32,000'), 'Must show realistic INR due');
    assert.ok(mockSource.includes('Recent Deliverables & Invoices'), 'Must render deliverables table');
  });

  test('3. SignInScreen coordinates promo mode and auth mode cleanly', () => {
    const signInPath = path.join(process.cwd(), 'src/components/auth/SignInScreen.tsx');
    const signInSource = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(signInSource.includes('authView'), 'Must track promo vs auth view');
    assert.ok(signInSource.includes('CenteredProductHero'), 'Must render CenteredProductHero in promo mode');
    assert.ok(signInSource.includes('SignInCard'), 'Must render SignInCard in auth mode');
    assert.ok(signInSource.includes("onSupportingNavigate('pricing')"), 'Must wire Compare Plans to /pricing');
    assert.ok(signInSource.includes('initialMode'), 'Must accept initialMode prop');
  });

  test('4. AGENTS.md Line Count Compliance (all <= 300 lines)', () => {
    const files = [
      'src/components/promo/CenteredProductHero.tsx',
      'src/components/promo/DashboardPreviewMock.tsx',
      'src/components/auth/SignInScreen.tsx',
      'src/App.tsx',
      'tests/promo-landing-hero.test.ts',
    ];

    for (const f of files) {
      const lineCount = fs.readFileSync(path.join(process.cwd(), f), 'utf-8').split('\n').length;
      assert.ok(lineCount <= 300, `${f} has ${lineCount} lines, which exceeds the 300-line limit`);
    }
  });
});
