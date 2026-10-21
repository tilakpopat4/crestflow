import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Dynamic Import Chunk Error Detection', () => {
  it('identifies Vite chunk loading errors accurately', () => {
    const chunkErrors = [
      'Failed to fetch dynamically imported module: https://crestflow.tilakpopat2007.workers.dev/assets/ClientOnboardingTab-C3Yo3KFN.js',
      'error loading dynamically imported module',
      'Loading chunk 45 failed',
      'Failed to fetch'
    ];

    chunkErrors.forEach((errMsg) => {
      const isChunkError =
        errMsg.includes('dynamically imported module') ||
        errMsg.includes('Loading chunk') ||
        errMsg.includes('Failed to fetch');
      assert.strictEqual(isChunkError, true, `Should identify "${errMsg}" as chunk error`);
    });
  });

  it('differentiates normal runtime errors from chunk errors', () => {
    const normalErrors = [
      'Cannot read properties of undefined (reading "name")',
      'Invalid state transition',
      'Network request failed: status 500'
    ];

    normalErrors.forEach((errMsg) => {
      const isChunkError =
        errMsg.includes('dynamically imported module') ||
        errMsg.includes('Loading chunk');
      assert.strictEqual(isChunkError, false, `Should not identify "${errMsg}" as chunk error`);
    });
  });
});
