import React from 'react';
import { Skeleton } from './Skeleton';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0" aria-label="Loading dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-4" rounded="full" />
            </div>
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Chart Card */}
      <div className="p-5 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <div className="h-64 flex items-end gap-3 pt-6 px-2">
          {[40, 65, 30, 85, 50, 70, 90, 45, 60, 75, 55, 80].map((h, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton className="w-full" style={{ height: `${h}%` }} />
              <Skeleton className="h-2.5 w-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Top Clients & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Clients */}
        <div className="p-5 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#2a2a2a] last:border-0">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8" rounded="full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded border border-slate-100 dark:border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7" rounded="md" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
