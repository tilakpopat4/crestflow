import React from 'react';
import { UploadCloud, Plus, Filter, Play, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { Client, WorkItem } from '../../types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { extractVideoUrl } from '../../lib/utils';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface ClientWorkLogsTabProps {
  client: Client;
  clientWorkItems: WorkItem[];
  subClientFilter: string;
  setSubClientFilter: (filter: string) => void;
  onOpenDrive: () => void;
  onOpenLogWork: () => void;
  onStartEditWork: (item: WorkItem) => void;
  onDeleteWork: (id: string) => void;
  onWatchPreview: (url: string, title: string) => void;
}

/**
 * Work Logs tab view for a client.
 * Displays deliverable entries, sub-client filter pills, and inline item actions.
 */
export function ClientWorkLogsTab({
  client,
  clientWorkItems,
  subClientFilter,
  setSubClientFilter,
  onOpenDrive,
  onOpenLogWork,
  onStartEditWork,
  onDeleteWork,
  onWatchPreview,
}: ClientWorkLogsTabProps) {
  const filteredWorkItems = clientWorkItems.filter((item) => {
    if (subClientFilter === 'all') return true;
    if (subClientFilter === 'direct') return !item.subClientId;
    return item.subClientId === subClientFilter;
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full min-w-0">
      <div className="flex justify-between items-center gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-text-primary">Work Logs</h3>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenDrive}
            className="gap-1.5"
            title="Upload video to Google Drive"
          >
            <UploadCloud size={13} />
            <span className="hidden min-[400px]:inline">Upload</span> Drive
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenLogWork}
            className="gap-1.5"
          >
            <Plus size={13} />
            <span>Log Work</span>
          </Button>
        </div>
      </div>

      {/* Sub-Client Filter Pills */}
      {client.subClients && client.subClients.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-text-muted flex items-center gap-1 shrink-0 mr-1">
            <Filter size={12} /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setSubClientFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer border-0 ${
              subClientFilter === 'all'
                ? 'bg-surface-400 text-text-primary'
                : 'bg-surface-800 text-text-secondary hover:bg-surface-700 hover:text-text-primary'
            }`}
          >
            All ({clientWorkItems.length})
          </button>
          <button
            type="button"
            onClick={() => setSubClientFilter('direct')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer border-0 ${
              subClientFilter === 'direct'
                ? 'bg-surface-400 text-text-primary'
                : 'bg-surface-800 text-text-secondary hover:bg-surface-700 hover:text-text-primary'
            }`}
          >
            Direct ({clientWorkItems.filter((i) => !i.subClientId).length})
          </button>
          {client.subClients.map((sc) => {
            const count = clientWorkItems.filter((i) => i.subClientId === sc.id).length;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSubClientFilter(subClientFilter === sc.id ? 'all' : sc.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer border-0 ${
                  subClientFilter === sc.id
                    ? 'bg-surface-400 text-text-primary'
                    : 'bg-surface-800 text-text-secondary hover:bg-surface-700 hover:text-text-primary'
                }`}
              >
                {sc.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Work Items Table */}
      <div className="overflow-x-auto w-full max-w-full rounded-lg border border-surface-400/80 bg-surface-800">
        <table className="w-full min-w-[560px] sm:min-w-[640px] text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-surface-400/80 bg-surface-700/60 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              <th className="p-3">Date</th>
              <th className="p-3">Description / Sub-Client / Link</th>
              <th className="p-3 text-right">
                {client.paymentBasis === 'monthly_retainer' ? 'Quantity' : 'Qty & Rate'}
              </th>
              <th className="p-3 text-right">
                {client.paymentBasis === 'monthly_retainer' ? 'Billing' : 'Total'}
              </th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-400/50">
            {filteredWorkItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-muted">
                  {subClientFilter !== 'all'
                    ? 'No work items logged under this selected filter.'
                    : 'No work items logged for this client yet.'}
                </td>
              </tr>
            ) : (
              filteredWorkItems.map((item) => {
                const videoUrl = extractVideoUrl(item);
                return (
                  <tr key={item.id} className="hover:bg-surface-700/50 transition-colors">
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap font-mono tabular-nums">
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-text-primary">{item.description}</span>
                          {item.subClientName && (
                            <span className="text-[11px] text-text-muted font-normal">
                              ({item.subClientName})
                            </span>
                          )}
                        </div>
                        {videoUrl && (
                          <div className="flex items-center gap-3 mt-0.5">
                            <button
                              type="button"
                              onClick={() => onWatchPreview(videoUrl, item.description)}
                              className="text-xs font-medium text-text-primary hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                              title="Watch embedded video preview"
                            >
                              <Play size={12} className="text-text-muted" /> Watch Preview
                            </button>
                            <a
                              href={videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-text-muted hover:text-text-secondary inline-flex items-center gap-0.5"
                              title={`Open external link: ${videoUrl}`}
                            >
                              <ExternalLink size={10} /> Link
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-text-secondary font-mono tabular-nums">
                      {client.paymentBasis === 'monthly_retainer'
                        ? `${item.quantity} item${item.quantity === 1 ? '' : 's'}`
                        : `${item.quantity} × ${formatCurrencyAmount(item.rate, client.currency)}`}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-text-primary whitespace-nowrap font-mono tabular-nums">
                      {client.paymentBasis === 'monthly_retainer' ? (
                        <span className="text-xs font-normal text-text-muted">Retainer</span>
                      ) : (
                        formatCurrencyAmount(item.quantity * item.rate, client.currency)
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <StatusBadge
                        status={item.status === 'Invoiced' ? 'Invoiced' : 'Pending'}
                        label={item.status === 'Invoiced' ? 'Invoiced' : 'Uninvoiced'}
                      />
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.approvalStatus === 'approved'
                              ? 'bg-slate-400'
                              : item.approvalStatus === 'changes_requested'
                              ? 'bg-accent'
                              : 'bg-surface-400'
                          }`}
                        />
                        <span className="font-medium text-text-muted">
                          {item.approvalStatus === 'approved'
                            ? 'Approved'
                            : item.approvalStatus === 'changes_requested'
                            ? `Changes (${item.revisionCount || 1})`
                            : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStartEditWork(item)}
                        title="Edit work item"
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => onDeleteWork(item.id)}
                        title="Delete work item"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClientWorkLogsTab;
