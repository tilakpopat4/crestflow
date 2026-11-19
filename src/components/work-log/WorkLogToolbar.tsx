import React from 'react';
import { Search, X, ArrowUpDown, Archive, UploadCloud, Plus } from 'lucide-react';
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
  onOpenDrive,
  onOpenForm,
}: WorkLogToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Work Log</h2>
        <p className="text-text-muted mt-1 text-sm">Track deliverables and services.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        {/* Work Log Filter Search Bar */}
        <div className="relative flex-1 min-w-[180px] w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search work or client..."
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
            className="gap-1.5"
            title="Toggle sort order"
          >
            <ArrowUpDown size={13} />
            <span>Sort: {sortOrder === 'asc' ? 'Oldest' : 'Newest'}</span>
          </Button>

          {closedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowClosed((prev) => !prev)}
              className="gap-1.5"
              title={showClosed ? 'Hide work logs of closed clients' : 'Show work logs of closed clients'}
            >
              <Archive size={13} />
              <span>{showClosed ? 'Hide Closed' : `Show Closed (${closedCount})`}</span>
            </Button>
          )}

          {!isFormOpen && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenDrive}
                className="gap-1.5 flex-1 sm:flex-initial"
                title="Upload video to Google Drive"
              >
                <UploadCloud size={13} />
                <span>Upload to Drive</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={onOpenForm}
                className="gap-1.5 flex-1 sm:flex-initial"
              >
                <Plus size={13} />
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
