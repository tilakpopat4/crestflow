import React from 'react';

export interface TableSkeletonViewProps {
  title?: string;
  subtitle?: string;
  statusText?: string;
  columns?: number;
  rows?: number;
  className?: string;
}

/**
 * TableSkeletonView renders an authentic pulse skeleton layout for table-driven
 * tabs (Clients Directory, Invoice Generator, Work Logs, Admin).
 */
export const TableSkeletonView: React.FC<TableSkeletonViewProps> = ({
  title = 'Loading...',
  subtitle = 'Fetching records…',
  statusText = 'Loading table records…',
  columns = 5,
  rows = 5,
  className = '',
}) => {
  return (
    <div
      aria-busy="true"
      className={`p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0 select-none ${className}`}
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-8 w-48 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
          <div className="h-4 w-64 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800/80" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-lg bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
          <div className="h-9 w-24 rounded-lg bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
        </div>
      </div>

      <p role="status" className="sr-only">
        {statusText}
      </p>

      {/* Filter / Search Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="h-9 w-full sm:w-72 rounded-lg bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-lg bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
          <div className="h-9 w-20 rounded-lg bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
        </div>
      </div>

      {/* Data Table Skeleton */}
      <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden shadow-xs dark:bg-neutral-900 dark:border-neutral-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl table-fixed text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 dark:bg-neutral-900/80 dark:border-neutral-800">
              <tr>
                {Array.from({ length: columns }).map((_, idx) => (
                  <th key={idx} scope="col" className="px-4 py-3 first:pl-5 last:pr-5 text-left">
                    <div className="h-3.5 w-20 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody aria-hidden="true" className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {Array.from({ length: rows }).map((_, rIdx) => (
                <tr key={rIdx}>
                  <td className="px-4 py-3.5 whitespace-nowrap first:pl-5 last:pr-5">
                    <div className="h-3.5 w-24 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap first:pl-5 last:pr-5">
                    <div className="h-3.5 w-36 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap first:pl-5 last:pr-5">
                    <div className="h-3.5 w-20 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap first:pl-5 last:pr-5">
                    <div className="h-3.5 w-16 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap first:pl-5 last:pr-5">
                    <div className="h-6 w-20 rounded-full bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
