import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { SubscriptionState } from '../../hooks/useSubscription';
import { PRO_PLANS, PlanPricing } from '../../lib/subscriptionPlans';

interface BillingPageProps {
  user: User;
  subscriptionState: SubscriptionState;
  onNavigateToPricing: () => void;
  onNavigateToDashboard?: () => void;
}

/**
 * Dedicated Billing Page complying strictly with GEMINI.md design standards.
 * Allows viewing current plan, next charge date, changing plans, and cancellation.
 */
export default function BillingPage({
  subscriptionState,
  onNavigateToPricing,
}: BillingPageProps) {
  const [cancelling, setCancelling] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>('yearly');
  const [changingPlan, setChangingPlan] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    plan,
    status,
    isTrialing,
    isPastDue,
    isCancelled,
    isExpired,
    cancelAtPeriodEnd,
    accessUntil,
    trialEndsAt,
    cancelSubscription,
    refreshSubscription,
  } = subscriptionState;

  const currentPlanObj = PRO_PLANS.find((p) => p.id === plan || p.planCode === plan) || PRO_PLANS[0];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCancel = async () => {
    const isTrial = isTrialing;
    const confirmText = isTrial
      ? 'Are you sure you want to cancel your trial auto-renewal? You will not be charged, and you will retain full access until the end of your 7-day trial.'
      : 'Are you sure you want to cancel your subscription auto-renewal? Your account will remain active until the end of your current paid billing period.';

    if (!window.confirm(confirmText)) return;

    setCancelling(true);
    setFeedbackMessage(null);
    try {
      await cancelSubscription();
      setFeedbackMessage({
        type: 'success',
        text: isTrial
          ? 'Trial auto-renewal cancelled. You keep access until your trial ends.'
          : 'Subscription cancelled. Access remains active until the end of your billing cycle.',
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to cancel subscription.' });
    } finally {
      setCancelling(false);
    }
  };

  const handleChangePlan = async () => {
    setChangingPlan(true);
    setFeedbackMessage(null);
    try {
      const token = await (window as any).firebase?.auth?.()?.currentUser?.getIdToken?.() || '';
      const res = await fetch('/api/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPlanKey: selectedNewPlan }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to schedule plan change');
      }

      const data = await res.json();
      setChangePlanOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: data.message || `Plan switch to ${selectedNewPlan} scheduled for the end of your current cycle.`,
      });
      await refreshSubscription();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to update plan.' });
    } finally {
      setChangingPlan(false);
    }
  };

  // Status text styling per GEMINI.md:
  // Draft: slate-500, Invoiced/Cancelled: slate-700, Paid/Active/Trialing: indigo text, Overdue/Expired: red text
  const getStatusDisplay = () => {
    if (isExpired || status === 'expired') {
      return <span className="text-[13px] font-medium text-red-600 dark:text-red-400">Expired</span>;
    }
    if (isPastDue || status === 'past_due') {
      return <span className="text-[13px] font-medium text-red-600 dark:text-red-400">Past Due</span>;
    }
    if (isCancelled || cancelAtPeriodEnd) {
      return <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Cancelled (Ends Period End)</span>;
    }
    if (isTrialing) {
      return <span className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400">Trialing</span>;
    }
    if (status === 'active') {
      return <span className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400">Active</span>;
    }
    return <span className="text-[13px] font-medium text-slate-500">None</span>;
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
            Billing & Membership
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your subscription tier, billing cycles, and automated invoicing access.
          </p>
        </div>

        {feedbackMessage && (
          <div
            className={`mb-6 p-4 rounded text-xs ${
              feedbackMessage.type === 'success'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xs p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Current Tier</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {currentPlanObj.name}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Subscription Status</div>
              <div>{getStatusDisplay()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
            <div>
              <span className="text-slate-500">Access Until: </span>
              <strong className="text-slate-900 dark:text-white">{formatDate(accessUntil || trialEndsAt)}</strong>
            </div>

            <div>
              <span className="text-slate-500">Next Scheduled Charge: </span>
              <strong className="text-slate-900 dark:text-white">
                {cancelAtPeriodEnd
                  ? 'None (Cancelling)'
                  : isTrialing
                  ? `₹${currentPlanObj.price.toLocaleString('en-IN')} on ${formatDate(trialEndsAt || accessUntil)}`
                  : `₹${currentPlanObj.price.toLocaleString('en-IN')} on ${formatDate(accessUntil)}`}
              </strong>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
            {isExpired || status === 'none' ? (
              <button
                type="button"
                onClick={onNavigateToPricing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none"
              >
                Reactivate Subscription
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setChangePlanOpen(true)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-medium transition-colors cursor-pointer border-none"
                >
                  Change Plan
                </button>

                {!cancelAtPeriodEnd && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-xs font-medium transition-colors cursor-pointer border-none bg-transparent"
                  >
                    {cancelling ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Change Plan Modal */}
        {changePlanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Select a New Plan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Your new plan will activate automatically at the conclusion of your current billing period ({formatDate(accessUntil)}).
              </p>

              <div className="space-y-2 mb-6">
                {PRO_PLANS.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded border cursor-pointer text-xs ${
                      selectedNewPlan === p.id
                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="plan"
                        value={p.id}
                        checked={selectedNewPlan === p.id}
                        onChange={() => setSelectedNewPlan(p.id)}
                        className="text-indigo-600"
                      />
                      <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-slate-900 dark:text-white">₹{p.price.toLocaleString('en-IN')}</strong>
                      <span className="text-slate-500 ml-1">{p.periodLabel}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangePlanOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs cursor-pointer border-none"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleChangePlan}
                  disabled={changingPlan}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium cursor-pointer border-none disabled:opacity-50"
                >
                  {changingPlan ? 'Scheduling...' : 'Confirm Plan Change'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
