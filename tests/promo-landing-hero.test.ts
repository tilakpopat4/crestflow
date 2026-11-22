import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Unauthenticated Promo Page & Dashboard Preview Suite', () => {
  test('1. CenteredProductHero contains headline, 7-day trial button, compare plans button, and preview', () => {
    const heroPath = path.join(process.cwd(), 'src/components/promo/CenteredProductHero.tsx');
    assert.ok(fs.existsSync(heroPath), 'CenteredProductHero.tsx must exist');

    const heroSource = fs.readFileSync(heroPath, 'utf-8');
    assert.ok(heroSource.includes('Invoice. Scan.'), 'Hero must contain headline');
    assert.ok(heroSource.includes('Start 7-Day Trial'), 'Must contain Start 7-Day Trial CTA button');
    assert.ok(heroSource.includes('Compare Plans'), 'Must contain Compare Plans CTA button');
    assert.ok(heroSource.includes('DashboardPreviewMock'), 'Must embed DashboardPreviewMock');
  });

  test('2. DashboardPreviewMock renders realistic financial stats and revenue comparison chart', () => {
    const mockPath = path.join(process.cwd(), 'src/components/promo/DashboardPreviewMock.tsx');
    assert.ok(fs.existsSync(mockPath), 'DashboardPreviewMock.tsx must exist');

    const mockSource = fs.readFileSync(mockPath, 'utf-8');
    assert.ok(mockSource.includes('TOTAL EARNED THIS MONTH'), 'Must show Total Earned metric');
    assert.ok(mockSource.includes('₹10,000'), 'Must show ₹10,000 earnings');
    assert.ok(mockSource.includes('TOTAL DUE'), 'Must show Total Due metric');
    assert.ok(mockSource.includes('NET REVENUE BY MONTH, INR'), 'Must render revenue comparison chart');
    assert.ok(mockSource.includes('280 days worked'), 'Must render streak badge');
  });

  test('3. SignInScreen coordinates promo mode and auth mode cleanly', () => {
    const signInPath = path.join(process.cwd(), 'src/components/auth/SignInScreen.tsx');
    const signInSource = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(signInSource.includes('authView'), 'Must track promo vs auth view');
    assert.ok(signInSource.includes('CenteredProductHero'), 'Must render CenteredProductHero in promo mode');
    assert.ok(signInSource.includes('SignInCard'), 'Must render SignInCard in auth mode');
    assert.ok(signInSource.includes("onSupportingNavigate('pricing')"), 'Must wire Compare Plans to /pricing');
    assert.ok(signInSource.includes('initialMode'), 'Must accept initialMode prop');
    assert.ok(
      signInSource.includes('if (user || auth.currentUser) return null;'),
      'Must guard against logged-in users and never render landing page'
    );
  });

  test('4. Logged-in user bypasses landing page in App.tsx and router', () => {
    const appPath = path.join(process.cwd(), 'src/App.tsx');
    const appSource = fs.readFileSync(appPath, 'utf-8');
    assert.ok(
      appSource.includes("isSpecialMode === 'auth' || isSpecialMode === 'promo'"),
      'Must redirect authenticated users away from promo landing and auth pages'
    );

    const routerPath = path.join(process.cwd(), 'src/lib/router.ts');
    const routerSource = fs.readFileSync(routerPath, 'utf-8');
    assert.ok(routerSource.includes("case '/landing':"), 'Must resolve /landing route');
    assert.ok(routerSource.includes("case '/promo':"), 'Must resolve /promo route');
  });

  test('5. AGENTS.md Line Count Compliance (all <= 300 lines)', () => {
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
