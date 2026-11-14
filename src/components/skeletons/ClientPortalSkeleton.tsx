import React from 'react';
import { Skeleton } from './Skeleton';

export const ClientPortalSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-slate-100 p-4 sm:p-8" aria-label="Loading client portal">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Portal Header */}
        <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton className="h-12 w-12" rounded="lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" rounded="md" />
            <Skeleton className="h-8 w-28" rounded="md" />
          </div>
        </div>

        {/* Status & Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>

        {/* Deliverables Section */}
        <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-md border border-slate-100 dark:border-[#2a2a2a] space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16" rounded="sm" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-7 w-20" rounded="md" />
                  <Skeleton className="h-7 w-24" rounded="md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
