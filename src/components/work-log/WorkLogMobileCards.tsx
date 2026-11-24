import React from 'react';
import { Play, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Client, WorkItem } from '../../types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Checkbox from '../ui/Checkbox';
import { extractVideoUrl } from '../../lib/utils';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface WorkLogMobileCardsProps {
  sortedWork: WorkItem[];
  clients: Client[];
  selectedWorkIds: Set<string>;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onEditWork: (work: WorkItem) => void;
  onDeleteWork: (work: WorkItem) => void;
  onOpenEmbed: (data: { isOpen: boolean; url: string; title: string; clientName?: string }) => void;
}

/**
 * Mobile-friendly card list view for work log deliverables.
 */
export function WorkLogMobileCards({
  sortedWork,
  clients,
  selectedWorkIds,
  allVisibleSelected,
  someVisibleSelected,
  selectedCount,
  onSelectAll,
  onToggleSelect,
  onEditWork,
  onDeleteWork,
  onOpenEmbed,
}: WorkLogMobileCardsProps) {
  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between p-3.5 bg-surface-800 border-0 text-xs font-semibold text-text-secondary">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            onChange={onSelectAll}
            aria-label={`Select all ${sortedWork.length} deliverables`}
          />
          <span>All ({sortedWork.length})</span>
        </label>
        {selectedCount > 0 && (
          <span className="text-[11px] font-normal text-text-muted">
            {selectedCount} selected
          </span>
        )}
      </div>

      <div className="divide-y divide-surface-400/60">
        {sortedWork.map((work) => {
          const client = clients.find((c) => c.id === work.clientId);
          const videoUrl = extractVideoUrl(work);
          const isSelected = selectedWorkIds.has(work.id);
          const formattedDate = new Date(work.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          const isMonthly = client?.paymentBasis === 'monthly_retainer';
          const amountText = isMonthly
            ? 'Retainer'
            : formatCurrencyAmount(work.quantity * work.rate, client?.currency);

          return (
            <div
              key={work.id}
              className={clsx(
                'p-4 space-y-3 transition-colors',
                isSelected && 'bg-surface-600/50'
              )}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggleSelect(work.id)}
                    aria-label={`Select ${work.description || 'work log'}`}
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-text-primary text-sm truncate">
                      {client?.name || 'Unknown'}
                    </h4>
                    {work.subClientName && (
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {work.subClientName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={work.status === 'Invoiced' ? 'Invoiced' : 'Pending'} />
                </div>
              </div>

              <div className="bg-surface-800 rounded-lg p-3 border-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-text-primary break-words flex-1">
                    {work.description}{' '}
                    {work.quantity > 1 && (
                      <span className="text-text-muted font-normal font-mono tabular-nums">
                        ×{work.quantity}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-text-primary shrink-0 font-mono tabular-nums">
                    {amountText}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                  <span className="font-mono tabular-nums">{formattedDate}</span>
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => onOpenEmbed({ isOpen: true, url: videoUrl, title: work.description, clientName: client?.name })}
                      className="text-xs font-medium text-text-secondary hover:text-text-primary inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                    >
                      <Play size={12} /> Preview
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1">
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-600 rounded transition-colors"
                    title="Open link"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditWork(work)}
                  title="Edit Work Log"
                >
                  <Edit2 size={13} />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDeleteWork(work)}
                  title="Delete Work Log"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkLogMobileCards;
