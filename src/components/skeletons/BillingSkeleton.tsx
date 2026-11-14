import React from 'react';
import { Skeleton } from './Skeleton';

export const BillingSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0" aria-label="Loading billing">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Active Membership Hero Card */}
      <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16" rounded="sm" />
            </div>
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-[#2a2a2a] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>

      {/* Payment History Card */}
      <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="divide-y divide-slate-100 dark:divide-[#2a2a2a]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-3.5 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-14" rounded="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
