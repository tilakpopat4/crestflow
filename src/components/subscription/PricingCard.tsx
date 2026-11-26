import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PlanPricing, TRIAL_PROMISE_COPY } from '../../shared/pricing';

interface PricingCardProps {
  plan: PlanPricing;
  isCurrentPlan?: boolean;
  isTrialUsed?: boolean;
  isSelected?: boolean;
  loading?: boolean;
  disclosureText?: string;
  onSelect: (plan: PlanPricing) => void;
}

/**
 * Pricing tier card styled in obsidian Section 9 tokens.
 * Yearly Best-Value card receives subtle permitted #FF2D4A border highlight & badge.
 */
export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  isCurrentPlan = false,
  isTrialUsed = false,
  isSelected = false,
  loading = false,
  disclosureText,
  onSelect,
}) => {
  const isTrial = Boolean(plan.isTrial || plan.id === 'trial');
  const isBestValue = Boolean(plan.isBestValue);
  const perDayText =
    !isTrial && plan.durationDays > 0
      ? `~₹${Math.max(1, Math.round(plan.price / plan.durationDays))}/day`
      : null;

  const isDisabled = loading || isCurrentPlan || (isTrial && isTrialUsed);

  return (
    <div
      className={`rounded-xl p-5 flex flex-col justify-between transition-colors ${
        isBestValue
          ? 'bg-[#1B1B22] border best-value-glow'
          : isSelected
          ? 'bg-[#1B1B22] border border-[#FF2D4A]/60'
          : 'bg-[#131318] border border-[#2A2A33]'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2 min-h-[1.5rem]">
          <span className="text-sm font-semibold text-[#F7F7F8]">{plan.name}</span>
          {isBestValue ? (
            <span className="px-2 py-0.5 rounded bg-[#131318] border border-[#FFC145]/40 text-[10px] font-semibold uppercase tracking-wider text-[#FFC145] shrink-0">
              Best value
            </span>
          ) : (
            plan.savingsBadge && (
              <span className="px-2 py-0.5 rounded bg-[#1B1B22] border border-[#2DD4A0]/40 text-[10px] font-semibold text-[#2DD4A0] shrink-0">
                {plan.savingsBadge}
              </span>
            )
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-anton-display text-3xl text-[#F7F7F8] tabular-figures">
              ₹{plan.price}
            </span>
            <span className="text-xs text-[#A1A1AA]">{plan.periodLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#A1A1AA] tabular-figures min-h-[1rem]">
            {isTrial ? (
              <span>No card needed · 7 days full access</span>
            ) : (
              <>
                <span>~₹{plan.monthlyEquivalent}/mo</span>
                {perDayText && <span>· {perDayText}</span>}
                {plan.savingsBadge && isBestValue && (
                  <span className="text-[#2DD4A0] font-semibold">· {plan.savingsBadge}</span>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-[#A1A1AA] leading-relaxed min-h-[2.25rem]">
          {isTrial ? TRIAL_PROMISE_COPY : plan.description}
        </p>

        <ul className="space-y-2 pt-2 border-t border-[#2A2A33]">
          {plan.features.slice(0, 4).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs text-[#F7F7F8]">
              <Check size={13} className="text-[#2DD4A0] shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onSelect(plan)}
          className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${
            isBestValue || isTrial
              ? 'cf-btn-primary text-white'
              : 'bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] text-[#F7F7F8]'
          }`}
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          <span>
            {isCurrentPlan
              ? 'Current plan'
              : isTrial && isTrialUsed
              ? 'Trial already used'
              : isTrial
              ? 'Start 7-day free trial'
              : `Choose ${plan.name.replace('Pro ', '')}`}
          </span>
        </button>

        {disclosureText && (
          <p className="text-[11px] text-[#A1A1AA] text-center leading-snug">
            {disclosureText}
          </p>
        )}
      </div>
    </div>
  );
};

export default PricingCard;
