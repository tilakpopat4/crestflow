import React from 'react';
import { InvoiceDeliverable } from '../../types';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface InvoiceRetainerDeliverablesListProps {
  deliverables: InvoiceDeliverable[];
  currency?: string;
  fixedTotal: number;
}

/**
 * Displays work log deliverables included in the selected monthly retainer period.
 */
export const InvoiceRetainerDeliverablesList: React.FC<InvoiceRetainerDeliverablesListProps> = ({
  deliverables,
  currency = 'INR',
  fixedTotal,
}) => {
  return (
    <div className="bg-surface-800 p-3.5 rounded-lg border-0 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-text-primary">
          Work Logs {deliverables.length > 0 ? `(${deliverables.length})` : ''}
        </span>
        <span className="text-text-muted font-mono text-[11px]">
          Fixed: <strong className="text-text-primary font-semibold">{formatCurrencyAmount(fixedTotal, currency)}</strong>
        </span>
      </div>

      {deliverables.length > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {deliverables.map((item, idx) => {
            const dateStr = item.date
              ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : '';
            return (
              <div
                key={item.id || idx}
                className="flex items-center justify-between bg-surface-900/80 px-2.5 py-1.5 rounded border-0 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  <span className="text-text-muted text-[11px] font-mono shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="text-text-primary truncate font-medium">
                    {item.title}
                  </span>
                  {item.subClientName && (
                    <span className="text-text-muted text-[10px] shrink-0">
                      ({item.subClientName})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-text-muted text-[11px]">
                  {dateStr && <span>{dateStr}</span>}
                  <span className="font-mono">x{item.quantity}</span>
                  <span className="text-text-secondary font-medium font-mono text-[11px]">
                    Included
                  </span>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-text-muted pt-1">
            Marked invoiced on creation; total stays fixed.
          </p>
        </div>
      ) : (
        <p className="text-xs text-text-muted py-1">
          No uninvoiced work logs; billed as a single retainer item.
        </p>
      )}
    </div>
  );
};

export default InvoiceRetainerDeliverablesList;
