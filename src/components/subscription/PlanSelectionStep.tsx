import React from 'react';
import { LogOut, Check } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { PRO_PLANS, PlanIntervalKey, getTrialDisclosureText } from '../../lib/subscriptionPlans';

interface PlanSelectionStepProps {
  selectedCycle: PlanIntervalKey;
  onSelectCycle: (cycle: PlanIntervalKey) => void;
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
  const shouldReduceMotion = useReducedMotion();
  const activePlan = PRO_PLANS.find((p) => p.id === selectedCycle) || PRO_PLANS[0];
  const disclosureText = getTrialDisclosureText(activePlan);

  return (
    <div className="space-y-4">
      {/* 4 Plans Segmented Tabs */}
      <div
        className="relative grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/60 select-none"
        role="tablist"
        aria-label="Pro plan billing frequency"
      >
        {PRO_PLANS.map((p) => {
          const isSelected = selectedCycle === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectCycle(p.id)}
              className={`relative z-10 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer border-none text-center outline-none ${
                isSelected
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="planTabIndicator"
                  className="absolute inset-0 bg-white dark:bg-slate-900 rounded shadow-xs -z-10"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 38 }
                  }
                />
              )}
              <div className="relative z-10">{p.name.replace('Pro ', '')}</div>
              <div className="relative z-10 text-[11px] text-slate-500 dark:text-slate-400">
                ₹{p.price.toLocaleString('en-IN')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Plan Details Card */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePlan.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.14 }}
              className="min-w-0"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {activePlan.name}
                </h3>
                {activePlan.savingsBadge && (
                  <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {activePlan.savingsBadge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activePlan.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="text-right shrink-0">
            <span className="text-xl font-bold text-slate-900 dark:text-white inline-flex items-baseline">
              <NumberFlow
                value={activePlan.price}
                format={{
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }}
                animated={!shouldReduceMotion}
              />
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
              {activePlan.periodLabel}
            </span>
          </div>
        </div>

        {/* Feature List */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {activePlan.features.map((feat, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mandatory Trial Disclosure */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePlan.id}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400"
          >
            {disclosureText}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        {isMandatory && onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer border-none bg-transparent"
          >
            <LogOut size={13} className="inline mr-1" />
            Sign Out
          </button>
        ) : (
          <div />
        )}

        <motion.button
          type="button"
          onClick={onStartPayment}
          disabled={loading}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.1 }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none disabled:opacity-50"
        >
          {loading ? 'Initializing Checkout...' : 'Start 7-Day Trial (₹1)'}
        </motion.button>
      </div>
    </div>
  );
};
