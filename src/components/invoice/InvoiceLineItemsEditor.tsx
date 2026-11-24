import React from 'react';
import { Plus, Trash2, Coins } from 'lucide-react';
import { Reel } from '../../types';
import { Button } from '@/components/ui/button';

interface InvoiceLineItemsEditorProps {
  effectiveReels: Reel[];
  defaultRate: number;
  onAddItem: (title: string, rate: number) => void;
  onUpdateReel: (id: string, field: keyof Reel, value: string | number) => void;
  onRemoveReel: (id: string) => void;
  onRoundFigures: () => void;
}

/**
 * Line items table / editor inside the invoice generation form.
 */
export function InvoiceLineItemsEditor({
  effectiveReels,
  defaultRate,
  onAddItem,
  onUpdateReel,
  onRemoveReel,
  onRoundFigures,
}: InvoiceLineItemsEditorProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Items ({effectiveReels.length})
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRoundFigures}
            className="gap-1 h-7 text-xs border-0"
            title="Round line totals to nearest 100"
          >
            <Coins size={12} />
            <span>Round</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onAddItem('Deliverable', defaultRate)}
            className="gap-1 h-7 text-xs border-0"
          >
            <Plus size={12} />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {effectiveReels.map((reel) => (
          <div
            key={reel.id}
            className="grid grid-cols-12 gap-2 items-center bg-surface-800 p-2.5 rounded-lg border-0"
          >
            <div className="col-span-12 sm:col-span-6">
              <input
                type="text"
                value={reel.title}
                onChange={(e) => onUpdateReel(reel.id, 'title', e.target.value)}
                placeholder="Description"
                className="w-full bg-surface-900 border border-surface-400 rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-surface-300"
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <input
                type="number"
                min="1"
                value={reel.quantity}
                onChange={(e) => onUpdateReel(reel.id, 'quantity', Number(e.target.value))}
                className="w-full bg-surface-900 border border-surface-400 rounded px-2 py-1.5 text-xs text-text-primary font-mono outline-none focus:border-surface-300"
                title="Quantity"
              />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <input
                type="number"
                min="0"
                value={reel.rate}
                onChange={(e) => onUpdateReel(reel.id, 'rate', Number(e.target.value))}
                className="w-full bg-surface-900 border border-surface-400 rounded px-2 py-1.5 text-xs text-text-primary font-mono outline-none focus:border-surface-300"
                title="Rate"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => onRemoveReel(reel.id)}
                disabled={effectiveReels.length <= 1}
                title="Remove item"
                className="h-7 w-7 border-0"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InvoiceLineItemsEditor;
