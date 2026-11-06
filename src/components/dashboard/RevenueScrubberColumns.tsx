import React from 'react';
import { MonthDataPoint, formatCurrency, calculateChange } from './chartUtils';

interface RevenueScrubberColumnsProps {
  months: MonthDataPoint[];
  active: number | null;
  yAt: (v: number) => string;
  comparisonLabel: string;
  hasPrevYearData: boolean;
}

export const RevenueScrubberColumns: React.FC<RevenueScrubberColumnsProps> = ({
  months,
  active,
  yAt,
  comparisonLabel,
  hasPrevYearData,
}) => {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex">
      {months.map((p, i) => {
        const ch = calculateChange(p.now, p.prev);
        return (
          <span
            key={`${p.year}-${p.month}`}
            data-active={i === active ? '' : undefined}
            className="group/pt relative min-w-0 flex-1"
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden size-full overflow-visible group-data-active/pt:block"
            >
              <line
                x1="50%"
                x2="50%"
                y1="0"
                y2="100%"
                className="stroke-slate-300 dark:stroke-slate-600"
              />
              <circle
                cx="50%"
                cy={yAt(p.prev)}
                r="3.5"
                strokeWidth="2"
                className="fill-slate-400 stroke-white group-data-off-prev/plot:hidden dark:stroke-slate-800"
              />
              <circle
                cx="50%"
                cy={yAt(p.now)}
                r="4.5"
                strokeWidth="2"
                className="fill-white stroke-[#282828] group-data-off-now/plot:hidden"
              />
            </svg>

            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-0 z-20 hidden w-44 rounded-lg bg-[#282828] p-3 text-left text-xs shadow-md border border-[#444444] group-data-active/pt:block sm:w-48 ${
                i < months.length / 2 ? 'left-[calc(50%+12px)]' : 'right-[calc(50%+12px)]'
              }`}
            >
              <span className="block font-semibold text-white">
                {p.month} {p.year}
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-slate-300 group-data-off-now/plot:hidden">
                <span className="h-0.5 w-3 shrink-0 rounded-full bg-white" />
                Paid
                <span className="ml-auto pl-2 font-semibold text-white tabular-nums">
                  {formatCurrency(p.now)}
                </span>
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-slate-300 group-data-off-prev/plot:hidden">
                <span className="w-3 shrink-0 border-t-2 border-dashed border-white/70" />
                {hasPrevYearData ? `${p.year - 1}` : 'Invoiced'}
                <span className="ml-auto pl-2 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatCurrency(p.prev)}
                </span>
              </span>
              <span
                className={`mt-2 block border-t border-slate-100 dark:border-slate-700 pt-1.5 font-medium group-data-off-now/plot:hidden group-data-off-prev/plot:hidden ${
                  ch < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {`${ch < 0 ? '↓' : '↑'} ${Math.abs(ch).toFixed(1)}% vs ${comparisonLabel}`}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default RevenueScrubberColumns;

