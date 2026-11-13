import React from 'react';

export interface CardListAndTableSkeletonsProps {
  title?: string;
  subtitle?: string;
  statusText?: string;
  className?: string;
}

/**
 * CardListAndTableSkeletons provides high-fidelity, layout-matched pulse skeletons
 * for dashboard overviews, metric cards, recent transaction lists, and data tables.
 */
export default function CardListAndTableSkeletons({
  title = 'Overview',
  subtitle = 'Loading metrics & recent activity…',
  statusText = 'Loading overview…',
  className = '',
}: CardListAndTableSkeletonsProps) {
  return (
    <div
      aria-busy="true"
      className={`p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0 select-none ${className}`}
    >
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <div className="h-7 w-44 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
          <div className="h-4 w-32 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800/80" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
      </div>

      <p role="status" className="sr-only">
        {statusText}
      </p>

      {/* Grid: 2 Metric Cards + 1 Recent Activity List */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Metric Cards Column */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {/* Card 1 */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
            <div aria-hidden="true" className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="h-3.5 w-32 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                <div className="size-8 rounded-lg bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
              </div>
              <div className="h-7 w-28 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
              <div className="h-3 w-36 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
            <div aria-hidden="true" className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="h-3.5 w-24 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                <div className="size-8 rounded-lg bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
              </div>
              <div className="h-7 w-28 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
              <div className="h-3 w-32 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
            </div>
          </div>
        </div>

        {/* Recent Payments List Column */}
        <div className="min-w-0 rounded-xl bg-white shadow-xs border border-neutral-200 lg:col-span-2 dark:bg-neutral-900 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <div className="h-4 w-32 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
            <div className="h-3.5 w-16 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
          </div>
          <ul aria-hidden="true" className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {[1, 2, 3, 4].map((item) => (
              <li key={item} className="flex items-center gap-3 px-5 py-3">
                <div className="size-8 shrink-0 rounded-full bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  <div className="h-3 w-40 max-w-full rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
                </div>
                <div className="h-3.5 w-16 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
              </li>
            ))}
          </ul>
        </div>

        {/* Full-Width Invoices Table Section */}
        <div className="min-w-0 rounded-xl bg-white shadow-xs border border-neutral-200 lg:col-span-3 dark:bg-neutral-900 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <div className="h-4 w-24 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
            <div className="h-3.5 w-16 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl table-fixed text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th scope="col" className="w-28 px-4 py-2.5 text-left first:pl-5 last:pr-5">
                    <div className="h-3 w-14 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left first:pl-5 last:pr-5">
                    <div className="h-3 w-20 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </th>
                  <th scope="col" className="w-24 px-4 py-2.5 text-left first:pl-5 last:pr-5">
                    <div className="h-3 w-12 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </th>
                  <th scope="col" className="w-28 px-4 py-2.5 text-right first:pl-5 last:pr-5">
                    <div className="ml-auto h-3 w-16 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </th>
                  <th scope="col" className="w-32 px-4 py-2.5 text-left first:pl-5 last:pr-5">
                    <div className="h-3 w-14 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                  </th>
                </tr>
              </thead>
              <tbody aria-hidden="true" className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {[1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    <td className="px-4 py-3 whitespace-nowrap first:pl-5 last:pr-5">
                      <div className="h-3.5 w-16 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap first:pl-5 last:pr-5">
                      <div className="h-3.5 w-28 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap first:pl-5 last:pr-5">
                      <div className="h-3.5 w-12 rounded-md bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap first:pl-5 last:pr-5">
                      <div className="ml-auto h-3.5 w-16 rounded-md bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap first:pl-5 last:pr-5">
                      <div className="h-6 w-20 rounded-full bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-800" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
