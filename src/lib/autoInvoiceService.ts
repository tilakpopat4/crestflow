import { Client, Invoice, WorkItem, Reel } from '../types';
import { generateUUID } from './utils';
import { formatLocalDateToYMD } from './dateUtils';
import { getNextPaymentDueDate } from './paymentUtils';

export interface AutoInvoiceScheduleInfo {
  isEnabled: boolean;
  scheduleType: 'cycle_date' | 'day_of_month' | 'specific_date';
  nextRunDateFormatted: string; // e.g. 25/10/2026
  nextRunDateYMD: string; // e.g. 2026-10-25
  description: string;
  isDueNow: boolean;
}

/**
 * Computes next scheduled run date and description for a client's auto-invoice.
 */
export function getAutoInvoiceScheduleInfo(client: Client, now: Date = new Date()): AutoInvoiceScheduleInfo {
  const isEnabled = !!client.autoInvoiceEnabled && !client.isClosed;
  const scheduleType = client.autoInvoiceScheduleType || 'cycle_date';
  const todayYMD = formatLocalDateToYMD(now);

  let nextRunDateYMD = '';
  let description = '';

  if (scheduleType === 'day_of_month') {
    const cycleDay = Math.min(31, Math.max(1, client.autoInvoiceCycleDay || 1));
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Maximum days in current month
    const maxDaysInCurMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const targetDayCurMonth = Math.min(cycleDay, maxDaysInCurMonth);

    // If today is target day and past 6:00 AM, or target day has passed this month
    const curMonthTargetDate = new Date(currentYear, currentMonth, targetDayCurMonth);
    const curMonthYMD = formatLocalDateToYMD(curMonthTargetDate);

    if (todayYMD === curMonthYMD) {
      nextRunDateYMD = todayYMD;
    } else if (todayYMD > curMonthYMD) {
      // Moves to next month
      const nextMonth = currentMonth + 1;
      const maxDaysInNextMonth = new Date(currentYear, nextMonth + 1, 0).getDate();
      const targetDayNextMonth = Math.min(cycleDay, maxDaysInNextMonth);
      const nextMonthTargetDate = new Date(currentYear, nextMonth, targetDayNextMonth);
      nextRunDateYMD = formatLocalDateToYMD(nextMonthTargetDate);
    } else {
      nextRunDateYMD = curMonthYMD;
    }

    description = `Runs every month on the ${cycleDay}${getOrdinalSuffix(cycleDay)} at 6:00 AM`;
  } else if (scheduleType === 'specific_date') {
    nextRunDateYMD = client.autoInvoiceSpecificDate || todayYMD;
    const parts = nextRunDateYMD.split('-');
    description = parts.length === 3 ? `Scheduled for ${parts[2]}/${parts[1]}/${parts[0]} at 6:00 AM` : 'Scheduled for specific date at 6:00 AM';
  } else {
    // Default: 'cycle_date' (Payment Cycle Due Date)
    const nextDueDateMs = getNextPaymentDueDate(client);
    nextRunDateYMD = formatLocalDateToYMD(nextDueDateMs);
    const cycleDays = client.paymentCycleDays || 30;
    description = `Runs on the ${cycleDays}-day payment cycle due date at 6:00 AM`;
  }

  // Format as DD/MM/YYYY for Indian locale UI
  const dParts = nextRunDateYMD.split('-');
  const nextRunDateFormatted = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : nextRunDateYMD;

  // Is due right now (today or past due, hour is 6 or later, not already run today)
  const isPastOrToday = todayYMD >= nextRunDateYMD;
  const isMorning6AmOrLater = now.getHours() >= 6;
  const alreadyRunToday = client.lastAutoInvoicedDate === todayYMD;

  const isDueNow = isEnabled && isPastOrToday && isMorning6AmOrLater && !alreadyRunToday;

  return {
    isEnabled,
    scheduleType,
    nextRunDateFormatted,
    nextRunDateYMD,
    description,
    isDueNow
  };
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Checks and automatically generates scheduled invoices for all eligible clients at or after 6:00 AM.
 */
export async function executeAutoInvoiceCheck(params: {
  clients: Client[];
  workItems: WorkItem[];
  invoices: Invoice[];
  addInvoice: (inv: Invoice) => Promise<any>;
  updateWorkItem: (item: WorkItem) => Promise<any>;
  updateClient: (client: Client) => Promise<any>;
  now?: Date;
  forceRunClientId?: string; // allow manual execution for testing
}): Promise<{ generatedCount: number; invoices: Invoice[]; summaryMessages: string[] }> {
  const { clients, workItems, addInvoice, updateWorkItem, updateClient, forceRunClientId } = params;
  const now = params.now || new Date();
  const currentHour = now.getHours();
  const todayYMD = formatLocalDateToYMD(now);

  // Auto-generation is scheduled to execute at morning (6:00 AM or later)
  if (!forceRunClientId && currentHour < 6) {
    return { generatedCount: 0, invoices: [], summaryMessages: [] };
  }

  const generatedInvoices: Invoice[] = [];
  const summaryMessages: string[] = [];

  for (const client of clients) {
    if (client.isClosed) continue;

    const isForceRun = forceRunClientId === client.id;
    if (!client.autoInvoiceEnabled && !isForceRun) continue;

    const scheduleInfo = getAutoInvoiceScheduleInfo(client, now);
    if (!scheduleInfo.isDueNow && !isForceRun) continue;

    const storageKey = `auto_inv_executed_${client.id}_${todayYMD}`;
    if (!isForceRun && localStorage.getItem(storageKey)) {
      continue;
    }

    try {
      // Find all uninvoiced work logs for this client
      const pendingWork = workItems.filter(w => w.clientId === client.id && w.status === 'Uninvoiced');
      const isMonthlyRetainer = client.paymentBasis === 'monthly_retainer' || Boolean(client.monthlyRetainerAmount && client.monthlyRetainerAmount > 0);
      const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      let reels: Reel[] = [];
      let totalAmount = 0;

      if (isMonthlyRetainer) {
        // Monthly basis payment: generate fixed particular amount without per-reel calculation
        const fixedAmount = client.monthlyRetainerAmount || client.defaultRate || 0;
        reels = [{
          id: generateUUID(),
          title: `Monthly Video Editing & Content Creation Retainer (${monthLabel})`,
          quantity: 1,
          rate: fixedAmount
        }];
        totalAmount = fixedAmount;
      } else if (pendingWork.length > 0) {
        reels = pendingWork.map(w => ({
          id: generateUUID(),
          workItemId: w.id,
          title: w.description,
          quantity: w.quantity,
          rate: w.rate,
          subClientId: w.subClientId,
          subClientName: w.subClientName,
          videoUrl: w.videoUrl
        }));
        totalAmount = reels.reduce((sum, r) => sum + (r.quantity * r.rate), 0);
      } else {
        // Fallback service item
        const rate = client.defaultRate > 0 ? client.defaultRate : 1000;
        reels = [{
          id: generateUUID(),
          title: `Video Editing & Content Creation Services (${monthLabel})`,
          quantity: 1,
          rate
        }];
        totalAmount = rate;
      }

      const newInvoice: Invoice = {
        id: generateUUID(),
        date: Date.now(),
        clientId: client.id,
        clientName: client.name,
        reels,
        totalAmount,
        status: 'Pending',
        lastPaymentDate: client.lastPaymentDate,
        isAutoGenerated: true,
        invoiceType: isMonthlyRetainer ? 'monthly_retainer' : 'per_item',
        billingMonth: monthLabel
      };

      // 1. Save new invoice
      await addInvoice(newInvoice);

      // 2. Mark work items as Invoiced
      for (const w of pendingWork) {
        await updateWorkItem({
          ...w,
          status: 'Invoiced',
          invoiceId: newInvoice.id
        });
      }

      // 3. Update client record with lastAutoInvoicedDate
      await updateClient({
        ...client,
        lastAutoInvoicedDate: todayYMD
      });

      localStorage.setItem(storageKey, 'true');

      generatedInvoices.push(newInvoice);
      summaryMessages.push(`Invoice #${newInvoice.id.substring(0, 8).toUpperCase()} (₹${totalAmount.toLocaleString('en-IN')}) auto-generated for ${client.name}`);
    } catch (err) {
      console.error(`[Auto-Invoice Engine] Failed to generate scheduled invoice for ${client.name}:`, err);
    }
  }

  return {
    generatedCount: generatedInvoices.length,
    invoices: generatedInvoices,
    summaryMessages
  };
}
