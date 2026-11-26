import React from 'react';
import { Search, X, ArrowUpDown, Archive, UploadCloud, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkLogToolbarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  closedCount: number;
  showClosed: boolean;
  setShowClosed: React.Dispatch<React.SetStateAction<boolean>>;
  isFormOpen: boolean;
  canWrite?: boolean;
  isExploring?: boolean;
  onOpenDrive: () => void;
  onOpenForm: () => void;
}

/**
 * Top command bar and filter toolbar for Work Log view.
 */
export function WorkLogToolbar({
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  closedCount,
  showClosed,
  setShowClosed,
  isFormOpen,
  canWrite = true,
  isExploring = false,
  onOpenDrive,
  onOpenForm,
}: WorkLogToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Work Log</h2>
          <p className="text-text-muted mt-1 text-sm">Client deliverables.</p>
        </div>
        {isExploring && (
          <span className="text-xs font-medium text-[#FFC145] bg-[#1B1B22] border border-[#2A2A33] px-2.5 py-1 rounded">
            Sample data
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        <div className="relative flex-1 min-w-[160px] w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-surface-800 text-sm pl-9 pr-7 py-2 rounded-lg border border-surface-400 text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer bg-transparent border-0 p-0"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="gap-1.5 border-0"
            title="Toggle sort order"
          >
            <ArrowUpDown size={13} />
            <span>{sortOrder === 'asc' ? 'Oldest' : 'Newest'}</span>
          </Button>

          {closedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowClosed((prev) => !prev)}
              className="gap-1.5 border-0"
              title={showClosed ? 'Hide closed clients' : 'Show closed clients'}
            >
              <Archive size={13} />
              <span>{showClosed ? 'Hide Closed' : `Closed (${closedCount})`}</span>
            </Button>
          )}

          {!isFormOpen && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenDrive}
                className="gap-1.5 flex-1 sm:flex-initial"
                title="Upload video to Drive"
              >
                {!canWrite ? <Lock size={12} /> : <UploadCloud size={13} />}
                <span>Drive Upload</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={onOpenForm}
                className="gap-1.5 flex-1 sm:flex-initial"
              >
                {!canWrite ? <Lock size={12} /> : <Plus size={13} />}
                <span>Log Work</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkLogToolbar;
