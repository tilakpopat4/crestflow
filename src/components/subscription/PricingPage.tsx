import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import {
  PlanPricing,
  PaidPlanKey,
  TRIAL_PROMISE_COPY,
  getPlanDisclosureText,
} from '../../shared/pricing';
import { usePricingConfig } from '../../lib/pricingConfig';
import { useAccess } from '../../hooks/useAccess';
import { useToast } from '../../context/ToastContext';
import { launchPlanCheckout } from '../../lib/razorpay';
import { PricingCard } from './PricingCard';
import { Loader2, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';

interface PricingPageProps {
  user?: User | null;
  profile?: UserProfile | null;
  onNavigateToDashboard?: () => void;
  onNavigateToBilling?: () => void;
  onSubscriptionActivated?: () => void;
  onNavigateToAuth?: () => void;
}

const PRICING_FAQS = [
  {
    q: 'Do I need a card to start the 7-day free trial?',
    a: 'No. Your trial starts with zero payment method required and zero automatic charge when day 7 ends.',
  },
  {
    q: 'What happens if my trial or plan expires?',
    a: 'Your workspace switches to read & export mode. Existing client, work item, and invoice records remain safe and exportable as JSON or CSV anytime.',
  },
  {
    q: 'Do shared client invoice links keep working after expiry?',
    a: 'Yes. Existing token-protected invoice links stay viewable and payable via UPI so your clients are never disrupted.',
  },
  {
    q: 'Does CrestFlow take a cut from my client payments?',
    a: 'No. Client UPI QR payments go directly from your client to your own UPI ID with 0% commission.',
  },
];

/**
 * Unified Pricing Page in Section 9 Obsidian + Ember palette highlighting Yearly Best Value.
 */
export default function PricingPage({
  user,
  profile,
  onNavigateToDashboard,
  onSubscriptionActivated,
  onNavigateToAuth,
}: PricingPageProps) {
  const { config: pricingConfig, trialPlan, proPlans } = usePricingConfig();
  const access = useAccess();
  const { showToast } = useToast();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('yearly');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [activatingTimedOut, setActivatingTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const orderedPlans: PlanPricing[] = [trialPlan, ...proPlans].filter(Boolean);
  const checkoutMode = access.recurringPlansConfigured ? 'subscription' : 'order';

  const handleSelectPlan = async (plan: PlanPricing) => {
    if (!user) {
      if (onNavigateToAuth) {
        onNavigateToAuth();
      } else {
        window.history.pushState({}, '', '/signup');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }

    setSelectedPlanId(plan.id);
    setError(null);

    if (plan.isTrial || plan.id === 'trial') {
      setLoadingPlanId('trial');
      const res = await access.activateTrial();
      setLoadingPlanId(null);
      if (!res.success) {
        setError(res.error || 'Unable to start free trial.');
        return;
      }
      showToast('7-day free trial activated.', 'success');
      await onSubscriptionActivated?.();
      onNavigateToDashboard?.();
      return;
    }

    if (access.state === 'active' || access.state === 'grace') {
      setError('You already have an active paid plan. Mid-period switching is disabled in this phase.');
      return;
    }

    setLoadingPlanId(plan.id);
    setActivatingTimedOut(false);

    try {
      await launchPlanCheckout({
        planKey: plan.id as PaidPlanKey,
        name: profile?.name || user.displayName || 'CrestFlow Creator',
        email: user.email || '',
        phone: profile?.phone || '',
        uid: user.uid,
        onActivating: () => {
          access.setActivatingPlan(true);
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(() => setActivatingTimedOut(true), 10000);
        },
        onDismiss: () => {
          setLoadingPlanId(null);
          access.setActivatingPlan(false);
        },
        onFailure: (msg) => {
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          setLoadingPlanId(null);
          access.setActivatingPlan(false);
          setActivatingTimedOut(false);
          setError(msg);
        },
        onSuccess: async () => {
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          await access.refreshAccess();
          await onSubscriptionActivated?.();
          setLoadingPlanId(null);
          access.setActivatingPlan(false);
          setActivatingTimedOut(false);
          showToast(`${plan.name} activated.`, 'success');
          onNavigateToDashboard?.();
        },
      });
    } catch (err) {
      setLoadingPlanId(null);
      access.setActivatingPlan(false);
      setError(err instanceof Error ? err.message : 'Unable to start Razorpay checkout.');
    }
  };

  return (
    <div className="w-full bg-[#0B0B0E] text-[#F7F7F8] py-10 md:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#FFC145]">
            CrestFlow Pro Pricing
          </span>
          <h1 className="font-hero-condensed text-4xl sm:text-5xl text-[#F7F7F8] tracking-wide uppercase">
            {pricingConfig.pricingTitle}
          </h1>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            {TRIAL_PROMISE_COPY} Direct UPI invoicing with zero commission on client payments.
          </p>
        </div>

        {/* Activating Plan State (zero wall / flicker while verifying checkout) */}
        {access.activatingPlan && (
          <div className="max-w-lg mx-auto rounded-xl bg-[#131318] border border-[#FFC145]/40 p-5 text-center space-y-3">
            <Loader2 size={24} className="animate-spin text-[#FFC145] mx-auto" />
            <div className="text-sm font-semibold text-[#F7F7F8]">Activating your plan...</div>
            <p className="text-xs text-[#A1A1AA]">
              Confirming payment signature and syncing your workspace access.
            </p>
            {activatingTimedOut && (
              <button
                type="button"
                onClick={async () => {
                  await access.refreshAccess();
                  if (access.canWrite) {
                    access.setActivatingPlan(false);
                    onNavigateToDashboard?.();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B1B22] border border-[#2A2A33] text-xs font-semibold text-[#F7F7F8] cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Refresh status</span>
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto rounded-xl bg-[#1B1B22] border border-[#F0607A]/50 p-3.5 flex items-start gap-2.5 text-xs text-[#F0607A]">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {orderedPlans.map((plan) => {
            const isTrial = Boolean(plan.isTrial || plan.id === 'trial');
            const isCurrentPlan =
              (isTrial && access.state === 'trialing') ||
              (!isTrial && access.state === 'active' && access.billingCycle === plan.id);
            const disclosureText = isTrial
              ? TRIAL_PROMISE_COPY
              : getPlanDisclosureText(plan, checkoutMode);

            return (
              <PricingCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlanId === plan.id}
                isCurrentPlan={isCurrentPlan}
                isTrialUsed={Boolean(user && access.trialUsed)}
                loading={loadingPlanId === plan.id}
                disclosureText={disclosureText}
                onSelect={handleSelectPlan}
              />
            );
          })}
        </div>

        {/* Honest Refund & Cancellation Guarantee Matching /refund */}
        <div className="max-w-3xl mx-auto rounded-xl bg-[#131318] border border-[#2A2A33] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#A1A1AA]">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-[#2DD4A0] shrink-0 mt-0.5" />
            <span>
              Cancel auto-renewal anytime and keep Pro access until the end of your current paid period. Refunds on initial charges are reviewed within 7 calendar days under our Refund Policy.
            </span>
          </div>
          <a
            href="/refund"
            className="text-[#F7F7F8] font-semibold whitespace-nowrap hover:underline shrink-0"
          >
            Read Refund Policy
          </a>
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto space-y-5">
          <h2 className="text-lg font-semibold text-[#F7F7F8] text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRICING_FAQS.map((item) => (
              <div
                key={item.q}
                className="rounded-xl bg-[#131318] border border-[#2A2A33] p-4 space-y-1.5"
              >
                <h3 className="text-xs font-semibold text-[#F7F7F8]">{item.q}</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
