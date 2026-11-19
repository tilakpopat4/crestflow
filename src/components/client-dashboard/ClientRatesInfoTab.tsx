import React from 'react';
import { Edit3, Edit2 } from 'lucide-react';
import { Client } from '../../types';
import { Button } from '@/components/ui/button';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface ClientRatesInfoTabProps {
  client: Client;
  onOpenRatesModal: () => void;
  onEditClient: (client: Client) => void;
}

/**
 * Rates & Pricing tab view for a client.
 * Displays billing basis, reel rates, shoot rates, and website rates.
 */
export function ClientRatesInfoTab({
  client,
  onOpenRatesModal,
  onEditClient,
}: ClientRatesInfoTabProps) {
  return (
    <div className="p-4 sm:p-6 space-y-5 w-full min-w-0">
      <div className="flex justify-between items-center gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-text-primary">Rates &amp; Pricing</h3>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenRatesModal}
            className="gap-1.5"
          >
            <Edit3 size={13} />
            <span>Modify Rates</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEditClient(client)}
            className="gap-1.5"
            title="Edit Full Client Profile"
          >
            <Edit2 size={13} />
            <span>Full Profile</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={onOpenRatesModal}
          className="p-4 bg-surface-800 hover:bg-surface-700 rounded-xl space-y-1.5 cursor-pointer transition-colors border border-surface-400 group"
          title="Click to modify billing basis"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
              Payment Basis
            </span>
            <Edit3 size={12} className="text-text-muted group-hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-base font-semibold text-text-primary">
            {client.paymentBasis === 'monthly_retainer' ? 'Monthly Retainer' : 'Per Reel'}
          </div>
          <span className="text-xs text-text-muted block font-mono tabular-nums">
            {client.paymentBasis === 'monthly_retainer'
              ? `Fixed ${formatCurrencyAmount(client.monthlyRetainerAmount || client.defaultRate || 0, client.currency)}/mo`
              : 'Billed per deliverable'}
          </span>
        </div>

        <div
          onClick={onOpenRatesModal}
          className="p-4 bg-surface-800 hover:bg-surface-700 rounded-xl space-y-1.5 cursor-pointer transition-colors border border-surface-400 group"
          title="Click to modify default reel rate"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
              Default Reel Rate
            </span>
            <Edit3 size={12} className="text-text-muted group-hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold text-text-primary font-mono tabular-nums">
            {formatCurrencyAmount(client.defaultRate, client.currency)}
          </div>
          <span className="text-xs text-text-muted">Per video edit</span>
        </div>

        <div
          onClick={onOpenRatesModal}
          className="p-4 bg-surface-800 hover:bg-surface-700 rounded-xl space-y-1.5 cursor-pointer transition-colors border border-surface-400 group"
          title="Click to modify on-site shoot rate"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
              On Site Shoot Rate
            </span>
            <Edit3 size={12} className="text-text-muted group-hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold text-text-primary font-mono tabular-nums">
            {client.onSiteShootRate
              ? formatCurrencyAmount(client.onSiteShootRate, client.currency)
              : 'Not Set'}
          </div>
          <span className="text-xs text-text-muted">Per shoot day</span>
        </div>

        <div
          onClick={onOpenRatesModal}
          className="p-4 bg-surface-800 hover:bg-surface-700 rounded-xl space-y-1.5 cursor-pointer transition-colors border border-surface-400 group"
          title="Click to modify website making rate"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
              Website Making Rate
            </span>
            <Edit3 size={12} className="text-text-muted group-hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold text-text-primary font-mono tabular-nums">
            {client.websiteMakingRate
              ? formatCurrencyAmount(client.websiteMakingRate, client.currency)
              : 'Not Set'}
          </div>
          <span className="text-xs text-text-muted">Per website project</span>
        </div>
      </div>
    </div>
  );
}

export default ClientRatesInfoTab;
