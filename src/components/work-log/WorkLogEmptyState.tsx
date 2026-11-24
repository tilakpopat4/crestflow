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
    <div className="text-center py-14 px-4 bg-surface-700 border-0 rounded-xl space-y-4 max-w-xl mx-auto my-4">
      {!hasClients ? (
        <>
          <div className="w-12 h-12 rounded-xl bg-surface-600 text-text-secondary flex items-center justify-center mx-auto">
            <Users size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">Add a client first</h3>
            <p className="text-xs text-text-muted">
              Link deliverables to a client for automatic invoicing.
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
            <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
              Log deliverables to generate invoices automatically.
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
            <h3 className="text-base font-semibold text-text-primary">No matching work</h3>
            <p className="text-xs text-text-muted">
              No items match &quot;{searchQuery}&quot;.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClearSearch}
          >
            Clear
          </Button>
        </>
      )}
    </div>
  );
}

export default WorkLogEmptyState;
