import React from 'react';
import { Check } from 'lucide-react';
import { PlanPricing, getTrialDisclosureText } from '../../lib/subscriptionPlans';

interface PricingCardProps {
  plan: PlanPricing;
  isSelected: boolean;
  onSelect: (plan: PlanPricing) => void;
  isLoading: boolean;
  isFirstTime?: boolean;
}

/**
 * Individual plan pricing card complying with CrestFlow's flat, restrained design system.
 * Shows mandatory disclosure: "₹1 today for a 7-day trial, then ₹X on [date]; the ₹1 is non-refundable".
 */
export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  isSelected,
  onSelect,
  isLoading,
  isFirstTime = true,
}) => {
  const disclosureText = getTrialDisclosureText(plan);

  return (
    <div
      className={`rounded-lg p-5 flex flex-col justify-between transition-colors duration-120 ${
        isSelected
          ? 'bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 shadow-xs'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
      }`}
    >
      <div>
        {/* Header & Badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {plan.name}
          </h3>
          {plan.savingsBadge && (
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {plan.savingsBadge}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 min-h-[32px]">
          {plan.description}
        </p>

        {/* Pricing Figure */}
        <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{plan.price.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {plan.periodLabel}
            </span>
          </div>
          {plan.durationDays > 30 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Equivalent to ~₹{plan.monthlyEquivalent}/month
            </p>
          )}
        </div>

        {/* Features List */}
        <ul className="space-y-2.5 mb-6 text-xs text-slate-600 dark:text-slate-300">
          {plan.features.map((feat, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {/* Regulatory Disclosure */}
        <div className="mb-4 p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          {isFirstTime ? (
            <span>{disclosureText}</span>
          ) : (
            <span>₹{plan.price.toLocaleString('en-IN')} charged today; renews every {plan.interval}. Cancel anytime.</span>
          )}
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={() => onSelect(plan)}
          disabled={isLoading}
          className={`w-full py-2.5 px-4 rounded text-xs font-medium transition-colors duration-120 cursor-pointer border-none ${
            isSelected
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
          } disabled:opacity-50`}
        >
          {isLoading && isSelected
            ? 'Initializing...'
            : isFirstTime
            ? 'Start 7-Day Trial (₹1)'
            : `Subscribe for ₹${plan.price.toLocaleString('en-IN')}`}
        </button>
      </div>
    </div>
  );
};
