import { Invoice } from '../../types';

export interface MonthDataPoint {
  month: string;
  shortMonth: string;
  year: number;
  now: number;
  prev: number;
  invoiced: number;
}

export const DEFAULT_SAMPLE_MONTHS: MonthDataPoint[] = [
  { month: 'November', shortMonth: 'Nov', year: 2025, now: 38240, prev: 33120, invoiced: 41000 },
  { month: 'December', shortMonth: 'Dec', year: 2025, now: 41530, prev: 35870, invoiced: 44000 },
  { month: 'January', shortMonth: 'Jan', year: 2026, now: 39810, prev: 33040, invoiced: 42000 },
  { month: 'February', shortMonth: 'Feb', year: 2026, now: 43160, prev: 35460, invoiced: 46000 },
  { month: 'March', shortMonth: 'Mar', year: 2026, now: 46920, prev: 38910, invoiced: 50000 },
  { month: 'April', shortMonth: 'Apr', year: 2026, now: 45280, prev: 37650, invoiced: 48000 },
  { month: 'May', shortMonth: 'May', year: 2026, now: 49870, prev: 40280, invoiced: 53000 },
  { month: 'June', shortMonth: 'Jun', year: 2026, now: 52410, prev: 42830, invoiced: 55000 },
  { month: 'July', shortMonth: 'Jul', year: 2026, now: 51190, prev: 41970, invoiced: 54000 },
  { month: 'August', shortMonth: 'Aug', year: 2026, now: 55740, prev: 44510, invoiced: 58000 },
  { month: 'September', shortMonth: 'Sep', year: 2026, now: 58360, prev: 46190, invoiced: 61000 },
  { month: 'October', shortMonth: 'Oct', year: 2026, now: 61980, prev: 49260, invoiced: 65000 },
];

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
 * Computes 12 continuous calendar months of invoice earnings.
 * If user has no paid or invoiced records, falls back to standard demo data.
 */
export function buildMonthlyDataFromInvoices(invoices: Invoice[]): {
  data: MonthDataPoint[];
  isSampleData: boolean;
  hasPrevYearData: boolean;
} {
  const hasAnyInvoices = invoices && invoices.length > 0 && invoices.some(i => (Number(i.totalAmount) || 0) > 0);
  if (!hasAnyInvoices) {
    return { data: DEFAULT_SAMPLE_MONTHS, isSampleData: true, hasPrevYearData: true };
  }

  const now = new Date();
  const months: MonthDataPoint[] = [];

  // Seed last 12 calendar months
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

  invoices.forEach(inv => {
    if (!inv.date) return;
    const invDate = new Date(inv.date);
    const amt = Number(inv.totalAmount) || 0;

    // Track Invoiced by invoice creation date
    const targetMonth = months.find(m => m.year === invDate.getFullYear() && m.month === invDate.toLocaleDateString('en-US', { month: 'long' }));
    if (targetMonth) {
      targetMonth.invoiced += amt;
    }

    // Track Paid Earnings by lastPaymentDate (or invDate if paid)
    if (inv.status === 'Paid') {
      const payDate = inv.lastPaymentDate ? new Date(inv.lastPaymentDate) : invDate;
      const payMonthName = payDate.toLocaleDateString('en-US', { month: 'long' });
      const payYear = payDate.getFullYear();

      // Current 12 months match
      const currentSlot = months.find(m => m.year === payYear && m.month === payMonthName);
      if (currentSlot) {
        currentSlot.now += amt;
      }

      // Check if this payment belongs to the prior year (same month, year - 1)
      const prevSlot = months.find(m => m.year - 1 === payYear && m.month === payMonthName);
      if (prevSlot) {
        prevSlot.prev += amt;
        totalPrevYearPaid += amt;
      }
    }
  });

  const hasPrevYearData = totalPrevYearPaid > 0;

  // If there is no previous year data at all, populate prev with totalInvoiced so comparison is meaningful
  if (!hasPrevYearData) {
    months.forEach(m => {
      m.prev = m.invoiced;
    });
  }

  // If all months have 0 paid and 0 invoiced, return sample data
  const totalPaid = months.reduce((acc, m) => acc + m.now, 0);
  const totalInvoiced = months.reduce((acc, m) => acc + m.invoiced, 0);
  if (totalPaid === 0 && totalInvoiced === 0) {
    return { data: DEFAULT_SAMPLE_MONTHS, isSampleData: true, hasPrevYearData: true };
  }

  return { data: months, isSampleData: false, hasPrevYearData };
}
