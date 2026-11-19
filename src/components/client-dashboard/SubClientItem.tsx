import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubClient, WorkItem } from '../../types';
import { getDriveDirectImageUrl } from '../../lib/utils';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface SubClientItemProps {
  subClient: SubClient;
  currency?: string;
  clientWorkItems: WorkItem[];
  onEdit: (sc: SubClient) => void;
  onDelete: (id: string, name: string) => void;
}

/**
 * Individual row item for registered sub-clients in SubClientsModal.
 */
export function SubClientItem({
  subClient: sc,
  currency,
  clientWorkItems,
  onEdit,
  onDelete,
}: SubClientItemProps) {
  const scWorkLogs = clientWorkItems.filter((item) => item.subClientId === sc.id);
  const totalVal = scWorkLogs.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const uninvoicedVal = scWorkLogs
    .filter((item) => item.status !== 'Invoiced')
    .reduce((sum, item) => sum + item.quantity * item.rate, 0);

  return (
    <div className="p-3 bg-surface-800 border border-surface-400 rounded-xl flex items-center justify-between gap-3 hover:bg-surface-700 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {sc.logoUrl ? (
          <img
            src={getDriveDirectImageUrl(sc.logoUrl)}
            alt={sc.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-lg object-cover border border-surface-400 shrink-0 bg-surface-600"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sc.name)}&background=282828&color=ffffff&size=128&rounded=true&bold=true`;
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-surface-600 border border-surface-400 text-text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {sc.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary text-sm truncate">{sc.name}</span>
            {sc.code && (
              <span className="px-1.5 py-0.5 bg-surface-600 text-text-secondary rounded font-mono text-[11px]">
                {sc.code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
            <span className="font-mono tabular-nums">{scWorkLogs.length} work log(s)</span>
            <span>•</span>
            <span className="font-semibold font-mono tabular-nums text-text-primary">
              Total: {formatCurrencyAmount(totalVal, currency)}
            </span>
            {uninvoicedVal > 0 && (
              <span className="text-text-muted font-mono tabular-nums">
                ({formatCurrencyAmount(uninvoicedVal, currency)} pending)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(sc)}
          title="Edit Sub-Client"
        >
          <Edit2 size={13} />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(sc.id, sc.name)}
          title="Delete Sub-Client"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
}

export default SubClientItem;
