import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('CrestFlow Core Promise, Dashboard & Onboarding Suite', () => {
  const dashboardPath = path.resolve(process.cwd(), 'src/components/DashboardTab.tsx');
  const gettingStartedPath = path.resolve(process.cwd(), 'src/components/GettingStartedCard.tsx');
  const clientsTabPath = path.resolve(process.cwd(), 'src/components/ClientsTab.tsx');
  const workLogTabPath = path.resolve(process.cwd(), 'src/components/WorkLogTab.tsx');
  const invoiceTabPath = path.resolve(process.cwd(), 'src/components/InvoiceTab.tsx');

  it('keeps GettingStartedCard under 300 lines (AGENTS.md file size rule)', () => {
    assert.ok(fs.existsSync(gettingStartedPath), 'GettingStartedCard.tsx must exist');
    const content = fs.readFileSync(gettingStartedPath, 'utf8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount <= 300, `GettingStartedCard.tsx is ${lineCount} lines, must be <= 300`);
  });

  it('GettingStartedCard includes the core promise and all 5 onboarding steps', () => {
    const content = fs.readFileSync(gettingStartedPath, 'utf8');
    assert.ok(content.includes('Log work, get paid by UPI without chasing.'), 'Must include the core promise subtitle');
    assert.ok(content.includes('Add first client'), 'Step 1: Add first client');
    assert.ok(content.includes('Log first work item'), 'Step 2: Log first work item');
    assert.ok(content.includes('Generate first invoice'), 'Step 3: Generate first invoice');
    assert.ok(content.includes('Add UPI ID'), 'Step 4: Add UPI ID');
    assert.ok(content.includes('Send reminder'), 'Step 5: Send reminder');
    assert.ok(content.includes('stepsCompleted === 5'), 'Must auto-hide when all 5 steps complete');
  });

  it('DashboardTab features the 4 top metrics: Total Earned, Total Due, Overdue Amount, Invoices Issued', () => {
    const content = fs.readFileSync(dashboardPath, 'utf8');
    assert.ok(content.includes('Total Earned This Month'), 'Must display Total Earned This Month');
    assert.ok(content.includes('Total Due'), 'Must display Total Due');
    assert.ok(content.includes('Overdue Amount'), 'Must display Overdue Amount');
    assert.ok(content.includes('Invoices Issued'), 'Must display Invoices Issued');
    assert.ok(content.includes('overdueAmount'), 'Must calculate overdueAmount in metrics');
  });

  it('DashboardTab moves secondary widgets into collapsible Workspace Tools', () => {
    const content = fs.readFileSync(dashboardPath, 'utf8');
    assert.ok(content.includes('Workspace Tools'), 'Must have Workspace Tools drawer');
    assert.ok(content.includes('activeWorkspaceTool === \'milestones\''), 'Career milestones moved into tools');
    assert.ok(content.includes('activeWorkspaceTool === \'notes\''), 'Sticky notes in tools');
    assert.ok(content.includes('activeWorkspaceTool === \'ai\''), 'AI summarizer in tools');
  });

  it('empty states provide clear next-action instructions with a single primary button', () => {
    const clientsContent = fs.readFileSync(clientsTabPath, 'utf8');
    assert.ok(clientsContent.includes('Add First Client'), 'ClientsTab empty state has Add First Client button');

    const workContent = fs.readFileSync(workLogTabPath, 'utf8');
    assert.ok(workContent.includes('Log First Work Item'), 'WorkLogTab empty state has Log First Work Item button');

    const invoiceContent = fs.readFileSync(invoiceTabPath, 'utf8');
    assert.ok(invoiceContent.includes('Generate First Invoice'), 'InvoiceTab empty state has Generate First Invoice button');
  });
});

