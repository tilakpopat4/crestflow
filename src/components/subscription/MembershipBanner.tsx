import React from 'react';
import { SubscriptionState } from '../../hooks/useSubscription';

interface MembershipBannerProps {
  subscriptionState: SubscriptionState;
  onOpenPricing: () => void;
  onOpenBilling: () => void;
}

/**
 * Authoritative Membership Banner with days-left counter computed from serverNow.
 * Formatted strictly according to GEMINI.md design standards (flat, restrained, no emoji, no amber badges).
 */
export const MembershipBanner: React.FC<MembershipBannerProps> = ({
  subscriptionState,
  onOpenPricing,
  onOpenBilling,
}) => {
  if (!subscriptionState.isSubscriptionFeatureEnabled || subscriptionState.isWhitelisted) {
    return null;
  }

  const {
    isTrialing,
    isPastDue,
    isCancelled,
    isExpired,
    daysRemaining,
    accessUntil,
    trialEndsAt,
    status,
  } = subscriptionState;

  // Normal active paid subscription without issues does not require a disruptive banner
  if (status === 'active' && !isCancelled) {
    return null;
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // 1. Expired / Read-Only State
  if (isExpired || status === 'none' || status === 'expired') {
    return (
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0" />
          <span>
            Read-only mode active. {accessUntil ? `Access expired on ${formatDate(accessUntil)}.` : 'Subscription required to create clients and invoices.'}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenPricing}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none shrink-0"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  // 2. Past Due / Grace Period State
  if (isPastDue) {
    return (
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0" />
          <span>
            Recurring payment failed. 3-day grace period active until {formatDate(accessUntil)}.
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenBilling}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none shrink-0"
        >
          Update Billing
        </button>
      </div>
    );
  }

  // 3. Cancelled Auto-Renewal State
  if (isCancelled) {
    return (
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
          <span>
            Subscription cancelled. You retain full access until {formatDate(accessUntil)}.
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenPricing}
          className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-medium transition-colors cursor-pointer border-none shrink-0"
        >
          Renew
        </button>
      </div>
    );
  }

  // 4. Trialing State
  if (isTrialing) {
    return (
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
          <span>
            Trial membership: <strong>{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left</strong> (ends {formatDate(trialEndsAt || accessUntil)}).
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenBilling}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-medium transition-colors cursor-pointer border-none shrink-0"
          >
            Manage Billing
          </button>
        </div>
      </div>
    );
  }

  return null;
};
