import React, { useState, useId } from 'react';
import { Invoice } from '../../types';
import { 
  MonthDataPoint, 
  buildMonthlyDataFromInvoices, 
  formatCurrency, 
  formatCompact, 
  calculateChange 
} from './chartUtils';
import { RevenueComparisonTable } from './RevenueComparisonTable';
import { RevenueScrubberColumns } from './RevenueScrubberColumns';
import { RevenueChartEmptyState } from './RevenueChartEmptyState';
import { RevenueChartHeader } from './RevenueChartHeader';

interface RevenueComparisonChartProps {
  invoices?: Invoice[];
  freelanceStartDate?: string | null;
  workItems?: { date?: string; createdAt?: number | string }[];
  onNavigateToInvoices?: () => void;
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Interactive monthly revenue comparison line chart.
 * Renders live monthly earnings and comparisons from user invoices starting from
 * when the freelancer started work up to the current date.
 * When an account is new with no invoice revenue, renders a clean empty state.
 * Strictly adheres to GEMINI.md design standards: steel blue (#4870aa), slate neutrals, no green.
 */
export default function RevenueComparisonChart({
  invoices = [],
  freelanceStartDate,
  workItems,
  onNavigateToInvoices,
}: RevenueComparisonChartProps) {
  const chartId = useId().replace(/:/g, '');
  const { data: months, hasData, hasPrevYearData } = React.useMemo(
    () => buildMonthlyDataFromInvoices(invoices, freelanceStartDate, workItems),
    [invoices, freelanceStartDate, workItems]
  );

  const [shown, setShown] = useState({ now: true, prev: true });
  const toggle = (key: 'now' | 'prev') => setShown((prev) => ({ ...prev, [key]: !prev[key] }));

  const [active, setActive] = useState<number | null>(null);
  const [point, setPoint] = useState(months.length - 1);
  const end = months.length - 1;

  const [tableOpen, setTableOpen] = useState(false);

  // If new account has no paid or invoiced records, render clean zero-state without mock numbers
  if (!hasData || months.length === 0) {
    return <RevenueChartEmptyState onNavigateToInvoices={onNavigateToInvoices} />;
  }

  const comparisonLabel = hasPrevYearData ? 'year before' : 'invoiced';

  // Dynamic maximum rounded to a clean increment
  const maxVal = Math.max(...months.map((m) => Math.max(m.now, m.prev, 1000)));
  const MAX = Math.ceil((maxVal * 1.15) / 10000) * 10000 || 80000;

  const x = (i: number) => r(((i + 0.5) / months.length) * 600);
  const y = (v: number) => r(200 - (v / MAX) * 200);
  const yAt = (v: number) => `${r(100 - (v / MAX) * 100)}%`;
  const left = (i: number) => `${r(((i + 0.5) / months.length) * 100)}%`;
  const line = (key: 'now' | 'prev') =>
    months.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p[key])}`).join(' ');

  const totalNow = months.reduce((acc, m) => acc + m.now, 0);
  const totalPrev = months.reduce((acc, m) => acc + m.prev, 0);
  const overallChange = calculateChange(totalNow, totalPrev);
  const last = months[months.length - 1];

  const label = (p: MonthDataPoint) => {
    const ch = calculateChange(p.now, p.prev);
    return `${p.month} ${p.year}: ${formatCurrency(p.now)}. ${p.prev ? `${comparisonLabel}: ${formatCurrency(p.prev)}.` : ''} ${ch >= 0 ? 'Up' : 'Down'} ${Math.abs(ch).toFixed(1)}%.`;
  };

  const pick = (i: number) => {
    setPoint(i);
    setActive(i);
  };

  const onScrubMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    pick(Math.max(0, Math.min(end, Math.floor(((event.clientX - box.left) / box.width) * (end + 1)))));
  };

  const onScrubLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    setActive(event.currentTarget.matches(':focus-visible') ? point : null);
  };

  const onScrubFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.matches(':focus-visible')) setActive(point);
  };

  const onScrubKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keyMap: Record<string, number> = {
      ArrowRight: point + 1,
      ArrowUp: point + 1,
      ArrowLeft: point - 1,
      ArrowDown: point - 1,
      Home: 0,
      End: end,
    };
    if (event.key === 'Escape') setActive(null);
    const to = keyMap[event.key];
    if (to === undefined) return;
    event.preventDefault();
    pick(Math.max(0, Math.min(end, to)));
  };

  return (
    <div className="flex flex-col min-w-0">
      <RevenueChartHeader
        chartId={chartId}
        overallChange={overallChange}
        comparisonLabel={comparisonLabel}
        totalNow={totalNow}
        totalPrev={totalPrev}
        shown={shown}
        toggle={toggle}
        hasPrevYearData={hasPrevYearData}
        monthsCount={months.length}
        startMonthLabel={months[0] ? `${months[0].shortMonth} ${months[0].year}` : undefined}
      />

      {/* SVG Plot & Scrubber */}
      <div className="pl-11 pr-2">
        <div
          id={`plot-${chartId}`}
          data-off-now={shown.now ? undefined : ''}
          data-off-prev={shown.prev ? undefined : ''}
          className="group/plot relative h-56 sm:h-64"
        >
          {/* Y-Axis Labels */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-full mr-2 flex flex-col justify-between text-right text-[11px] whitespace-nowrap text-slate-400 dark:text-slate-500 tabular-nums"
          >
            <span className="-mt-2">{formatCompact(MAX)}</span>
            <span>{formatCompact(MAX * 0.75)}</span>
            <span>{formatCompact(MAX * 0.5)}</span>
            <span>{formatCompact(MAX * 0.25)}</span>
            <span className="-mb-2">₹0</span>
          </div>

          <svg
            role="img"
            aria-label={`Monthly revenue comparison chart from ${months[0]?.month} to ${last?.month}`}
            viewBox="0 0 600 200"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <path
              d="M0 0H600M0 50H600M0 100H600M0 150H600"
              fill="none"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
              className="stroke-slate-100 dark:stroke-slate-700/60"
            />
            <path
              d="M0 200H600"
              fill="none"
              vectorEffect="non-scaling-stroke"
              className="stroke-slate-200 dark:stroke-slate-700"
            />
            <path
              d={`${line('now')} L${x(months.length - 1)} 200 L${x(0)} 200 Z`}
              className="fill-white/10 group-data-off-now/plot:hidden"
            />
            <path
              d={line('prev')}
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              className="stroke-white/70 group-data-off-prev/plot:hidden"
            />
            <path
              d={line('now')}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-white group-data-off-now/plot:hidden"
            />
          </svg>

          {/* End-of-line marker */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible group-data-off-now/plot:hidden"
          >
            <circle
              cx={left(months.length - 1)}
              cy={yAt(last.now)}
              r="4.5"
              strokeWidth="2"
              className="fill-white stroke-[#282828]"
            />
            <text
              x={left(months.length - 1)}
              y={yAt(last.now)}
              dx="-10"
              dy="-10"
              textAnchor="end"
              className="fill-slate-900 text-xs font-semibold tabular-nums group-has-[[data-active]]/plot:opacity-0 dark:fill-slate-100"
            >
              {formatCompact(last.now)}
            </text>
          </svg>

          {/* Interactive Scrubbing Columns & Tooltip */}
          <RevenueScrubberColumns
            months={months}
            active={active}
            yAt={yAt}
            comparisonLabel={comparisonLabel}
            hasPrevYearData={hasPrevYearData}
          />

          {/* Accessible Scrubber Slider Overlay */}
          <div
            id={`scrub-${chartId}`}
            role="slider"
            tabIndex={0}
            aria-label="Revenue by month scrubber. Use arrow keys to explore each month."
            aria-valuemin={1}
            aria-valuemax={months.length}
            aria-valuenow={point + 1}
            aria-valuetext={label(months[point])}
            onPointerDown={onScrubMove}
            onPointerMove={onScrubMove}
            onPointerLeave={onScrubLeave}
            onFocus={onScrubFocus}
            onBlur={() => setActive(null)}
            onKeyDown={onScrubKey}
            className="absolute inset-0 cursor-crosshair touch-pan-y rounded-md focus:outline-none"
          />
        </div>

        {/* X-Axis Month Abbreviations dynamically distributed */}
        <div
          aria-hidden="true"
          className="mt-2.5 flex text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums"
        >
          {months.map((p, i) => (
            <span
              key={`${p.year}-${p.month}-lbl`}
              className={`flex flex-1 min-w-0 justify-center whitespace-nowrap${
                months.length > 6 && (months.length - 1 - i) % 2 ? ' max-sm:invisible' : ''
              }`}
            >
              {p.shortMonth}
            </span>
          ))}
        </div>
      </div>

      {/* Footer & Toggle Table Button */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 dark:border-slate-700/60 pt-3">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          CrestFlow &middot; Paid invoices, net of refunds &middot; Updated {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        <button
          type="button"
          aria-expanded={tableOpen}
          onClick={() => setTableOpen(!tableOpen)}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-0 cursor-pointer transition-colors duration-120"
        >
          <svg className="size-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 9h18" />
            <path d="M9 3v18" />
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <span>{tableOpen ? 'Hide table' : 'View as table'}</span>
        </button>
      </div>

      {/* Expandable Data Table */}
      {tableOpen && (
        <RevenueComparisonTable months={months} hasPrevYearData={hasPrevYearData} />
      )}
    </div>
  );
}
