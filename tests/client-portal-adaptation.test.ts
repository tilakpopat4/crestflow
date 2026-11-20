/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Client Portal & Approval Process Purge Verification', () => {
  it('1. Verifies ClientPortal components and directory are completely deleted', () => {
    assert.strictEqual(
      fs.existsSync(path.resolve('src/components/ClientPortal.tsx')),
      false,
      'ClientPortal.tsx must not exist'
    );
    assert.strictEqual(
      fs.existsSync(path.resolve('src/components/client-portal')),
      false,
      'src/components/client-portal directory must not exist'
    );
    assert.strictEqual(
      fs.existsSync(path.resolve('src/hooks/useClientPortalData.ts')),
      false,
      'useClientPortalData.ts must not exist'
    );
    assert.strictEqual(
      fs.existsSync(path.resolve('src/components/skeletons/ClientPortalSkeleton.tsx')),
      false,
      'ClientPortalSkeleton.tsx must not exist'
    );
    assert.strictEqual(
      fs.existsSync(path.resolve('src/components/work/DeliverableFeedbackViewerModal.tsx')),
      false,
      'DeliverableFeedbackViewerModal.tsx must not exist'
    );
  });

  it('2. Verifies App.tsx and router do not include client portal mode or switches', () => {
    const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
    assert.strictEqual(appContent.includes('ClientPortal'), false, 'App.tsx must not import ClientPortal');
    assert.strictEqual(appContent.includes('isClientPortalMode'), false, 'App.tsx must not have isClientPortalMode');
    assert.strictEqual(appContent.includes('onSwitchToClient'), false, 'App.tsx must not have onSwitchToClient');

    const routerContent = fs.readFileSync(path.resolve('src/lib/router.ts'), 'utf-8');
    assert.strictEqual(routerContent.includes('client_portal'), false, 'router.ts must not include client_portal');
  });

  it('3. Verifies WorkLog tables and cards do not include approval status or approval buttons', () => {
    const tableContent = fs.readFileSync(path.resolve('src/components/work-log/WorkLogTable.tsx'), 'utf-8');
    assert.strictEqual(tableContent.includes('<th className="py-3 px-3">Approval</th>'), false, 'Table must not have Approval header');
    assert.strictEqual(tableContent.includes('work.approvalStatus'), false, 'Table must not display approvalStatus');
    assert.strictEqual(tableContent.includes('onOpenFeedbackViewer'), false, 'Table must not have onOpenFeedbackViewer');

    const mobileContent = fs.readFileSync(path.resolve('src/components/work-log/WorkLogMobileCards.tsx'), 'utf-8');
    assert.strictEqual(mobileContent.includes('work.approvalStatus'), false, 'Cards must not display approvalStatus');
    assert.strictEqual(mobileContent.includes('onOpenFeedbackViewer'), false, 'Cards must not have onOpenFeedbackViewer');

    const clientWorkContent = fs.readFileSync(path.resolve('src/components/client-dashboard/ClientWorkLogsTab.tsx'), 'utf-8');
    assert.strictEqual(clientWorkContent.includes('item.approvalStatus'), false, 'ClientWorkLogsTab must not display approvalStatus');
  });
});
