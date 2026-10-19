import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile, SubscriptionPlanItem } from '../types';
import {
  SUBSCRIPTION_PLAN,
  createSubscriptionOrder,
  checkPaymentStatus,
  activateSubscription,
  listenPaymentEvents,
  PaymentSessionResult,
  getReceivingUpiId,
  fetchSubscriptionPlans,
  cancelSubscriptionOrder
} from '../lib/youpiService';
import { PlanSelectionStep } from './subscription/PlanSelectionStep';
import { PaymentQrStep } from './subscription/PaymentQrStep';
import { SubscriptionSuccessStep } from './subscription/SubscriptionSuccessStep';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  profile?: UserProfile | null;
  onSubscriptionUpdated?: () => Promise<void>;
  isMandatory?: boolean;
  onLogout?: () => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  user,
  profile,
  onSubscriptionUpdated,
  isMandatory = false,
  onLogout
}: SubscriptionModalProps) {
  const [step, setStep] = useState<'select' | 'pay' | 'success'>('select');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<PaymentSessionResult | null>(null);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(300);

  // Dynamic Plans
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanItem | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const merchantVpa = getReceivingUpiId();
  const isActivatingRef = useRef(false);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSession(null);
      setError(null);
      setRemainingSeconds(300);
      isActivatingRef.current = false;
      setLoadingPlans(true);
      fetchSubscriptionPlans(true)
        .then((list) => {
          setPlans(list);
          setSelectedPlan(list[0] || null);
        })
        .catch((err) => {
          console.warn('Failed to load plans:', err);
        })
        .finally(() => {
          setLoadingPlans(false);
        });
    }
  }, [isOpen]);

  // Handle authoritative activation upon bank credit confirmation
  const handlePaymentSuccess = useCallback(async (details?: any) => {
    if (isActivatingRef.current || !session) return;
    isActivatingRef.current = true;

    try {
      const planToUse = selectedPlan || plans[0] || SUBSCRIPTION_PLAN;
      const utr = details?.utr || `UPI-${session.orderId.slice(-8)}`;

      await activateSubscription({
        userId: user.uid,
        orderId: session.orderId,
        paymentId: session.paymentId,
        amount: session.amount,
        utr,
        planCode: planToUse.planCode || 'monthly',
        durationDays: planToUse.durationDays || 30
      });

      if (onSubscriptionUpdated) {
        await onSubscriptionUpdated();
      }
      setStep('success');
    } catch (err: any) {
      console.error('[SubscriptionModal] Activation error:', err);
      setError('Payment was observed, but activation encountered an error. Please click refresh.');
    } finally {
      isActivatingRef.current = false;
    }
  }, [session, selectedPlan, plans, user.uid, onSubscriptionUpdated]);

  // Real-time Gateway Observer: SSE stream + high-frequency 2-second poller
  useEffect(() => {
    if (step !== 'pay' || !session?.paymentId) return;

    let isMounted = true;
    const paymentId = session.paymentId;

    // 1. SSE Real-time Stream directly from payment-api (port 6100)
    const unsubscribeSse = listenPaymentEvents(paymentId, (details) => {
      if (!isMounted) return;
      if (details.status === 'SUCCESS') {
        handlePaymentSuccess(details);
      }
    });

    // 2. High-Frequency 2-second polling fallback
    const interval = setInterval(async () => {
      if (!isMounted || isActivatingRef.current) return;
      try {
        const details = await checkPaymentStatus(paymentId);
        if (!isMounted) return;
        if (details?.status === 'SUCCESS') {
          clearInterval(interval);
          handlePaymentSuccess(details);
        }
      } catch {}
    }, 2000);

    return () => {
      isMounted = false;
      unsubscribeSse();
      clearInterval(interval);
    };
  }, [step, session, handlePaymentSuccess]);

  // Session expiry countdown timer (5 minutes for YouPI single-slot lock)
  useEffect(() => {
    if (step !== 'pay') return;
    setRemainingSeconds(300);
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCancelOrder = async () => {
    if (session?.orderId) {
      await cancelSubscriptionOrder(session.orderId, session.paymentId);
    }
    setSession(null);
    setStep('select');
    setError(null);
  };

  const handleModalClose = async () => {
    if (step === 'pay' && session?.orderId) {
      await cancelSubscriptionOrder(session.orderId, session.paymentId);
    }
    onClose();
  };

  const handleStartPayment = async () => {
    setLoading(true);
    setError(null);
    const planToUse = selectedPlan || plans[0] || SUBSCRIPTION_PLAN;
    try {
      const orderSession = await createSubscriptionOrder({
        userId: user.uid,
        userName: profile?.name || user.displayName || 'CrestFlow Member',
        userEmail: user.email || '',
        plan: planToUse?.planCode || 'monthly',
        planName: planToUse?.name || 'CrestFlow Pro',
        amount: planToUse?.price,
        durationDays: planToUse?.durationDays,
        merchantVpa
      });
      setSession(orderSession);
      setStep('pay');
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize payment session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyVpa = () => {
    navigator.clipboard.writeText(merchantVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="subscription-modal-overlay"
      onClick={() => {
        if (!isMandatory) handleModalClose();
      }}
      className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="subscription-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {step === 'success' ? 'Subscription Active' : 'CrestFlow Subscription'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {step === 'select'
                ? 'Active subscription required to use CrestFlow (₹49 / month)'
                : step === 'pay'
                ? 'Instant bank attribution enabled — scan and pay with any UPI app'
                : 'Your CrestFlow account is now active'}
            </p>
          </div>
          {!isMandatory && (
            <button
              type="button"
              onClick={handleModalClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {step === 'select' && (
            <PlanSelectionStep
              plans={plans}
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
              loadingPlans={loadingPlans}
              loading={loading}
              onStartPayment={handleStartPayment}
              isMandatory={isMandatory}
              onLogout={onLogout}
            />
          )}

          {step === 'pay' && session && (
            <PaymentQrStep
              session={session}
              merchantVpa={merchantVpa}
              remainingSeconds={remainingSeconds}
              copiedVpa={copiedVpa}
              onCopyVpa={copyVpa}
              formatTimer={formatTimer}
              onCancel={handleCancelOrder}
            />
          )}

          {step === 'success' && (
            <SubscriptionSuccessStep onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
