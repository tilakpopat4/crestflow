import React from 'react';

interface RevenueChartEmptyStateProps {
  onNavigateToInvoices?: () => void;
}

export const RevenueChartEmptyState: React.FC<RevenueChartEmptyStateProps> = ({
  onNavigateToInvoices,
}) => {
  return (
    <div className="flex flex-col min-w-0 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] uppercase tracking-wider">
            Monthly Earnings Trend
          </h3>
          <p className="text-[11px] sm:text-xs text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5">
            Track paid earnings vs total invoiced revenue over time
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[240px] sm:min-h-[280px] flex flex-col items-center justify-center text-sm text-[#A1A1AA] dark:text-[#A1A1AA] text-center py-12 space-y-2">
        <p>
          No monthly invoice data yet.
          <br />
          Generate invoices to render the earnings line chart.
        </p>
        {onNavigateToInvoices && (
          <button
            type="button"
            onClick={onNavigateToInvoices}
            className="text-xs font-semibold text-[#FF2D4A] dark:text-[#FF2D4A] hover:underline cursor-pointer border-0 bg-transparent"
          >
            Go to Invoicing &rarr;
          </button>
        )}
      </div>
    </div>
  );
};

export default RevenueChartEmptyState;

