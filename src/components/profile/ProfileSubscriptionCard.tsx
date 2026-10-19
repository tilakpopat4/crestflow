import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { SubscriptionState } from '../../hooks/useSubscription';

interface ProfileSubscriptionCardProps {
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

export const ProfileSubscriptionCard: React.FC<ProfileSubscriptionCardProps> = ({
  subscriptionState,
  onOpenSubscriptionModal
}) => {
  if (!subscriptionState || !subscriptionState.isSubscriptionFeatureEnabled || !onOpenSubscriptionModal) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span>Subscription &amp; SaaS Plan</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Pro plan active via YouPI automated UPI gateway.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                subscriptionState.isPaidActive
                  ? 'bg-indigo-600 dark:bg-indigo-400'
                  : 'bg-red-600 dark:bg-red-400'
              }`}
            />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {subscriptionState.isPaidActive
                ? `CrestFlow Pro (₹49/month • ${subscriptionState.daysRemaining} days remaining)`
                : 'Subscription Required (₹49/month)'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {subscriptionState.isPaidActive && subscriptionState.currentPeriodEnd
              ? `Active through ${new Date(subscriptionState.currentPeriodEnd).toLocaleDateString()}`
              : 'Direct peer-to-peer UPI activation unlocks client tracking, reel deliveries, and invoice generation.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSubscriptionModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shrink-0 border-none"
        >
          <Zap size={13} />
          <span>{subscriptionState.isPaidActive ? 'Extend Plan' : 'Subscribe ₹49/mo'}</span>
        </button>
      </div>
    </div>
  );
};
