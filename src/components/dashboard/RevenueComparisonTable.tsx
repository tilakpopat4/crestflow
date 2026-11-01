import React from 'react';
import { MonthDataPoint, formatCurrency, calculateChange } from './chartUtils';

interface RevenueComparisonTableProps {
  months: MonthDataPoint[];
  hasPrevYearData: boolean;
}

export const RevenueComparisonTable: React.FC<RevenueComparisonTableProps> = ({
  months,
  hasPrevYearData,
}) => {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-3.5 py-2">Month</th>
            <th scope="col" className="px-3.5 py-2 text-right">Paid Revenue</th>
            <th scope="col" className="px-3.5 py-2 text-right">
              {hasPrevYearData ? 'Year before' : 'Invoiced'}
            </th>
            <th scope="col" className="px-3.5 py-2 text-right">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
          {months.map((p) => {
            const ch = calculateChange(p.now, p.prev);
            return (
              <tr
                key={`tbl-${p.year}-${p.month}`}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              >
                <th
                  scope="row"
                  className="px-3.5 py-2 font-medium text-slate-900 dark:text-slate-100"
                >
                  {p.shortMonth} {p.year}
                </th>
                <td className="px-3.5 py-2 text-right font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatCurrency(p.now)}
                </td>
                <td className="px-3.5 py-2 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatCurrency(p.prev)}
                </td>
                <td
                  className={`px-3.5 py-2 text-right font-medium tabular-nums ${
                    ch < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {`${ch < 0 ? '−' : '+'}${Math.abs(ch).toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RevenueComparisonTable;
