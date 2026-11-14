import React from 'react';
import { Skeleton } from './Skeleton';

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0" aria-label="Loading profile">
      {/* Header Bar */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-60" />
      </div>

      {/* Main Profile Identity Card */}
      <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Skeleton className="h-20 w-20" rounded="full" />
          <div className="space-y-2 text-center sm:text-left">
            <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
            <Skeleton className="h-3.5 w-28 mx-auto sm:mx-0" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-5 w-20" rounded="sm" />
              <Skeleton className="h-5 w-24" rounded="sm" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* 2-Column Form Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal & Business Info */}
        <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-5">
          <Skeleton className="h-5 w-36" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>

        {/* UPI & Payment Settings */}
        <div className="p-6 rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#212121] space-y-5">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <div className="h-28 border border-dashed border-slate-200 dark:border-[#383838] rounded-lg flex items-center justify-center">
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
