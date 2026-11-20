import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { buildUpiPaymentUri, isValidUpiId } from '../src/lib/upiQr';
import { renderDocumentHtml } from '../src/lib/invoiceRenderer';

describe('Invoice Printing & Offscreen PDF Generation Suite', () => {
  const invoiceRendererSource = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/invoiceRenderer.ts'),
    'utf-8'
  );

  test('1. printDocumentHtml has an idempotent hasPrinted guard preventing double print dialog', () => {
    // Verify hasPrinted variable exists in printDocumentHtml
    assert.match(
      invoiceRendererSource,
      /let\s+hasPrinted\s*=\s*false/,
      'printDocumentHtml must declare a hasPrinted flag'
    );

    // Verify triggerPrint checks hasPrinted and sets it immediately
    assert.match(
      invoiceRendererSource,
      /if\s*\(\s*hasPrinted\s*\)\s*return;\s*hasPrinted\s*=\s*true;/,
      'triggerPrint must return early if hasPrinted is true and immediately set it to true'
    );

    // Verify fallbackTimer is cleared when all images load
    assert.match(
      invoiceRendererSource,
      /clearTimeout\(fallbackTimer\)/,
      'fallbackTimer must be cleared when images finish loading'
    );
  });

  test('2. generateOffscreenPdfBlob positions container strictly offscreen to prevent on-screen invoice flash', () => {
    // Verify container is styled with offscreen coordinates
    assert.match(
      invoiceRendererSource,
      /container\.style\.left\s*=\s*['"]-99999px['"]/,
      'Container must be placed far offscreen at -99999px to prevent on-screen flash'
    );

    assert.match(
      invoiceRendererSource,
      /container\.style\.zIndex\s*=\s*['"]-99999['"]/,
      'Container must have negative zIndex behind the root viewport'
    );

    // Verify onclone restores positive relative position in the cloned document
    assert.match(
      invoiceRendererSource,
      /clonedContainer\.style\.left\s*=\s*['"]0px['"]/,
      'onclone must normalize coordinates inside html2canvas cloned iframe'
    );
  });

  test('3. invoice table has compact professional spacing without vertical row stretching', () => {
    // Verify table does not have height: 100% forcing vertical stretching
    assert.doesNotMatch(
      invoiceRendererSource,
      /<table\s+style="[^"]*height:\s*100%/,
      'Invoice table must not have height: 100% which causes rows to stretch vertically across the page'
    );

    // Verify .pdf-page does not use justify-content: space-between
    assert.doesNotMatch(
      invoiceRendererSource,
      /class="pdf-page"[^>]*justify-content:\s*space-between/,
      '.pdf-page container must not use justify-content: space-between'
    );

    // Verify single page limit accommodates up to 12 items before pagination
    assert.match(
      invoiceRendererSource,
      /const\s+singlePageLimit\s*=\s*isWorkSummary\s*\?\s*16\s*:\s*12/,
      'singlePageLimit must accommodate up to 12 items on a single page'
    );
  });

  test('4. eliminate developer UPI ID defaults and enforce UPI VPA validation', () => {
    const invoiceTabSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/InvoiceTab.tsx'),
      'utf-8'
    );

    // Verify zero occurrences of developer personal UPI ID
    assert.doesNotMatch(
      invoiceRendererSource,
      /tilakpopat2007-1@okaxis/,
      'invoiceRenderer must never contain developer personal UPI ID'
    );
    assert.doesNotMatch(
      invoiceTabSource,
      /tilakpopat2007-1@okaxis/,
      'InvoiceTab must never contain developer personal UPI ID'
    );

    // Verify buildUpiPaymentUri returns empty string when upiId is invalid or absent
    assert.strictEqual(buildUpiPaymentUri('', 'Payee', 100), '');
    assert.strictEqual(buildUpiPaymentUri('invalid-upi', 'Payee', 100), '');
    assert.strictEqual(
      buildUpiPaymentUri('freelancer@okhdfcbank', 'Payee', 100),
      'upi://pay?pa=freelancer@okhdfcbank&pn=Payee&tn=Invoice%20Payment&am=100&cu=INR'
    );

    // Verify VPA regex validation
    assert.strictEqual(isValidUpiId('creator@bank'), true);
    assert.strictEqual(isValidUpiId('john.doe12@okaxis'), true);
    assert.strictEqual(isValidUpiId('not-a-vpa'), false);
    assert.strictEqual(isValidUpiId(''), false);
    assert.strictEqual(isValidUpiId(null), false);
  });

  test('5. monthly retainer invoice lists work log deliverables with fixed retainer total', () => {
    const html = renderDocumentHtml({
      invoice: {
        id: 'inv-retainer-1',
        invoiceNumber: 'INV-105',
        date: Date.now(),
        clientId: 'c-retainer',
        clientName: 'Roots & Stories',
        reels: [{ id: 'ret-1', title: 'Monthly Video Editing Retainer', quantity: 1, rate: 25000 }],
        totalAmount: 25000,
        status: 'Pending',
        invoiceType: 'monthly_retainer',
        deliverables: [
          { id: 'deliv-1', title: 'Instagram Reel #1 - Brand Story', quantity: 1, date: Date.now() },
          { id: 'deliv-2', title: 'YouTube Short #2 - Product Showcase', quantity: 1, date: Date.now() }
        ]
      },
      client: {
        id: 'c-retainer',
        name: 'Roots & Stories',
        currency: 'INR',
        defaultRate: 25000,
        paymentBasis: 'monthly_retainer',
        isClosed: false
      },
      profile: null,
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30'
    });

    // 1. Deliverables are listed in the table
    assert.ok(html.includes('Instagram Reel #1 - Brand Story'), 'Work log deliverable 1 must be listed');
    assert.ok(html.includes('YouTube Short #2 - Product Showcase'), 'Work log deliverable 2 must be listed');

    // 2. Rate and Amount for deliverables are shown as Included
    assert.ok(html.includes('Included'), 'Deliverables under monthly retainer must display Included');

    // 3. Subtotal and Grand Total strictly equal the fixed monthly retainer amount (25,000)
    assert.ok(html.includes('25,000.00'), 'Total must reflect fixed monthly retainer amount (25,000.00)');
  });
});
