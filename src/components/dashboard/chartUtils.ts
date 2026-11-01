import { Invoice } from '../../types';

export interface MonthDataPoint {
  month: string;
  shortMonth: string;
  year: number;
  now: number;
  prev: number;
  invoiced: number;
}

export function formatCurrency(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function formatCompact(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

export function calculateChange(now: number, prev: number): number {
  if (!prev) return now > 0 ? 100 : 0;
  return ((now - prev) / prev) * 100;
}

/**
 * Computes 12 continuous calendar months of invoice earnings from live invoices.
 * Returns hasData: false when the account has no paid or invoiced records yet.
 */
export function buildMonthlyDataFromInvoices(invoices: Invoice[]): {
  data: MonthDataPoint[];
  hasData: boolean;
  hasPrevYearData: boolean;
} {
  const now = new Date();
  const months: MonthDataPoint[] = [];

  // Seed last 12 calendar months ending at current month
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleDateString('en-US', { month: 'long' });
    const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
    months.push({
      month: monthName,
      shortMonth,
      year: d.getFullYear(),
      now: 0,
      prev: 0,
      invoiced: 0,
    });
  }

  let totalPrevYearPaid = 0;

  if (invoices && invoices.length > 0) {
    invoices.forEach((inv) => {
      if (!inv.date) return;
      const invDate = new Date(inv.date);
      const amt = Number(inv.totalAmount) || 0;

      // Track Invoiced by invoice creation date
      const targetMonth = months.find(
        (m) =>
          m.year === invDate.getFullYear() &&
          m.month === invDate.toLocaleDateString('en-US', { month: 'long' })
      );
      if (targetMonth) {
        targetMonth.invoiced += amt;
      }

      // Track Paid Earnings by lastPaymentDate (or invDate if paid)
      if (inv.status === 'Paid') {
        const payDate = inv.lastPaymentDate ? new Date(inv.lastPaymentDate) : invDate;
        const payMonthName = payDate.toLocaleDateString('en-US', { month: 'long' });
        const payYear = payDate.getFullYear();

        // Current 12 months match
        const currentSlot = months.find((m) => m.year === payYear && m.month === payMonthName);
        if (currentSlot) {
          currentSlot.now += amt;
        }

        // Check if this payment belongs to the prior year (same month, year - 1)
        const prevSlot = months.find((m) => m.year - 1 === payYear && m.month === payMonthName);
        if (prevSlot) {
          prevSlot.prev += amt;
          totalPrevYearPaid += amt;
        }
      }
    });
  }

  const hasPrevYearData = totalPrevYearPaid > 0;

  // If there is no previous year data at all, populate prev with totalInvoiced so comparison is meaningful
  if (!hasPrevYearData) {
    months.forEach((m) => {
      m.prev = m.invoiced;
    });
  }

  const totalPaid = months.reduce((acc, m) => acc + m.now, 0);
  const totalInvoiced = months.reduce((acc, m) => acc + m.invoiced, 0);
  const hasData = totalPaid > 0 || totalInvoiced > 0;

  return { data: months, hasData, hasPrevYearData };
}
