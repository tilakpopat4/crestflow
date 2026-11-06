import React from 'react';
import { motion } from 'motion/react';

interface RatesBasisSelectorProps {
  paymentBasis: 'per_reel' | 'monthly_retainer';
  onChange: (basis: 'per_reel' | 'monthly_retainer') => void;
  shouldReduceMotion: boolean | null;
}

/**
 * Payment basis switcher with flat light background styling and spring animation.
 */
export const RatesBasisSelector: React.FC<RatesBasisSelectorProps> = ({
  paymentBasis,
  onChange,
  shouldReduceMotion,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        Payment Basis / Billing Type *
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-[#212121] p-1 rounded-xl">
        <motion.button
          type="button"
          onClick={() => onChange('per_reel')}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          className={`relative p-3 rounded-lg text-left cursor-pointer border-0 select-none transition-colors duration-120 ${
            paymentBasis === 'per_reel'
              ? 'text-white'
              : 'text-slate-400 hover:text-white hover:bg-[#282828] active:bg-[#333333]'
          }`}
        >
          {paymentBasis === 'per_reel' && (
            <motion.div
              layoutId="activePaymentBasisIndicator"
              className="absolute inset-0 bg-[#383838] rounded-lg shadow-2xs z-0"
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 500, damping: 35 }
              }
            />
          )}
          <div className="relative z-10">
            <div className="text-xs font-bold">Per Reel / Deliverable</div>
            <div className="text-[11px] opacity-75 mt-0.5">Calculated per video item</div>
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => onChange('monthly_retainer')}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          className={`relative p-3 rounded-lg text-left cursor-pointer border-0 select-none transition-colors duration-120 ${
            paymentBasis === 'monthly_retainer'
              ? 'text-white'
              : 'text-slate-400 hover:text-white hover:bg-[#282828] active:bg-[#333333]'
          }`}
        >
          {paymentBasis === 'monthly_retainer' && (
            <motion.div
              layoutId="activePaymentBasisIndicator"
              className="absolute inset-0 bg-[#383838] rounded-lg shadow-2xs z-0"
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 500, damping: 35 }
              }
            />
          )}
          <div className="relative z-10">
            <div className="text-xs font-bold">Monthly Retainer</div>
            <div className="text-[11px] opacity-75 mt-0.5">Fixed monthly fee</div>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default RatesBasisSelector;

