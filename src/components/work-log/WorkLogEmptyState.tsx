import React from 'react';
import { Users, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkLogEmptyStateProps {
  hasClients: boolean;
  hasWorkItems: boolean;
  searchQuery: string;
  onClearSearch: () => void;
  onOpenForm: () => void;
  onNavigateToClients?: () => void;
}

/**
 * Empty state displays for WorkLogTab when no clients, no deliverables, or no search results exist.
 */
export function WorkLogEmptyState({
  hasClients,
  hasWorkItems,
  searchQuery,
  onClearSearch,
  onOpenForm,
  onNavigateToClients,
}: WorkLogEmptyStateProps) {
  return (
    <div className="text-center py-16 px-4 bg-surface-700 rounded-xl border border-surface-400 space-y-4 max-w-xl mx-auto my-4 shadow-xs">
      {!hasClients ? (
        <>
          <div className="w-12 h-12 rounded-xl bg-surface-600 text-text-secondary flex items-center justify-center mx-auto">
            <Users size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">Add a client before logging work</h3>
            <p className="text-xs text-text-muted">
              Every deliverable is linked to a client so rates, retainers, and invoice statements calculate automatically.
            </p>
          </div>
          {onNavigateToClients && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onNavigateToClients}
              className="gap-1.5"
            >
              <Users size={13} />
              <span>Add First Client</span>
            </Button>
          )}
        </>
      ) : !hasWorkItems ? (
        <>
          <div className="w-12 h-12 rounded-xl bg-surface-600 text-text-secondary flex items-center justify-center mx-auto">
            <Clock size={22} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-text-primary">No work logged yet</h3>
            <p className="text-xs text-text-muted leading-relaxed max-w-md mx-auto">
              Record video deliverables, reels, or editing tasks to automatically aggregate them into invoices with UPI payment QR codes.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenForm}
              className="gap-1.5"
            >
              <span>Log First Work Item</span>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-surface-600 text-text-secondary flex items-center justify-center mx-auto">
            <Search size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">No matching work items</h3>
            <p className="text-xs text-text-muted">
              No deliverables match your search query &quot;{searchQuery}&quot;.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClearSearch}
          >
            Clear Search
          </Button>
        </>
      )}
    </div>
  );
}

export default WorkLogEmptyState;
