/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Client Portal Professional Adaptation & Architecture', () => {
  const clientPortalDir = path.resolve('src/components/client-portal');
  const mainPortalFile = path.resolve('src/components/ClientPortal.tsx');
  const hookFile = path.resolve('src/hooks/useClientPortalData.ts');

  const filesToCheck = [
    mainPortalFile,
    hookFile,
    ...fs.readdirSync(clientPortalDir).map((f) => path.join(clientPortalDir, f)),
  ];

  it('keeps all files under 300 lines (AGENTS.md file size limit)', () => {
    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf-8');
      const lineCount = content.split('\n').length;
      assert.ok(
        lineCount <= 300,
        `File ${path.basename(file)} has ${lineCount} lines, which exceeds the 300 line limit!`
      );
    }
  });

  it('strictly adheres to GEMINI.md design standards (no rounded-3xl or rounded-2xl, no shadow-2xl)', () => {
    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf-8');
      assert.strictEqual(
        content.includes('rounded-3xl'),
        false,
        `File ${path.basename(file)} contains prohibited rounded-3xl`
      );
      assert.strictEqual(
        content.includes('rounded-2xl'),
        false,
        `File ${path.basename(file)} contains prohibited rounded-2xl`
      );
      assert.strictEqual(
        content.includes('shadow-2xl'),
        false,
        `File ${path.basename(file)} contains prohibited shadow-2xl`
      );
      assert.strictEqual(
        content.includes('shadow-xl'),
        false,
        `File ${path.basename(file)} contains prohibited shadow-xl`
      );
    }
  });

  it('includes minimum 44px touch targets for mobile interactive elements', () => {
    const headerContent = fs.readFileSync(path.join(clientPortalDir, 'ClientPortalHeader.tsx'), 'utf-8');
    assert.ok(
      headerContent.includes('min-h-[44px]'),
      'ClientPortalHeader should include min-h-[44px] touch targets'
    );

    const reviewContent = fs.readFileSync(path.join(clientPortalDir, 'ClientPortalReview.tsx'), 'utf-8');
    assert.ok(
      reviewContent.includes('min-h-[44px] min-w-[44px]'),
      'ClientPortalReview should have 44x44px touch targets for star ratings'
    );

    const workLogContent = fs.readFileSync(path.join(clientPortalDir, 'ClientPortalWorkLog.tsx'), 'utf-8');
    assert.ok(
      workLogContent.includes('min-h-[44px]'),
      'ClientPortalWorkLog should have 44px min touch targets'
    );
  });
});
