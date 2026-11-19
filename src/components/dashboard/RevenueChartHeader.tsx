import React from 'react';
import { formatCurrency } from './chartUtils';

interface RevenueChartHeaderProps {
  chartId: string;
  overallChange: number;
  comparisonLabel: string;
  totalNow: number;
  totalPrev: number;
  shown: { now: boolean; prev: boolean };
  toggle: (key: 'now' | 'prev') => void;
  hasPrevYearData: boolean;
  monthsCount?: number;
  startMonthLabel?: string;
}

export const RevenueChartHeader: React.FC<RevenueChartHeaderProps> = ({
  chartId,
  overallChange,
  comparisonLabel,
  totalNow,
  totalPrev,
  shown,
  toggle,
  hasPrevYearData,
  monthsCount = 12,
  startMonthLabel,
}) => {
  const periodDescription =
    monthsCount === 12
      ? 'in the last 12 months'
      : `across the last ${monthsCount} month${monthsCount === 1 ? '' : 's'}${
          startMonthLabel ? ` (since ${startMonthLabel})` : ''
        }`;

  const seriesButtonLabel =
    monthsCount === 12 ? 'Last 12 months' : `Last ${monthsCount} month${monthsCount === 1 ? '' : 's'}`;

  // Formulate natural headline across all possible states
  let headline = '';
  if (totalNow === 0 && totalPrev === 0) {
    headline = 'No revenue or invoices recorded yet';
  } else if (totalPrev === 0) {
    headline = `Collected ${formatCurrency(totalNow)}`;
  } else if (totalNow === 0) {
    headline = `Collected ₹0 of ${formatCurrency(totalPrev)} ${comparisonLabel} (0% collected)`;
  } else if (overallChange === 0) {
    headline = `Collected ${formatCurrency(totalNow)} of ${formatCurrency(totalPrev)} ${comparisonLabel} (100% matched)`;
  } else if (overallChange > 0) {
    headline = `Collected ${formatCurrency(totalNow)} of ${formatCurrency(totalPrev)} ${comparisonLabel} (+${overallChange.toFixed(0)}% ahead)`;
  } else {
    headline = `Collected ${formatCurrency(totalNow)} of ${formatCurrency(totalPrev)} ${comparisonLabel} (${Math.abs(overallChange).toFixed(0)}% behind)`;
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-6">
      <div className="max-w-xl min-w-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          Net revenue by month, INR
        </p>
        <h3
          id={`chart-title-${chartId}`}
          className="mt-1 text-base sm:text-lg font-semibold text-text-primary tracking-tight"
        >
          {headline}
        </h3>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold font-mono tabular-nums text-text-primary">
            {formatCurrency(totalNow)}
          </span>{' '}
          {periodDescription}
          {totalPrev > 0 ? (
            <>
              {' '}against{' '}
              <span className="font-semibold font-mono tabular-nums text-text-primary">
                {formatCurrency(totalPrev)}
              </span>{' '}
              in {comparisonLabel}.
            </>
          ) : (
            '.'
          )}
        </p>
      </div>

      {/* Series Toggles */}
      <div role="group" aria-label="Series shown" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={shown.now}
          onClick={() => toggle('now')}
          className="group/key inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap text-text-primary bg-surface-600 hover:bg-surface-500 border border-surface-400 transition-colors duration-150 aria-[pressed=false]:text-text-muted aria-[pressed=false]:border-transparent aria-[pressed=false]:bg-transparent aria-[pressed=false]:line-through"
        >
          <span
            aria-hidden="true"
            className="flex size-3.5 shrink-0 items-center justify-center group-aria-[pressed=false]/key:opacity-30"
          >
            <span className="h-0.5 w-3.5 shrink-0 rounded-full bg-text-primary" />
          </span>
          <span>{seriesButtonLabel}</span>
        </button>

        <button
          type="button"
          aria-pressed={shown.prev}
          onClick={() => toggle('prev')}
          className="group/key inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap text-text-primary bg-surface-600 hover:bg-surface-500 border border-surface-400 transition-colors duration-150 aria-[pressed=false]:text-text-muted aria-[pressed=false]:border-transparent aria-[pressed=false]:bg-transparent aria-[pressed=false]:line-through"
        >
          <span
            aria-hidden="true"
            className="flex size-3.5 shrink-0 items-center justify-center group-aria-[pressed=false]/key:opacity-30"
          >
            <span className="w-3.5 shrink-0 border-t-2 border-dashed border-text-secondary" />
          </span>
          <span>{hasPrevYearData ? 'Year before' : 'Total Invoiced'}</span>
        </button>
      </div>
    </div>
  );
};

export default RevenueChartHeader;
