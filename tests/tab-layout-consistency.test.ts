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
});

