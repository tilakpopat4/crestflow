import React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

/**
 * Standard Design System DataTable.
 * Uses surface-600 headers, uppercase column labels, surface-500 row hover,
 * and tabular numeric right alignment.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-xl border border-surface-400 bg-surface-700 select-none",
        className
      )}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-surface-400 bg-surface-600/70">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  "py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary select-none whitespace-nowrap",
                  col.align === 'right' && "text-right",
                  col.align === 'center' && "text-center",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-400/60 text-xs">
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row, idx)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "transition-colors duration-120 group",
                onRowClick ? "cursor-pointer hover:bg-surface-500/70" : "hover:bg-surface-600/30"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-3 px-3.5 text-text-primary whitespace-nowrap",
                    col.align === 'right' && "text-right font-mono tabular-nums",
                    col.align === 'center' && "text-center",
                    col.className
                  )}
                >
                  {col.render ? col.render(row, idx) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
