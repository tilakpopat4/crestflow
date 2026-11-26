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
    <div className="mt-3 overflow-x-auto rounded-lg border border-[#2A2A33] dark:border-[#2A2A33]">
      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead className="bg-[#131318] dark:bg-[#1B1B22]/80 text-[11px] uppercase tracking-wider font-semibold text-[#A1A1AA] dark:text-[#A1A1AA]">
          <tr>
            <th scope="col" className="px-3.5 py-2">Month</th>
            <th scope="col" className="px-3.5 py-2 text-right">Paid Revenue</th>
            <th scope="col" className="px-3.5 py-2 text-right">
              {hasPrevYearData ? 'Year before' : 'Invoiced'}
            </th>
            <th scope="col" className="px-3.5 py-2 text-right">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2A33] dark:divide-[#2A2A33] text-[#A1A1AA] dark:text-[#A1A1AA]">
          {months.map((p) => {
            const ch = calculateChange(p.now, p.prev);
            return (
              <tr
                key={`tbl-${p.year}-${p.month}`}
                className="hover:bg-[#131318]/50 dark:hover:bg-[#1B1B22]"
              >
                <th
                  scope="row"
                  className="px-3.5 py-2 font-medium text-[#F7F7F8] dark:text-[#F7F7F8]"
                >
                  {p.shortMonth} {p.year}
                </th>
                <td className="px-3.5 py-2 text-right font-medium text-[#F7F7F8] dark:text-[#F7F7F8] tabular-nums">
                  {formatCurrency(p.now)}
                </td>
                <td className="px-3.5 py-2 text-right text-[#A1A1AA] dark:text-[#A1A1AA] tabular-nums">
                  {formatCurrency(p.prev)}
                </td>
                <td
                  className={`px-3.5 py-2 text-right font-medium tabular-nums ${
                    ch < 0
                      ? 'text-[#E0002B] dark:text-[#F0607A]'
                      : 'text-[#FF2D4A] dark:text-[#FF2D4A]'
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

