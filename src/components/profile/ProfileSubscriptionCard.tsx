import React, { useState } from 'react';
import { ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { SubscriptionState } from '../../hooks/useSubscription';

interface ProfileSubscriptionCardProps {
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

export const ProfileSubscriptionCard: React.FC<ProfileSubscriptionCardProps> = ({
  subscriptionState,
  onOpenSubscriptionModal,
}) => {
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  if (!subscriptionState || !subscriptionState.isSubscriptionFeatureEnabled || !onOpenSubscriptionModal) {
    return null;
  }

  const handleCancel = async () => {
    const formattedDate = subscriptionState.currentPeriodEnd
      ? new Date(subscriptionState.currentPeriodEnd).toLocaleDateString()
      : 'the end of your billing cycle';

    if (
      !window.confirm(
        `Are you sure you want to cancel your Pro subscription?\n\nYou will keep full Pro access until ${formattedDate}, after which your account will return to the Free Tier.`
      )
    ) {
      return;
    }

    setCancelling(true);
    setCancelMessage(null);
    try {
      await subscriptionState.cancelSubscription();
      setCancelMessage(`Subscription cancelled. Pro access remains active through ${formattedDate}.`);
    } catch (err: any) {
      alert(`Error cancelling subscription: ${err.message || err}`);
    } finally {
      setCancelling(false);
    }
  };

  const isPro = subscriptionState.isPaidActive;
  const isCancelled = subscriptionState.cancelAtPeriodEnd;
  const cycleLabel = subscriptionState.billingCycle === 'yearly' ? 'Yearly' : 'Monthly';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span>Billing &amp; Subscription</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your membership tier, recurring cycle, and cancellation.
        </p>
      </div>

      {cancelMessage && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0 text-slate-600 dark:text-slate-400" />
          <span>{cancelMessage}</span>
        </div>
      )}

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPro
                  ? isCancelled
                    ? 'bg-slate-500'
                    : 'bg-indigo-600 dark:bg-indigo-400'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {isPro
                ? `CrestFlow Pro (${cycleLabel})`
                : 'Free Tier (Basic)'}
            </span>
            {isCancelled && (
              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">
                Cancels at period end
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isPro && subscriptionState.currentPeriodEnd
              ? isCancelled
                ? `Access remains active until ${new Date(subscriptionState.currentPeriodEnd).toLocaleDateString()} (${subscriptionState.daysRemaining} days left).`
                : `Next renewal date: ${new Date(subscriptionState.currentPeriodEnd).toLocaleDateString()} (${subscriptionState.daysRemaining} days remaining).`
              : 'Free Tier: Limited to 2 clients and 3 invoices/month. Upgrade to Pro for unlimited usage.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isPro && !isCancelled && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-120 cursor-pointer border-0 shadow-xs"
          >
            <Zap size={13} />
            <span>{isPro ? (isCancelled ? 'Resubscribe' : 'Change Plan') : 'Upgrade to Pro'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
