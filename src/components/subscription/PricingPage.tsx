import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import { PRO_PLANS, FREE_TIER_LIMITS, PlanPricing } from '../../lib/subscriptionPlans';
import { loadRazorpayScript } from '../../lib/razorpay';
import { PricingCard } from './PricingCard';
import { ActivatingPaymentModal } from './ActivatingPaymentModal';
import { Check } from 'lucide-react';

interface PricingPageProps {
  user?: User | null;
  profile?: UserProfile | null;
  onNavigateToDashboard?: () => void;
  onNavigateToBilling?: () => void;
  onSubscriptionActivated?: () => void;
  onNavigateToAuth?: () => void;
}

export default function PricingPage({
  user,
  profile,
  onNavigateToDashboard,
  onSubscriptionActivated,
  onNavigateToAuth,
}: PricingPageProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActivatingOpen, setIsActivatingOpen] = useState(false);

  const handleStartPlanCheckout = async (plan: PlanPricing) => {
    if (!user) {
      if (onNavigateToAuth) {
        onNavigateToAuth();
      } else {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }

    setSelectedPlanId(plan.id);
    setLoading(true);
    setError(null);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Could not load Razorpay payment gateway. Please check your network connection.');
      }

      const idToken = await user.getIdToken();

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount: plan.price * 100,
          currency: 'INR',
          planKey: plan.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initialize payment order');
      }

      const { order_id, orderId, key_id, keyId, amount: resAmount } = await res.json();
      const effectiveOrderId = order_id || orderId;
      const rzpKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || key_id || keyId;

      if (!rzpKey) {
        throw new Error('Razorpay public key is missing.');
      }

      const options: any = {
        key: rzpKey,
        order_id: effectiveOrderId,
        amount: resAmount || plan.price * 100,
        currency: 'INR',
        name: 'CrestFlow Pro',
        description: `${plan.name} Subscription`,
        image: '/app_logo_icon.png',
        prefill: {
          name: profile?.name || user.displayName || '',
          email: user.email || '',
          contact: profile?.phone || '',
        },
        theme: {
          color: '#282828',
        },
        handler: async function (response: any) {
          setIsActivatingOpen(true);
          setLoading(false);
          try {
            const paymentId = response.razorpay_payment_id;
            const resOrder = response.razorpay_order_id || effectiveOrderId;

            await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                paymentId,
                orderId: resOrder,
                signature: response.razorpay_signature,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: resOrder,
                razorpay_signature: response.razorpay_signature,
                planKey: plan.id,
              }),
            });
          } catch (e) {
            console.warn('[PricingPage] verify error:', e);
          }
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
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Simple, Transparent Pricing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Start free with up to {FREE_TIER_LIMITS.maxClients} clients, or upgrade to CrestFlow Pro for automated deliveries, client portals, and unlimited clients.
          </p>
        </div>

        {/* Free Plan Card */}
        <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Free Starter Plan</span>
              <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Perpetual Free</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {FREE_TIER_LIMITS.maxClients} clients total &bull; Up to {FREE_TIER_LIMITS.maxInvoicesPerMonth} invoices per calendar month &bull; Personal UPI QR invoices
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (user && onNavigateToDashboard) onNavigateToDashboard();
              else if (onNavigateToAuth) onNavigateToAuth();
              else {
                window.history.pushState({}, '', user ? '/dashboard' : '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {user ? 'Current Free Limits' : 'Get Started Free'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Pro Plans Grid */}
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
            Trial &amp; Auto-Renewal Disclosure
          </p>
          <p>
            First-time subscribers are charged a non-refundable ₹1 verification fee for a 7-day trial. At the conclusion of the 7-day period, the recurring fee for your chosen plan will be billed automatically to your designated payment method via Razorpay. Cancel anytime in your billing settings without losing remaining active days.
          </p>
        </div>
      </div>

      {user && (
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
      )}
    </div>
  );
}
