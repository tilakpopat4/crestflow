import React from 'react';
import { motion } from 'motion/react';
import { FREELANCE_CURRENCIES } from '../lib/currencyUtils';

interface RatesCurrencySelectorProps {
  currency: string;
  onChange: (currency: string) => void;
  shouldReduceMotion: boolean | null;
}

/**
 * Currency selector segmented control with smooth sliding active indicator.
 */
export const RatesCurrencySelector: React.FC<RatesCurrencySelectorProps> = ({
  currency,
  onChange,
  shouldReduceMotion,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        Payment Currency *
      </label>
      <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
        {FREELANCE_CURRENCIES.map((c) => {
          const isSelected = currency === c.code;
          return (
            <motion.button
              key={c.code}
              type="button"
              onClick={() => onChange(c.code)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className={`relative py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border-0 select-none transition-colors duration-120 ${
                isSelected
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCurrencyIndicator"
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-2xs"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 35 }
                  }
                />
              )}
              <span className="relative z-10 font-mono text-sm">{c.symbol}</span>
              <span className="relative z-10">{c.code}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default RatesCurrencySelector;

