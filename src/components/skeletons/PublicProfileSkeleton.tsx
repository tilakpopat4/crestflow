import React from 'react';
import { Skeleton } from './Skeleton';

export const PublicProfileSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-slate-100 p-4 sm:p-8" aria-label="Loading profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Card */}
        <div className="p-8 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
          <Skeleton className="h-24 w-24" rounded="full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-36 mx-auto sm:mx-0" />
            <Skeleton className="h-3.5 w-64 mx-auto sm:mx-0" />
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              <Skeleton className="h-5 w-20" rounded="sm" />
              <Skeleton className="h-5 w-24" rounded="sm" />
              <Skeleton className="h-5 w-28" rounded="sm" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" rounded="md" />
        </div>

        {/* Portfolio & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-2.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-4/6" />
            </div>
          </div>
          <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-4">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#2a2a2a] last:border-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
