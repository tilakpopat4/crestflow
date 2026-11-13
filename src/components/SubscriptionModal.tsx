import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { PlanSelectionStep } from './subscription/PlanSelectionStep';
import { SubscriptionSuccessStep } from './subscription/SubscriptionSuccessStep';

import { PlanIntervalKey, ALL_DISPLAY_PLANS, TRIAL_PLAN } from '../lib/subscriptionPlans';
import { loadRazorpayScript } from '../lib/razorpay';

export interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  profile?: UserProfile | null;
  onSubscriptionUpdated?: () => void;
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
  onLogout,
}: SubscriptionModalProps) {
  const [step, setStep] = useState<'select' | 'activating' | 'success'>('select');
  const [selectedCycle, setSelectedCycle] = useState<PlanIntervalKey>('trial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subData, setSubData] = useState<any>(null);

  // Listen to Firestore for user subscription history to know if trial has been claimed
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'subscriptions', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSubData(data);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const isTrialUsed = Boolean(
    subData?.status === 'trialing' ||
    Boolean(subData?.trialEndsAt) ||
    (subData?.hasHadTrial && subData?.status !== 'pending' && Boolean(subData?.trialEndsAt || subData?.currentPeriodEnd))
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedCycle(isTrialUsed ? 'monthly' : 'trial');
      setLoading(false);
      setError(null);
    }
  }, [isOpen, isTrialUsed]);

  // While in 'activating' step, listen to Firestore in real time for webhook confirmation
  useEffect(() => {
    if (step !== 'activating' || !user?.uid) return;

    const unsub = onSnapshot(
      doc(db, 'subscriptions', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if ((data?.status === 'active' || data?.status === 'trialing') && data?.accessUntil) {
            setStep('success');
            if (onSubscriptionUpdated) {
              onSubscriptionUpdated();
            }
          }
        }
      },
      (err) => console.warn('[SubscriptionModal] Firestore watch error:', err)
    );

    return () => unsub();
  }, [step, user?.uid, onSubscriptionUpdated]);

  const handleStartPayment = async () => {
    setLoading(true);
    setError(null);

    const isTrial = selectedCycle === 'trial';
    const activePlan = ALL_DISPLAY_PLANS.find((p) => p.id === selectedCycle) || TRIAL_PLAN;

    try {
      // 1. Ensure Razorpay Checkout script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Unable to connect to Razorpay payment gateway. Please check your internet connection.');
      }

      // 2. Fetch Firebase ID token
      const idToken = await user.getIdToken();

      // 3. Request order creation from Cloudflare Worker
      const amountPaise = isTrial ? 100 : activePlan.price * 100;
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          planKey: isTrial ? 'trial' : selectedCycle,
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

      // 4. Open Razorpay Checkout modal
      const options: any = {
        key: rzpKey,
        order_id: effectiveOrderId,
        amount: resAmount || amountPaise,
        currency: 'INR',
        name: 'CrestFlow Pro',
        description: isTrial
          ? 'CrestFlow Pro 7-Day Trial (₹1)'
          : `CrestFlow Pro ${activePlan.name} (₹${activePlan.price.toLocaleString('en-IN')})`,
        image: '/app_logo_icon.png',
        prefill: { name: profile?.name || user.displayName || '', email: user.email || '', contact: profile?.phone || '' },
        theme: { color: '#282828' },
        handler: async function (response: any) {
          setStep('activating');
          try {
            const resOrder = response.razorpay_order_id || effectiveOrderId;
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({
                paymentId: response.razorpay_payment_id, orderId: resOrder, signature: response.razorpay_signature,
                razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: resOrder, razorpay_signature: response.razorpay_signature,
                planKey: isTrial ? 'trial' : selectedCycle,
              }),
            });

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json().catch(() => ({}));
              if (verifyData.accessUntil) {
                try {
                  localStorage.setItem(`crestflow_sub_${user.uid}`, JSON.stringify({
                    userId: user.uid, status: verifyData.subscriptionStatus || 'active', plan: 'pro',
                    accessUntil: verifyData.accessUntil, trialEndsAt: verifyData.subscriptionStatus === 'trialing' ? verifyData.accessUntil : null,
                  }));
                } catch {}
              }
              setStep('success');
              if (onSubscriptionUpdated) await onSubscriptionUpdated();
            } else {
              const errJson = await verifyRes.json().catch(() => ({}));
              setError(errJson.error || 'Payment verification failed');
              setStep('select');
              setLoading(false);
            }
          } catch (e: any) {
            setError(e.message || 'Payment verification failed');
            setStep('select');
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('[SubscriptionModal] Checkout error:', err);
      setError(err.message || 'Payment initiation failed. Please try again.');
      setLoading(false);
    }
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="subscription-modal-overlay"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => {
            if (!isMandatory && step !== 'activating') onClose();
          }}
          className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            id="subscription-modal-container"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {step === 'success' ? 'Subscription Active' : 'Upgrade to CrestFlow Pro'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {step === 'select'
                    ? 'Unlock unlimited clients, automated invoices, and tracking tools'
                    : step === 'activating'
                    ? 'Authorizing subscription with Razorpay...'
                    : 'Your CrestFlow account is now active'}
                </p>
              </div>
              {!isMandatory && step !== 'activating' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-0 cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {step === 'select' && (
                <PlanSelectionStep
                  selectedCycle={selectedCycle}
                  onSelectCycle={setSelectedCycle}
                  loading={loading}
                  onStartPayment={handleStartPayment}
                  isMandatory={isMandatory}
                  onLogout={onLogout}
                  isTrialUsed={isTrialUsed}
                />
              )}

              {step === 'activating' && (
                <div className="text-center py-10 space-y-4">
                  <div className="relative flex items-center justify-center w-12 h-12 mx-auto">
                    <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Verifying Payment...
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Razorpay is confirming your recurring subscription. Your account will automatically activate as soon as confirmation arrives.
                    </p>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <SubscriptionSuccessStep onClose={onClose} billingCycle={selectedCycle} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
