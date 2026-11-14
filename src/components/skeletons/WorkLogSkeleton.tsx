import React from 'react';
import { Skeleton } from './Skeleton';

export const WorkLogSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0" aria-label="Loading work logs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-44 sm:w-56" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Filter and control pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Work Table Container */}
      <div className="rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] overflow-hidden">
        {/* Table Header Row */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-[#383838] bg-slate-50/50 dark:bg-[#262626]">
          <div className="col-span-1 flex items-center">
            <Skeleton className="h-4 w-4" rounded="sm" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="col-span-4">
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="col-span-2 flex justify-end">
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Table Body Rows */}
        <div className="divide-y divide-slate-100 dark:divide-[#2a2a2a]">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="grid grid-cols-12 gap-3 px-5 py-4 items-center">
              <div className="col-span-1 flex items-center">
                <Skeleton className="h-4 w-4" rounded="sm" />
              </div>
              <div className="col-span-3 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <div className="col-span-4 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <div className="col-span-2 space-y-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-2.5 w-14" />
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <Skeleton className="h-7 w-7" rounded="md" />
                <Skeleton className="h-7 w-7" rounded="md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
