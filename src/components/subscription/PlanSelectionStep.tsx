import React from 'react';
import { LogOut, Check, Zap } from 'lucide-react';
import { PRO_PLANS, FREE_TIER_LIMITS } from '../../lib/subscriptionPlans';

interface PlanSelectionStepProps {
  selectedCycle: 'monthly' | 'yearly';
  onSelectCycle: (cycle: 'monthly' | 'yearly') => void;
  loading: boolean;
  onStartPayment: () => void;
  isMandatory?: boolean;
  onLogout?: () => void;
}

export const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({
  selectedCycle,
  onSelectCycle,
  loading,
  onStartPayment,
  isMandatory,
  onLogout,
}) => {
  const activePlan = PRO_PLANS.find((p) => p.id === selectedCycle) || PRO_PLANS[0];

  return (
    <div className="space-y-5">
      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onSelectCycle('monthly')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors duration-120 border-0 cursor-pointer ${
              selectedCycle === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly (₹79/mo)
          </button>
          <button
            type="button"
            onClick={() => onSelectCycle('yearly')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors duration-120 border-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCycle === 'yearly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Yearly (₹799/yr)</span>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded">
              Save 15%
            </span>
          </button>
        </div>
      </div>

      {/* Selected Plan Details Card */}
      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {activePlan.name}
              </h3>
              {activePlan.badge && (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {activePlan.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activePlan.description}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{activePlan.price}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
              {activePlan.periodLabel}
            </span>
          </div>
        </div>

        {/* Feature List */}
        <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
            {activePlan.features.map((feat, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Comparison against Free Limits */}
      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span>Free Tier limits: <strong>{FREE_TIER_LIMITS.maxClients} clients</strong> and <strong>{FREE_TIER_LIMITS.maxInvoicesPerMonth} invoices/mo</strong></span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Pro: Unlimited</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        {isMandatory && onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onStartPayment}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-120 cursor-pointer border-0 shadow-xs disabled:opacity-50"
        >
          <Zap size={14} />
          <span>{loading ? 'Initializing Checkout...' : `Upgrade Now (₹${activePlan.price})`}</span>
        </button>
      </div>
    </div>
  );
};
