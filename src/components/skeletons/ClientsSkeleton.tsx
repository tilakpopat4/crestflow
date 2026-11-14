import React from 'react';
import { Skeleton } from './Skeleton';

export const ClientsSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0" aria-label="Loading clients">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-48 sm:w-64" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Quick stats or status filter row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-7 w-20" rounded="md" />
        <Skeleton className="h-7 w-24" rounded="md" />
        <Skeleton className="h-7 w-20" rounded="md" />
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4"
          >
            {/* Top row: Avatar & Client Name & Action menu */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="w-11 h-11 shrink-0" rounded="lg" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-6" rounded="md" />
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-[#2a2a2a]" />

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>

            {/* Footer action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#2a2a2a]">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-24" rounded="md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
