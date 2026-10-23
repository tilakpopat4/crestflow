import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export type FREQUENCY = 'monthly' | 'yearly';

interface FrequencyToggleProps {
  frequency: FREQUENCY;
  setFrequency: (frequency: FREQUENCY) => void;
  className?: string;
}

export function FrequencyToggle({
  frequency,
  setFrequency,
  className,
}: FrequencyToggleProps) {
  return (
    <div
      className={cn(
        "relative flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 select-none",
        className
      )}
      role="group"
      aria-label="Billing frequency selection"
    >
      <button
        type="button"
        onClick={() => setFrequency('monthly')}
        className={cn(
          "relative z-10 px-4 py-1.5 text-xs md:text-sm font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg",
          frequency === 'monthly'
            ? "text-slate-900 font-semibold"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        {frequency === 'monthly' && (
          <motion.div
            layoutId="frequencyToggleIndicator"
            className="absolute inset-0 bg-white rounded-lg shadow-xs -z-0"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative z-10">Monthly billing</span>
      </button>

      <button
        type="button"
        onClick={() => setFrequency('yearly')}
        className={cn(
          "relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-xs md:text-sm font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg",
          frequency === 'yearly'
            ? "text-slate-900 font-semibold"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        {frequency === 'yearly' && (
          <motion.div
            layoutId="frequencyToggleIndicator"
            className="absolute inset-0 bg-white rounded-lg shadow-xs -z-0"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative z-10">Annual billing</span>
        <span className="relative z-10 rounded-full bg-slate-200/90 text-slate-800 px-1.5 py-0.2 text-[10px] font-semibold tracking-wide">
          Save 16%
        </span>
      </button>
    </div>
  );
}
