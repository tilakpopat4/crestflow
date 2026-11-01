import React, { useState, useId } from 'react';
import { Invoice } from '../../types';
import { 
  MonthDataPoint, 
  buildMonthlyDataFromInvoices, 
  formatCurrency, 
  formatCompact, 
  calculateChange 
} from './chartUtils';

interface RevenueComparisonChartProps {
  invoices?: Invoice[];
  onNavigateToInvoices?: () => void;
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Interactive monthly revenue comparison line chart.
 * Replaces generic recharts with a lightweight, accessible SVG plot featuring
 * dual-series toggles, crosshair scrubber, live tooltips, and expandable tabular view.
 * Strictly adheres to GEMINI.md design standards: steel blue (#4870aa), slate neutrals, no green.
 */
export default function RevenueComparisonChart({
  invoices = [],
  onNavigateToInvoices,
}: RevenueComparisonChartProps) {
  const chartId = useId().replace(/:/g, '');
  const { data: months, isSampleData, hasPrevYearData } = React.useMemo(
    () => buildMonthlyDataFromInvoices(invoices),
    [invoices]
  );

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

  const [shown, setShown] = useState({ now: true, prev: true });
  const toggle = (key: 'now' | 'prev') => setShown((prev) => ({ ...prev, [key]: !prev[key] }));

  const [active, setActive] = useState<number | null>(null);
  const [point, setPoint] = useState(months.length - 1);
  const end = months.length - 1;

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

  const [tableOpen, setTableOpen] = useState(false);

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-6">
        <div className="max-w-xl min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net revenue by month, INR
            </p>
            {isSampleData && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                Benchmark Demo
              </span>
            )}
          </div>
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
            in the last 12 months against {formatCurrency(totalPrev)} in {comparisonLabel}.
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
            <span aria-hidden="true" className="flex size-3.5 shrink-0 items-center justify-center group-aria-[pressed=false]/key:opacity-30">
              <span className="h-0.5 w-3.5 shrink-0 rounded-full bg-[#4870aa] dark:bg-indigo-400" />
            </span>
            <span>Last 12 months</span>
          </button>

          <button
            type="button"
            aria-pressed={shown.prev}
            onClick={() => toggle('prev')}
            className="group/key inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 transition-colors duration-120 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-0 aria-[pressed=false]:text-slate-400 dark:aria-[pressed=false]:text-slate-500 aria-[pressed=false]:line-through"
          >
            <span aria-hidden="true" className="flex size-3.5 shrink-0 items-center justify-center group-aria-[pressed=false]/key:opacity-30">
              <span className="w-3.5 shrink-0 border-t-2 border-dashed border-slate-400 dark:border-slate-500" />
            </span>
            <span>{hasPrevYearData ? 'Year before' : 'Total Invoiced'}</span>
          </button>
        </div>
      </div>

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
              className="fill-[#4870aa]/5 group-data-off-now/plot:hidden dark:fill-indigo-400/10"
            />
            <path
              d={line('prev')}
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              className="stroke-slate-400 dark:stroke-slate-500 group-data-off-prev/plot:hidden"
            />
            <path
              d={line('now')}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-[#4870aa] group-data-off-now/plot:hidden dark:stroke-indigo-400"
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
              className="fill-[#4870aa] stroke-white dark:fill-indigo-400 dark:stroke-slate-800"
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
                      className="fill-[#4870aa] stroke-white group-data-off-now/plot:hidden dark:fill-indigo-400 dark:stroke-slate-800"
                    />
                  </svg>

                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-0 z-20 hidden w-44 rounded-lg bg-white dark:bg-slate-800 p-3 text-left text-xs shadow-md border border-slate-200 dark:border-slate-700 group-data-active/pt:block sm:w-48 ${
                      i < months.length / 2 ? 'left-[calc(50%+12px)]' : 'right-[calc(50%+12px)]'
                    }`}
                  >
                    <span className="block font-semibold text-slate-900 dark:text-slate-100">
                      {p.month} {p.year}
                    </span>
                    <span className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-slate-600 group-data-off-now/plot:hidden dark:text-slate-400">
                      <span className="h-0.5 w-3 shrink-0 rounded-full bg-[#4870aa] dark:bg-indigo-400" />
                      Paid
                      <span className="ml-auto pl-2 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatCurrency(p.now)}
                      </span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-slate-600 group-data-off-prev/plot:hidden dark:text-slate-400">
                      <span className="w-3 shrink-0 border-t-2 border-dashed border-slate-400 dark:border-slate-500" />
                      {hasPrevYearData ? `${p.year - 1}` : 'Invoiced'}
                      <span className="ml-auto pl-2 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatCurrency(p.prev)}
                      </span>
                    </span>
                    <span
                      className={`mt-2 block border-t border-slate-100 dark:border-slate-700 pt-1.5 font-medium group-data-off-now/plot:hidden group-data-off-prev/plot:hidden ${
                        ch < 0 ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {`${ch < 0 ? '↓' : '↑'} ${Math.abs(ch).toFixed(1)}% vs ${comparisonLabel}`}
                    </span>
                  </span>
                </span>
              );
            })}
          </div>

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

        {/* X-Axis Month Abbreviations */}
        <div
          aria-hidden="true"
          className="mt-2.5 grid grid-cols-12 text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums"
        >
          {months.map((p, i) => (
            <span
              key={`${p.year}-${p.month}-lbl`}
              className={`flex min-w-0 justify-center whitespace-nowrap${
                (months.length - 1 - i) % 2 ? ' max-sm:invisible' : ''
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
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-3.5 py-2">Month</th>
                <th scope="col" className="px-3.5 py-2 text-right">Paid Revenue</th>
                <th scope="col" className="px-3.5 py-2 text-right">{hasPrevYearData ? 'Year before' : 'Invoiced'}</th>
                <th scope="col" className="px-3.5 py-2 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
              {months.map((p) => {
                const ch = calculateChange(p.now, p.prev);
                return (
                  <tr key={`tbl-${p.year}-${p.month}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <th scope="row" className="px-3.5 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {p.shortMonth} {p.year}
                    </th>
                    <td className="px-3.5 py-2 text-right font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatCurrency(p.now)}
                    </td>
                    <td className="px-3.5 py-2 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatCurrency(p.prev)}
                    </td>
                    <td className={`px-3.5 py-2 text-right font-medium tabular-nums ${ch < 0 ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {`${ch < 0 ? '−' : '+'}${Math.abs(ch).toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
