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

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-6">
      <div className="max-w-xl min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Net revenue by month, INR
        </p>
        <h3
          id={`chart-title-${chartId}`}
          className="mt-1 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          {overallChange >= 0
            ? `Revenue is ${overallChange.toFixed(0)}% ahead of ${comparisonLabel}`
            : `Revenue is ${Math.abs(overallChange).toFixed(0)}% behind ${comparisonLabel}`}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatCurrency(totalNow)}
          </span>{' '}
          {periodDescription} against {formatCurrency(totalPrev)} in {comparisonLabel}.
        </p>
      </div>

      {/* Series Toggles */}
      <div role="group" aria-label="Series shown" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={shown.now}
          onClick={() => toggle('now')}
          className="group/key inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 transition-colors duration-120 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-0 aria-[pressed=false]:text-slate-400 dark:aria-[pressed=false]:text-slate-500 aria-[pressed=false]:line-through"
        >
          <span
            aria-hidden="true"
            className="flex size-3.5 shrink-0 items-center justify-center group-aria-[pressed=false]/key:opacity-30"
          >
            <span className="h-0.5 w-3.5 shrink-0 rounded-full bg-[#3ea6ff] dark:bg-indigo-400" />
          </span>
          <span>{seriesButtonLabel}</span>
        </button>

        <button
          type="button"
          aria-pressed={shown.prev}
          onClick={() => toggle('prev')}
          className="group/key inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 transition-colors duration-120 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-0 aria-[pressed=false]:text-slate-400 dark:aria-[pressed=false]:text-slate-500 aria-[pressed=false]:line-through"
        >
          <span
            aria-hidden="true"
            className="flex size-3.5 shrink-0 items-center justify-center group-aria-[pressed=false]/key:opacity-30"
          >
            <span className="w-3.5 shrink-0 border-t-2 border-dashed border-slate-400 dark:border-slate-500" />
          </span>
          <span>{hasPrevYearData ? 'Year before' : 'Total Invoiced'}</span>
        </button>
      </div>
    </div>
  );
};

export default RevenueChartHeader;
