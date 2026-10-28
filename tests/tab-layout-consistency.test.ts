import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Tab Layout & Ratio Consistency Suite', () => {
  const tabFiles = [
    'src/components/DashboardTab.tsx',
    'src/components/ClientsTab.tsx',
    'src/components/ClientDashboard.tsx',
    'src/components/WorkLogTab.tsx',
    'src/components/InvoiceTab.tsx',
    'src/components/ReviewsTab.tsx',
    'src/components/ClientOnboardingTab.tsx',
    'src/components/ProfilePage.tsx',
    'src/components/AdminTab.tsx'
  ];

  it('all tabs use consistent max-w-7xl mx-auto container width', () => {
    for (const relPath of tabFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      assert.ok(
        content.includes('max-w-7xl mx-auto'),
        `${relPath} must use max-w-7xl mx-auto for consistent workspace width`
      );
    }
  });

  it('no tab root container contains max-w-full overriding max-w-7xl', () => {
    for (const relPath of tabFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Assert that max-w-7xl is not immediately followed by max-w-full on root container
      const rootContainerMatches = content.match(/<div[^>]*className=["'][^"']*max-w-7xl[^"']*["']/g) || [];
      for (const match of rootContainerMatches) {
        assert.ok(
          !match.includes('max-w-full'),
          `${relPath} root container must not contain max-w-full which causes full-screen expansion: ${match}`
        );
      }
    }
  });

  it('all tabs use standard p-4 md:p-8 padding and space-y-6 rhythm', () => {
    for (const relPath of tabFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      assert.ok(
        content.includes('p-4 md:p-8'),
        `${relPath} must use standard p-4 md:p-8 padding for identical screen ratio`
      );
      assert.ok(
        content.includes('space-y-6'),
        `${relPath} must use standard space-y-6 for vertical rhythm`
      );
    }
  });

  it('all workspace headers use identical text-2xl sm:text-3xl title sizing', () => {
    const headerFiles = [
      'src/components/DashboardTab.tsx',
      'src/components/ClientsTab.tsx',
      'src/components/WorkLogTab.tsx',
      'src/components/InvoiceTab.tsx',
      'src/components/ReviewsTab.tsx',
      'src/components/ClientOnboardingTab.tsx',
      'src/components/profile/ProfileHeader.tsx',
      'src/components/AdminTab.tsx'
    ];

    for (const relPath of headerFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      assert.ok(
        content.includes('text-2xl sm:text-3xl'),
        `${relPath} title must use text-2xl sm:text-3xl for identical visual scaling`
      );
    }
  });

  it('invoice table rows enforce 2-line structure without wrapping into a 3rd line', () => {
    const invoiceTabContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/InvoiceTab.tsx'), 'utf8');

    // 1. Table must have min-w-[960px] to provide adequate column width
    assert.ok(
      invoiceTabContent.includes('min-w-[960px]'),
      'Invoice table must have min-w-[960px] to avoid compressing columns'
    );

    // 2. Invoice number and date cell must have whitespace-nowrap
    assert.ok(
      invoiceTabContent.includes('formatInvoiceNumber(inv, invoices)}') &&
      invoiceTabContent.includes('whitespace-nowrap min-w-[130px]'),
      'Invoice number column must use whitespace-nowrap to prevent hyphen breaking'
    );

    // 3. Action buttons must have whitespace-nowrap and shrink-0
    assert.ok(
      invoiceTabContent.includes('Send via Gmail') &&
      invoiceTabContent.includes('whitespace-nowrap shrink-0'),
      'Send via Gmail and actions must use whitespace-nowrap and shrink-0 to prevent button text stacking'
    );
  });

  it('removes box and tab outline borders from major card containers across pages', () => {
    // 1. ClientDashboard: profile card, metrics, and tab strip must not have redundant box/tab outlines
    const cdContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ClientDashboard.tsx'), 'utf8');
    assert.strictEqual(
      cdContent.includes('Main Client Profile Header Card */}'),
      true
    );
    assert.strictEqual(
      cdContent.includes('rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-xs relative overflow-hidden'),
      false,
      'Client profile header card must not have outer border outline'
    );
    assert.strictEqual(
      cdContent.includes('border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 pt-4 flex gap-4 md:gap-6 overflow-x-auto scrollbar-none -mb-px'),
      false,
      'Client tab navigation strip must not have full-width divider border'
    );

    // 2. DashboardTab: metric cards and chart card must not have outer border outlines
    const dashContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/DashboardTab.tsx'), 'utf8');
    assert.strictEqual(
      dashContent.includes('p-2.5 sm:p-4 md:p-6 rounded-xl border border-slate-200'),
      false,
      'Dashboard metric cards must not have outer border outline'
    );
    assert.strictEqual(
      dashContent.includes('lg:col-span-2 bg-white dark:bg-slate-800 p-3.5 sm:p-6 rounded-xl border border-slate-200'),
      false,
      'Dashboard monthly trend chart card must not have outer border outline'
    );

    // 3. InvoiceTab: invoice history card and table wrapper must not have outer border outlines
    const invContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/InvoiceTab.tsx'), 'utf8');
    assert.strictEqual(
      invContent.includes('rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4'),
      false,
      'Invoice history container must not have outer card border outline'
    );
    assert.strictEqual(
      invContent.includes('overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl'),
      false,
      'Invoice table container must not have redundant outer border box'
    );

    // 4. WorkLogTab: work logs card must not have outer border outline
    const workContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/WorkLogTab.tsx'), 'utf8');
    assert.strictEqual(
      workContent.includes('bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm contain-paint'),
      false,
      'Work logs table container must not have redundant outer border box'
    );
  });

  it('DashboardTab computes both all-time and current-month client revenue with All-Time default', () => {
    const dashContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/DashboardTab.tsx'), 'utf8');

    // Asserts allTimeClientRevenueMap and monthClientRevenueMap exist
    assert.ok(
      dashContent.includes('allTimeClientRevenueMap'),
      'DashboardTab must compute all-time client revenue map'
    );
    assert.ok(
      dashContent.includes('monthClientRevenueMap'),
      'DashboardTab must compute monthly client revenue map'
    );
    assert.ok(
      dashContent.includes("useState<'all' | 'month'>('all')"),
      'DashboardTab must default to All Time so client revenue renders even if current month has no paid invoices yet'
    );
    assert.ok(
      dashContent.includes('activeClientRevenueData'),
      'DashboardTab must bind activeClientRevenueData dynamically to the timeframe selector'
    );
  });
});


