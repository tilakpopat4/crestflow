import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

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
});
