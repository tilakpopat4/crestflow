import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ShieldCheck } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { PlanSelectionStep } from './subscription/PlanSelectionStep';
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

/**
 * Dynamically injects Razorpay Checkout script if not already present in DOM.
 */
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
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // While in 'activating' step, listen to Firestore in real time for webhook confirmation
  useEffect(() => {
    if (step !== 'activating' || !user?.uid) return;

    const unsub = onSnapshot(
      doc(db, 'subscriptions', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.status === 'active' && data?.plan === 'pro') {
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

    try {
      // 1. Ensure Razorpay Checkout script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Unable to connect to Razorpay payment gateway. Please check your internet connection.');
      }

      // 2. Fetch Firebase ID token
      const idToken = await user.getIdToken();

      // 3. Request subscription creation from Cloudflare Worker
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ plan: selectedCycle }),
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

      // 4. Open Razorpay Checkout modal
      const options = {
        key: rzpKey,
        subscription_id: subscriptionId,
        name: 'CrestFlow Pro',
        description: `CrestFlow Pro (${selectedCycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
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
          // Payment submitted by user; transition to waiting state for webhook confirmation
          setStep('activating');
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
      console.error('[SubscriptionModal] Checkout error:', err);
      setError(err.message || 'Payment initiation failed. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="subscription-modal-overlay"
      onClick={() => {
        if (!isMandatory && step !== 'activating') onClose();
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
      </div>
    </div>
  );
}
