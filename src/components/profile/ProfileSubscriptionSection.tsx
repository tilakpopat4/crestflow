import React, { useState } from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { SubscriptionState } from '../../hooks/useSubscription';

interface ProfileSubscriptionSectionProps {
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

/**
 * Membership and plan settings section matching the split layout.
 * Shows active tier, billing cycle, cancel subscription option, or upgrade button.
 */
export const ProfileSubscriptionSection: React.FC<ProfileSubscriptionSectionProps> = ({
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
    <section id="section-billing" className="grid grid-cols-1 gap-x-8 gap-y-4 pt-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Membership &amp; plan
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Manage your membership tier, recurring billing interval, and platform access.
        </p>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 shadow-xs ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isPro ? `CrestFlow Pro (${cycleLabel})` : 'Free Starter Tier'}
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  &bull; {isPro ? (isCancelled ? 'Cancelling at period end' : 'Active') : 'Free'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isPro
                  ? subscriptionState.currentPeriodEnd
                    ? `Current period renews on ${new Date(subscriptionState.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : 'Active monthly recurring billing'
                  : 'Upgrade to unlock unlimited invoices, automated reminders, and client portals.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isPro ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenSubscriptionModal}
                    className="h-8.5 px-3.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 border-0 cursor-pointer transition-colors duration-120"
                  >
                    Change plan
                  </button>
                  {!isCancelled && (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={handleCancel}
                      className="h-8.5 px-3 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-0 cursor-pointer transition-colors duration-120"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="h-8.5 px-4 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-0 cursor-pointer transition-colors duration-120 inline-flex items-center gap-1.5"
                >
                  <Zap size={13} />
                  <span>Upgrade to Pro</span>
                </button>
              )}
            </div>
          </div>

          {cancelMessage && (
            <div className="p-3 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {cancelMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProfileSubscriptionSection;

