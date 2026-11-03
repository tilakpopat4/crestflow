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
 * Computes calendar months of invoice earnings from live invoices starting from
 * when the freelancer started their work (freelanceStartDate or earliest invoice/work activity),
 * up to the current month (capped at a rolling 12 months max).
 * Does not display months prior to the freelancer starting their work.
 * Returns hasData: false when the account has no paid or invoiced records yet.
 */
export function buildMonthlyDataFromInvoices(
  invoices: Invoice[] = [],
  freelanceStartDate?: string | null,
  workItems?: { date?: string; createdAt?: number | string }[]
): {
  data: MonthDataPoint[];
  hasData: boolean;
  hasPrevYearData: boolean;
} {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTwelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // Collect candidate start dates to find when the freelancer started work
  const candidateDates: Date[] = [];

  // 1. Career start date explicitly defined in freelancer profile
  if (freelanceStartDate && typeof freelanceStartDate === 'string') {
    const parts = freelanceStartDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) candidateDates.push(dt);
    } else {
      const dt = new Date(freelanceStartDate);
      if (!isNaN(dt.getTime())) candidateDates.push(dt);
    }
  }

  // 2. Dates from invoices (creation, invoice date, payment date)
  if (invoices && invoices.length > 0) {
    invoices.forEach((inv) => {
      if (inv.date) {
        const d = new Date(inv.date);
        if (!isNaN(d.getTime())) candidateDates.push(d);
      }
      if (inv.lastPaymentDate) {
        const d = new Date(inv.lastPaymentDate);
        if (!isNaN(d.getTime())) candidateDates.push(d);
      }
      if (inv.createdAt) {
        const d = new Date(inv.createdAt);
        if (!isNaN(d.getTime())) candidateDates.push(d);
      }
    });
  }

  // 3. Dates from work items
  if (workItems && workItems.length > 0) {
    workItems.forEach((w) => {
      if (w.date) {
        const d = new Date(w.date);
        if (!isNaN(d.getTime())) candidateDates.push(d);
      }
      if (w.createdAt) {
        const d = new Date(w.createdAt);
        if (!isNaN(d.getTime())) candidateDates.push(d);
      }
    });
  }

  // Determine earliest start month
  let effectiveStartMonth = defaultTwelveMonthsAgo;
  if (candidateDates.length > 0) {
    const earliestTimestamp = Math.min(...candidateDates.map((d) => d.getTime()));
    const earliestDate = new Date(earliestTimestamp);
    const earliestMonthStart = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);

    if (earliestMonthStart > defaultTwelveMonthsAgo && earliestMonthStart <= currentMonthStart) {
      effectiveStartMonth = earliestMonthStart;
    } else if (earliestMonthStart > currentMonthStart) {
      effectiveStartMonth = currentMonthStart;
    }
  }

  // Calculate month count from effectiveStartMonth to current month (inclusive)
  const totalMonthsDiff =
    (currentMonthStart.getFullYear() - effectiveStartMonth.getFullYear()) * 12 +
    (currentMonthStart.getMonth() - effectiveStartMonth.getMonth()) +
    1;

  const monthsCount = Math.max(1, Math.min(12, totalMonthsDiff));
  const months: MonthDataPoint[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
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

        // Current months match
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

  // If no explicit career start date was configured in profile, only show from the month
  // the freelancer actually had their first invoice or paid activity (never show months before work started)
  let resultMonths = months;
  if (!freelanceStartDate) {
    const firstActiveIndex = months.findIndex((m) => m.now > 0 || m.invoiced > 0);
    if (firstActiveIndex > 0) {
      resultMonths = months.slice(firstActiveIndex);
    }
  }

  return { data: resultMonths, hasData, hasPrevYearData };
}
