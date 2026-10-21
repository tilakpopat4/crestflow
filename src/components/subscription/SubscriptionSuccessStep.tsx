import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface SubscriptionSuccessStepProps {
  onClose: () => void;
  billingCycle?: 'monthly' | 'yearly';
}

export const SubscriptionSuccessStep: React.FC<SubscriptionSuccessStepProps> = ({ onClose, billingCycle = 'monthly' }) => {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
        <ShieldCheck size={26} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Pro Subscription Activated
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          Your CrestFlow Pro ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}) membership is now active. All client limits, automated invoicing, and tracking tools are unlocked.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer border-0"
      >
        Start Using CrestFlow Pro
      </button>
    </div>
  );
};
