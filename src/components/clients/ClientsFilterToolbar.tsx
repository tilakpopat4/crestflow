import React from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { SubscriptionState } from '../../hooks/useSubscription';

interface ClientsFilterToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: 'all' | 'due' | 'uptodate' | 'closed';
  setFilterType: (filter: 'all' | 'due' | 'uptodate' | 'closed') => void;
  subscriptionState?: SubscriptionState;
  clientsCount: number;
  onOpenSubscriptionModal?: () => void;
}

export const ClientsFilterToolbar: React.FC<ClientsFilterToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  subscriptionState,
  clientsCount,
  onOpenSubscriptionModal,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name, sub-client, or email..."
            className="w-full bg-surface-700 border border-surface-400 rounded-lg pl-9 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-surface-400/90 transition-colors"
          />
        </div>

        {/* Filter Segmented Control */}
        <div className="inline-flex rounded-lg bg-surface-800 border border-surface-400 p-0.5 text-xs font-medium shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer border-0 ${
              filterType === 'all'
                ? 'bg-surface-600 text-text-primary shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Clients
          </button>
          <button
            type="button"
            onClick={() => setFilterType('due')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer border-0 ${
              filterType === 'due'
                ? 'bg-surface-600 text-text-primary shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Payment Due
          </button>
          <button
            type="button"
            onClick={() => setFilterType('uptodate')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer border-0 ${
              filterType === 'uptodate'
                ? 'bg-surface-600 text-text-primary shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Up to Date
          </button>
          <button
            type="button"
            onClick={() => setFilterType('closed')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer border-0 ${
              filterType === 'closed'
                ? 'bg-surface-600 text-text-primary shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Free Plan Limit Notice */}
      {subscriptionState && !subscriptionState.isPro && (
        <div className="flex items-center justify-between text-xs bg-surface-700 border border-surface-400 px-3.5 py-2 rounded-lg text-text-secondary">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-text-muted" />
            <span>
              Free Plan:{' '}
              <span className="font-mono tabular-nums font-semibold text-text-primary">
                {clientsCount} / {subscriptionState.limits.maxClients}
              </span>{' '}
              clients used
            </span>
          </div>
          {onOpenSubscriptionModal && (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="font-medium text-text-primary hover:underline cursor-pointer border-0 bg-transparent"
            >
              Upgrade to Pro &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientsFilterToolbar;
