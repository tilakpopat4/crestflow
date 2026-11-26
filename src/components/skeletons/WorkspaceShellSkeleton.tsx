import React from 'react';
import { Skeleton } from './Skeleton';
import { DashboardSkeleton } from './DashboardSkeleton';

/**
 * Full Workspace Shell Skeleton aligned with Section 9 obsidian tokens (#0B0B0E / #131318 / #2A2A33).
 */
export const WorkspaceShellSkeleton: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-[#0B0B0E] overflow-hidden select-none">
      {/* Sidebar Rail Skeleton (desktop) */}
      <aside className="hidden md:flex flex-col w-16 lg:w-56 border-r border-[#2A2A33] bg-[#131318] p-3 justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <Skeleton className="h-7 w-7" rounded="md" />
            <Skeleton className="hidden lg:block h-5 w-24" />
          </div>

          <div className="space-y-2 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-md">
                <Skeleton className="h-6 w-6" rounded="sm" />
                <Skeleton className="hidden lg:block h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 border-t border-[#2A2A33]">
          <Skeleton className="h-8 w-8" rounded="full" />
          <div className="hidden lg:block space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-[#2A2A33] bg-[#131318] px-4 md:px-8 flex items-center justify-between shrink-0">
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

        <main className="flex-1 overflow-y-auto bg-[#0B0B0E]">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
};
