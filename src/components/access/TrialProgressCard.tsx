import React, { useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { useAccess } from '../../hooks/useAccess';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface TrialProgressCardProps {
  invoicedAmount: number;
  deliverablesCount: number;
  onUpgradeClick?: () => void;
}

/**
 * Value-first trial progress summary with gold bar and optional once-per-day Day 5-7 reminder.
 */
export function TrialProgressCard({
  invoicedAmount,
  deliverablesCount,
  onUpgradeClick,
}: TrialProgressCardProps) {
  const access = useAccess();
  const [dismissedTick, setDismissedTick] = useState(0);

  if (access.state !== 'trialing') return null;

  const day = Math.max(1, Math.min(7, access.trialDay || 1));
  const progressPct = Math.round((day / 7) * 100);
  const formattedTotal = formatCurrencyAmount(invoicedAmount, 'INR');

  const uid = access.user?.uid || 'anon';
  const todayStr = new Date().toISOString().slice(0, 10);
  const reminderKey = `crestflow_trial_day_banner_${uid}_d${day}_${todayStr}`;
  const showLateReminder = day >= 5 && (typeof window === 'undefined' || !window.localStorage.getItem(reminderKey));

  const dismissReminder = () => {
    try {
      window.localStorage.setItem(reminderKey, 'dismissed');
    } catch {}
    setDismissedTick((v) => v + 1);
  };

  void dismissedTick;

  return (
    <div className="space-y-3">
      {showLateReminder && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#1B1B22] border border-[#FFB020]/40 px-4 py-3 text-xs text-[#F7F7F8]"
        >
          <div className="space-y-0.5">
            <span className="font-semibold text-[#FFB020]">
              Trial Day {day} of 7
            </span>
            <span className="text-[#A1A1AA] ml-2">
              {access.daysLeft <= 1
                ? 'Last day of your free trial. Pick a plan anytime to keep creating without interruption.'
                : `${access.daysLeft} days remaining. Your data stays safe even if you decide later.`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onUpgradeClick
                  ? onUpgradeClick()
                  : access.openUpgradeSheet({
                      action: 'upgrade',
                      benefit: 'Choose a monthly, quarterly, or yearly plan to keep working smoothly.',
                    })
              }
              className="px-3 py-1.5 rounded-lg bg-[#E0002B] hover:bg-[#FF2D4A] text-white text-xs font-semibold border-0 cursor-pointer inline-flex items-center gap-1"
            >
              <span>Choose plan</span>
              <ArrowUpRight size={13} />
            </button>
            <button
              type="button"
              onClick={dismissReminder}
              aria-label="Dismiss trial reminder for today"
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F7F7F8] bg-transparent border-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[#131318] border border-[#2A2A33] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#FFC145]">
              Trial Progress · Day {day} of 7
            </span>
            <span className="text-[#A1A1AA] tabular-figures">
              {access.daysLeft} {access.daysLeft === 1 ? 'day' : 'days'} left
            </span>
          </div>
          <p className="text-xs text-[#F7F7F8]">
            You have invoiced{' '}
            <span className="font-semibold text-[#FFC145] tabular-figures">{formattedTotal}</span>{' '}
            and tracked{' '}
            <span className="font-semibold text-[#F7F7F8] tabular-figures">{deliverablesCount}</span>{' '}
            {deliverablesCount === 1 ? 'deliverable' : 'deliverables'}.
          </p>
          <div className="h-1.5 w-full rounded-full bg-[#1B1B22] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FFC145]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onUpgradeClick
              ? onUpgradeClick()
              : access.openUpgradeSheet({
                  action: 'upgrade',
                  benefit: 'Lock in CrestFlow Pro from ₹58/month with Yearly billing.',
                })
          }
          className="px-3.5 py-2 rounded-lg bg-[#1B1B22] hover:bg-[#22222B] border border-[#2A2A33] text-xs font-semibold text-[#F7F7F8] shrink-0 cursor-pointer"
        >
          View plans
        </button>
      </div>
    </div>
  );
}

export default TrialProgressCard;
