import React from 'react';
import { CheckSquare, Layers, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkLogBulkToolbarProps {
  selectedCount: number;
  selectedInvoicedCount: number;
  onOpenBulkEdit: () => void;
  onBulkDelete: () => void;
  onDeselectAll: () => void;
}

/**
 * Floating bulk actions toolbar when multiple work items are selected.
 */
export function WorkLogBulkToolbar({
  selectedCount,
  selectedInvoicedCount,
  onOpenBulkEdit,
  onBulkDelete,
  onDeselectAll,
}: WorkLogBulkToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-surface-700 text-text-primary rounded-xl shadow-xl border border-surface-400 animate-in fade-in max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-2">
        <CheckSquare size={15} className="text-text-primary" />
        <span className="text-xs font-semibold">{selectedCount} selected</span>
        {selectedInvoicedCount > 0 && (
          <span className="text-[11px] text-text-muted font-normal">
            ({selectedInvoicedCount} invoiced)
          </span>
        )}
      </div>
      <div className="w-px h-4 bg-surface-400" />
      <Button
        variant="secondary"
        size="sm"
        onClick={onOpenBulkEdit}
        className="gap-1.5 h-8 text-xs"
      >
        <Layers size={13} />
        <span>Bulk Edit</span>
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={onBulkDelete}
        className="gap-1.5 h-8 text-xs"
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </Button>
      <button
        type="button"
        onClick={onDeselectAll}
        className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-600 rounded-md transition-colors cursor-pointer bg-transparent border-0"
        title="Deselect all"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default WorkLogBulkToolbar;
