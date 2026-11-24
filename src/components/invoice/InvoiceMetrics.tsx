import React from 'react';
import { IndianRupee, Clock, CheckCircle2, FileText } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface InvoiceMetricsProps {
  totalEarned: number;
  pendingAmount: number;
  totalInvoiced: number;
  paidCount: number;
  pendingCount: number;
  totalCount: number;
  currency?: string;
}

/**
 * Top KPI metrics row for the Invoices tab.
 */
export function InvoiceMetrics({
  totalEarned,
  pendingAmount,
  totalInvoiced,
  paidCount,
  pendingCount,
  totalCount,
  currency,
}: InvoiceMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
      <StatCard
        label="Total Earned"
        value={formatCurrencyAmount(totalEarned, currency)}
        icon={IndianRupee}
        subtext={`${paidCount} paid`}
        className="border-0 shadow-none"
      />

      <StatCard
        label="Pending"
        value={formatCurrencyAmount(pendingAmount, currency)}
        icon={Clock}
        alert={pendingAmount > 0}
        subtext={`${pendingCount} awaiting`}
        className="border-0 shadow-none"
      />

      <StatCard
        label="Total Invoiced"
        value={formatCurrencyAmount(totalInvoiced, currency)}
        icon={CheckCircle2}
        className="border-0 shadow-none"
      />

      <StatCard
        label="Invoices"
        value={totalCount}
        icon={FileText}
        className="border-0 shadow-none"
      />
    </div>
  );
}

export default InvoiceMetrics;
