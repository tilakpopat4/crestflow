import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getPaymentStatusInfo, calculateClientFinancials } from '../src/lib/paymentUtils';
import { Client, Invoice, WorkItem } from '../src/types';

describe('Notification Bell & Payment Cycle Deduplication Suite', () => {
  const popoverPath = path.resolve(process.cwd(), 'src/components/notifications/NotificationBellPopover.tsx');
  const dashboardTabPath = path.resolve(process.cwd(), 'src/components/DashboardTab.tsx');
  const globalHeaderPath = path.resolve(process.cwd(), 'src/components/GlobalHeader.tsx');

  it('keeps NotificationBellPopover under 300 lines (AGENTS.md file size standard)', () => {
    assert.ok(fs.existsSync(popoverPath), 'NotificationBellPopover.tsx must exist');
    const content = fs.readFileSync(popoverPath, 'utf8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount <= 300, `NotificationBellPopover.tsx has ${lineCount} lines, must be <= 300 lines`);
  });

  it('strictly adheres to GEMINI.md design standards (no emojis, no pills with pastel backgrounds)', () => {
    const content = fs.readFileSync(popoverPath, 'utf8');
    // Ensure no emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(content), 'NotificationBellPopover must not contain emojis');
    // Ensure no rounded-full pill buttons with pastel backgrounds
    assert.ok(!content.includes('bg-amber-100'), 'Must not contain amber pastel pills');
    assert.ok(!content.includes('bg-rose-100'), 'Must not contain rose pastel pills');
  });

  it('removes inline payment reminders alert banner from DashboardTab', () => {
    const dashboardContent = fs.readFileSync(dashboardTabPath, 'utf8');
    assert.ok(
      !dashboardContent.includes('Payment Reminders ('),
      'DashboardTab must no longer contain the inline Payment Reminders banner'
    );
    assert.ok(
      !dashboardContent.includes('activeNotifications.map'),
      'DashboardTab must not map activeNotifications inline'
    );
  });

  it('integrates NotificationBellPopover inside GlobalHeader top-right actions', () => {
    const headerContent = fs.readFileSync(globalHeaderPath, 'utf8');
    assert.ok(
      headerContent.includes('NotificationBellPopover'),
      'GlobalHeader must import and render NotificationBellPopover'
    );
  });

  it('removes inline payment alerts banner and delayed status badge from client page', () => {
    const clientsTabPath = path.resolve(process.cwd(), 'src/components/ClientsTab.tsx');
    const clientDashboardPath = path.resolve(process.cwd(), 'src/components/ClientDashboard.tsx');

    const clientsTabContent = fs.readFileSync(clientsTabPath, 'utf8');
    assert.ok(
      !clientsTabContent.includes('Payment Alerts ('),
      'ClientsTab must no longer contain the Payment Alerts banner'
    );
    assert.ok(
      !clientsTabContent.includes('StatusBadge status={statusInfo.code}'),
      'ClientsTab client card must no longer show payment delayed badge'
    );

    const clientDashboardContent = fs.readFileSync(clientDashboardPath, 'utf8');
    assert.ok(
      !clientDashboardContent.includes('Payment Reminder / Alert Notification Banner'),
      'ClientDashboard must no longer contain the alert notification banner'
    );
  });

  it('correctly calculates payment due notifications and deduplicates once dismissed', () => {
    const now = Date.now();
    const mockClientDueToday: Client = {
      id: 'client_due_today',
      name: 'Client Alpha',
      contactPerson: 'Alpha Contact',
      email: 'alpha@example.com',
      phone: '9999999999',
      paymentBasis: 'monthly_retainer',
      paymentCycleDays: 30,
      monthlyRetainerAmount: 5000,
      lastPaymentDate: now - 30 * 24 * 60 * 60 * 1000, // Due today
      createdAt: now - 60 * 24 * 60 * 60 * 1000,
      status: 'active',
      isClosed: false
    };

    const mockClientUpToDate: Client = {
      id: 'client_up_to_date',
      name: 'Client Beta',
      contactPerson: 'Beta Contact',
      email: 'beta@example.com',
      phone: '8888888888',
      paymentBasis: 'monthly_retainer',
      paymentCycleDays: 30,
      monthlyRetainerAmount: 7000,
      lastPaymentDate: now, // Just paid today, next due in 30 days
      createdAt: now,
      status: 'active',
      isClosed: false
    };

    const mockClosedClient: Client = {
      id: 'client_closed',
      name: 'Client Gamma',
      contactPerson: 'Gamma Contact',
      email: 'gamma@example.com',
      phone: '7777777777',
      paymentBasis: 'monthly_retainer',
      paymentCycleDays: 30,
      monthlyRetainerAmount: 10000,
      lastPaymentDate: now - 35 * 24 * 60 * 60 * 1000,
      createdAt: now - 70 * 24 * 60 * 60 * 1000,
      status: 'active',
      isClosed: true
    };

    const clients = [mockClientDueToday, mockClientUpToDate, mockClosedClient];
    const invoices: Invoice[] = [];
    const workItems: WorkItem[] = [];

    // Filter logic simulating NotificationBellPopover
    const computeActiveNotifications = (dismissedSet: Set<string>) => {
      return clients.filter((client) => {
        if (client.isClosed) return false;
        const statusInfo = getPaymentStatusInfo(client, invoices, workItems);
        const isDueOrOverdue = statusInfo.code === 'DUE_TODAY' || 
                              statusInfo.code === 'OVERDUE' || 
                              statusInfo.code === 'OVERDUE_2_DAYS' || 
                              statusInfo.daysRemaining <= 0 || 
                              statusInfo.isNotificationRequired;
        if (!isDueOrOverdue) return false;
        const cycleKey = `due_${client.id}_${statusInfo.nextDueDate}`;
        return !dismissedSet.has(cycleKey);
      });
    };

    // Initial state: Client Alpha is due, Beta is up to date, Gamma is closed
    const initialList = computeActiveNotifications(new Set());
    assert.strictEqual(initialList.length, 1, 'Only Client Alpha should be in active payment notifications');
    assert.strictEqual(initialList[0].id, 'client_due_today');

    // When dismissed once:
    const alphaStatus = getPaymentStatusInfo(mockClientDueToday, invoices, workItems);
    const dismissedAlphaKey = `due_${mockClientDueToday.id}_${alphaStatus.nextDueDate}`;
    const dismissedSet = new Set([dismissedAlphaKey]);

    const afterDismissList = computeActiveNotifications(dismissedSet);
    assert.strictEqual(afterDismissList.length, 0, 'After dismissing for this cycle, notification must never appear again');
  });
});

