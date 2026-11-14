import React from 'react';
import { Skeleton } from './Skeleton';
import { DashboardSkeleton } from './DashboardSkeleton';

/**
 * Full Workspace Shell Skeleton.
 * Replaces the jarring full-screen spinner with an exact structural skeleton of CrestFlow:
 * Left Sidebar rail + Global Header + Dashboard Content skeleton.
 */
export const WorkspaceShellSkeleton: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-[#f1f1f1] dark:bg-[#181818] overflow-hidden select-none">
      {/* Sidebar Rail Skeleton (desktop) */}
      <aside className="hidden md:flex flex-col w-16 lg:w-56 border-r border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#212121] p-3 justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <Skeleton className="h-7 w-7" rounded="md" />
            <Skeleton className="hidden lg:block h-5 w-24" />
          </div>

          {/* Nav Items */}
          <div className="space-y-2 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-md">
                <Skeleton className="h-6 w-6" rounded="sm" />
                <Skeleton className="hidden lg:block h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="flex items-center gap-3 p-2 border-t border-slate-100 dark:border-[#2a2a2a]">
          <Skeleton className="h-8 w-8" rounded="full" />
          <div className="hidden lg:block space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Header Skeleton */}
        <header className="h-14 border-b border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#212121] px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Skeleton className="h-8 w-8 md:hidden" rounded="md" />
            <Skeleton className="h-8 w-full max-w-xs" rounded="md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28 hidden sm:block" rounded="md" />
            <Skeleton className="h-8 w-8" rounded="md" />
            <Skeleton className="h-8 w-8" rounded="full" />
          </div>
        </header>

        {/* Body Content Skeleton */}
        <main className="flex-1 overflow-y-auto">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
};
