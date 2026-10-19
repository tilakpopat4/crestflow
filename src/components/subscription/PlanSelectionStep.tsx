import React from 'react';
import { RefreshCw, LogOut } from 'lucide-react';
import { SubscriptionPlanItem } from '../../types';
import { SUBSCRIPTION_PLAN } from '../../lib/youpiService';

interface PlanSelectionStepProps {
  plans: SubscriptionPlanItem[];
  selectedPlan: SubscriptionPlanItem | null;
  onSelectPlan: (plan: SubscriptionPlanItem) => void;
  loadingPlans: boolean;
  loading: boolean;
  onStartPayment: () => void;
  isMandatory?: boolean;
  onLogout?: () => void;
}

export const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({
  plans,
  selectedPlan,
  onSelectPlan,
  loadingPlans,
  loading,
  onStartPayment,
  isMandatory,
  onLogout
}) => {
  if (loadingPlans) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-600" />
        Loading available plans and offers...
      </div>
    );
  }

  const activePlan = selectedPlan || plans[0] || SUBSCRIPTION_PLAN;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {plans.map((p) => {
          const isSelected = selectedPlan?.id === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelectPlan(p)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {p.name}
                      </h3>
                      {p.badge && (
                        <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                          • {p.badge}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    ₹{p.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                    {p.periodLabel}
                  </span>
                </div>
              </div>

              {(isSelected || plans.length === 1) && p.features && p.features.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-slate-400 shrink-0">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        {isMandatory && onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
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
          disabled={loading || loadingPlans || !selectedPlan}
          className="px-5 py-2.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Initializing...' : `Pay ₹${activePlan.price.toFixed(2)} with UPI`}
        </button>
      </div>
    </div>
  );
};
