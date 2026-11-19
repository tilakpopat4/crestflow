import React from 'react';
import { ShieldCheck } from 'lucide-react';

import { PlanIntervalKey, PRO_PLANS } from '../../lib/subscriptionPlans';

interface SubscriptionSuccessStepProps {
  onClose: () => void;
  billingCycle?: PlanIntervalKey;
}

export const SubscriptionSuccessStep: React.FC<SubscriptionSuccessStepProps> = ({ onClose, billingCycle = 'monthly' }) => {
  const planName = PRO_PLANS.find((p) => p.id === billingCycle)?.name || 'Pro';

  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-12 h-12 rounded-full bg-surface-600 border border-surface-400 text-text-primary mx-auto flex items-center justify-center">
        <ShieldCheck size={26} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          Pro Subscription Activated
        </h3>
        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
          Your CrestFlow {planName} membership is now active. All client limits, automated invoicing, and tracking tools are unlocked.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors cursor-pointer border-0"
      >
        Start Using CrestFlow Pro
      </button>
    </div>
  );
};
