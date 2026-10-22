import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import { PRO_PLANS, PlanPricing } from '../../lib/subscriptionPlans';
import { PricingCard } from './PricingCard';
import { ActivatingPaymentModal } from './ActivatingPaymentModal';

interface PricingPageProps {
  user: User;
  profile?: UserProfile | null;
  onNavigateToDashboard?: () => void;
  onNavigateToBilling?: () => void;
  onSubscriptionActivated?: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage({
  user,
  profile,
  onNavigateToDashboard,
  onSubscriptionActivated,
}: PricingPageProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActivatingOpen, setIsActivatingOpen] = useState(false);

  const handleStartPlanCheckout = async (plan: PlanPricing) => {
    setSelectedPlanId(plan.id);
    setLoading(true);
    setError(null);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Could not load Razorpay payment gateway. Please check your network connection.');
      }

      const idToken = await user.getIdToken();

      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ planKey: plan.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initialize subscription session');
      }

      const { subscriptionId, keyId } = await res.json();
      const rzpKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || keyId;

      if (!rzpKey) {
        throw new Error('Razorpay public key is missing.');
      }

      const options = {
        key: rzpKey,
        subscription_id: subscriptionId,
        name: 'CrestFlow Pro',
        description: `${plan.name} Subscription`,
        image: '/app_logo_icon.png',
        prefill: {
          name: profile?.name || user.displayName || '',
          email: user.email || '',
          contact: profile?.phone || '',
        },
        theme: {
          color: '#4f46e5',
        },
        handler: function () {
          setIsActivatingOpen(true);
          setLoading(false);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('[PricingPage] Checkout error:', err);
      setError(err.message || 'Payment initiation failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Choose Your Membership
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Automate client portals, 6:00 AM delivery schedules, and direct UPI invoice settlements without platform transaction fees.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* 4 Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {PRO_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlanId === plan.id}
              onSelect={handleStartPlanCheckout}
              isLoading={loading}
              isFirstTime={true}
            />
          ))}
        </div>

        {/* Policy & Disclosure Note */}
        <div className="max-w-2xl mx-auto p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Trial & Auto-Renewal Disclosure
          </p>
          <p>
            First-time subscribers are charged a non-refundable ₹1 verification fee for a 7-day trial. At the conclusion of the 7-day period, the recurring fee for your chosen plan will be billed automatically to your designated payment method. You can cancel auto-renewal anytime in your billing settings without losing access for the remainder of your active period.
          </p>
        </div>
      </div>

      <ActivatingPaymentModal
        userId={user.uid}
        isOpen={isActivatingOpen}
        onActivated={() => {
          setIsActivatingOpen(false);
          if (onSubscriptionActivated) onSubscriptionActivated();
          if (onNavigateToDashboard) onNavigateToDashboard();
        }}
        onClose={() => setIsActivatingOpen(false)}
      />
    </div>
  );
}
