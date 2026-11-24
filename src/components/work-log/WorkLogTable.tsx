import React from 'react';
import { Play, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Client, WorkItem } from '../../types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Checkbox from '../ui/Checkbox';
import { extractVideoUrl } from '../../lib/utils';
import { formatCurrencyAmount } from '../../lib/currencyUtils';
import WorkLogMobileCards from './WorkLogMobileCards';

interface WorkLogTableProps {
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
 * Desktop table and container for work log deliverables.
 */
export function WorkLogTable({
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
}: WorkLogTableProps) {
  return (
    <div className="bg-surface-700 border-0 rounded-xl overflow-hidden">
      <WorkLogMobileCards
        sortedWork={sortedWork}
        clients={clients}
        selectedWorkIds={selectedWorkIds}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        selectedCount={selectedCount}
        onSelectAll={onSelectAll}
        onToggleSelect={onToggleSelect}
        onEditWork={onEditWork}
        onDeleteWork={onDeleteWork}
        onOpenEmbed={onOpenEmbed}
      />

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-surface-800 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              <th className="py-3 pl-4 pr-2 w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={onSelectAll}
                  title="Select all visible"
                  aria-label="Select all visible deliverables"
                />
              </th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3">Client</th>
              <th className="py-3 px-3">Deliverable</th>
              <th className="py-3 px-3 text-right">Amount</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-400/50">
            {sortedWork.map((work) => {
              const client = clients.find((c) => c.id === work.clientId);
              const videoUrl = extractVideoUrl(work);
              const isSelected = selectedWorkIds.has(work.id);

              return (
                <tr
                  key={work.id}
                  className={clsx(
                    'hover:bg-surface-600/40 transition-colors',
                    isSelected && 'bg-surface-600/60'
                  )}
                >
                  <td className="py-3 pl-4 pr-2">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggleSelect(work.id)}
                      aria-label={`Select ${work.description || 'work log'}`}
                    />
                  </td>
                  <td className="py-3 px-3 text-text-secondary whitespace-nowrap font-mono tabular-nums">
                    {new Date(work.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-3 px-3 font-medium text-text-primary">
                    <div className="font-semibold">{client?.name || 'Unknown'}</div>
                    {work.subClientName && (
                      <div className="text-[11px] text-text-muted font-normal mt-0.5">
                        {work.subClientName}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-text-secondary">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-medium text-text-primary">{work.description}</span>
                      {work.quantity > 1 && (
                        <span className="text-text-muted font-mono tabular-nums">×{work.quantity}</span>
                      )}
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => onOpenEmbed({ isOpen: true, url: videoUrl, title: work.description, clientName: client?.name })}
                          className="text-xs font-medium text-text-secondary hover:text-text-primary inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 shrink-0"
                          title={`Preview: ${videoUrl}`}
                        >
                          <Play size={12} /> Preview
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-text-primary whitespace-nowrap font-mono tabular-nums">
                    {client?.paymentBasis === 'monthly_retainer' ? (
                      <span className="text-xs font-normal text-text-muted">Retainer</span>
                    ) : (
                      formatCurrencyAmount(work.quantity * work.rate, client?.currency)
                    )}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <StatusBadge status={work.status === 'Invoiced' ? 'Invoiced' : 'Pending'} />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {videoUrl && (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-600 rounded transition-colors"
                          title="Open link"
                        >
                          <ExternalLink size={13} />
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WorkLogTable;
