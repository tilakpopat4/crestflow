import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogOut, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import { UserProfile } from '../../types';
import { SubscriptionState } from '../../hooks/useSubscription';
import { AppRoute } from '../../lib/router';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ALL_DISPLAY_PLANS, PlanIntervalKey, TRIAL_PLAN, getTrialDisclosureText } from '../../lib/subscriptionPlans';
import { loadRazorpayScript } from '../../lib/razorpay';

interface SubscriptionWallPageProps {
  user: User;
  profile?: UserProfile | null;
  subscriptionState: SubscriptionState;
  onLogout: () => void;
  onNavigate?: (route: AppRoute) => void;
}

export default function SubscriptionWallPage({
  user,
  profile,
  subscriptionState,
  onLogout,
}: SubscriptionWallPageProps) {
  const [selectedCycle, setSelectedCycle] = useState<PlanIntervalKey>('trial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subData, setSubData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'subscriptions', user.uid), (snap) => {
      if (snap.exists()) setSubData(snap.data());
    });
    return () => unsub();
  }, [user?.uid]);

  const isTrialUsed = Boolean(
    subData?.hasHadTrial || subData?.hasHadSubscription || subData?.trialEndsAt ||
    subData?.status === 'active' || subData?.status === 'trialing' ||
    subData?.status === 'cancelled' || subData?.status === 'expired'
  );

  useEffect(() => {
    if (isTrialUsed && selectedCycle === 'trial') setSelectedCycle('monthly');
  }, [isTrialUsed, selectedCycle]);

  const activePlan = ALL_DISPLAY_PLANS.find((p) => p.id === selectedCycle) || TRIAL_PLAN;
  const isTrial = selectedCycle === 'trial';

  const handleStartPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!await loadRazorpayScript()) {
        throw new Error('Unable to connect to Razorpay. Please check your connection.');
      }

      const idToken = await user.getIdToken();
      const amountPaise = isTrial ? 100 : activePlan.price * 100;

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR', planKey: isTrial ? 'trial' : selectedCycle }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initialize payment order');
      }

      const { order_id, orderId, key_id, keyId, amount: resAmount } = await res.json();
      const effectiveOrderId = order_id || orderId;
      const rzpKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || key_id || keyId;
      if (!rzpKey) throw new Error('Razorpay public key is missing.');

      const options: any = {
        key: rzpKey,
        order_id: effectiveOrderId,
        amount: resAmount || amountPaise,
        currency: 'INR',
        name: 'CrestFlow Pro',
        description: isTrial ? 'CrestFlow Pro 7-Day Trial (₹1)' : `CrestFlow Pro ${activePlan.name} (₹${activePlan.price.toLocaleString('en-IN')})`,
        image: '/app_logo_icon.png',
        prefill: {
          name: profile?.name || user.displayName || '',
          email: user.email || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#282828' },
        handler: async function (response: any) {
          setIsVerifying(true);
          try {
            const resOrder = response.razorpay_order_id || effectiveOrderId;
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({
                paymentId: response.razorpay_payment_id,
                orderId: resOrder,
                signature: response.razorpay_signature,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: resOrder,
                razorpay_signature: response.razorpay_signature,
                planKey: isTrial ? 'trial' : selectedCycle,
              }),
            });

            if (verifyRes.ok) {
              await subscriptionState.refreshSubscription();
            } else {
              const errJson = await verifyRes.json().catch(() => ({}));
              setError(errJson.error || 'Payment verification failed');
              setIsVerifying(false);
              setLoading(false);
            }
          } catch (e: any) {
            setError(e.message || 'Payment verification failed');
            setIsVerifying(false);
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed. Please try again.');
      setLoading(false);
    }
  };

  const disclosureText = isTrial
    ? getTrialDisclosureText(activePlan)
    : `Billed at ₹${activePlan.price.toLocaleString('en-IN')} immediately upon payment. Renews every ${activePlan.interval} until cancelled.`;

  return (
    <div className="min-h-full flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Bar */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <img src="/app_logo_icon.png" alt="CrestFlow" className="w-8 h-8 rounded" />
          <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">CrestFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Signed in as <strong className="text-slate-700 dark:text-slate-200">{user.email}</strong>
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded border-none bg-slate-100 dark:bg-slate-800/80 cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Paywall Content */}
      <div className="w-full max-w-3xl mx-auto py-8 sm:py-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-xs font-medium">
            <ShieldCheck size={14} />
            <span>Membership Required</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Unlock Full Access to CrestFlow
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            To use client portals, generate automated invoices with direct UPI QR codes, and schedule work deliveries, an active subscription is required.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {isVerifying ? (
          <div className="p-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Activating Your Workspace...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Verifying payment authorization and preparing your dashboard.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
            {/* Plan Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/60 select-none">
              {ALL_DISPLAY_PLANS.map((p) => {
                const isSelected = selectedCycle === p.id;
                const isPlanTrial = p.id === 'trial';
                const isPlanDisabled = isPlanTrial && isTrialUsed;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isPlanDisabled}
                    onClick={() => setSelectedCycle(p.id)}
                    className={`px-2 py-2 rounded text-xs transition-colors border-none text-center outline-none ${
                      isPlanDisabled
                        ? 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#282828] text-white font-semibold cursor-pointer shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{p.name.replace('Pro ', '')}</span>
                      {isPlanTrial && isTrialUsed && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 font-normal">Used</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">₹{p.price.toLocaleString('en-IN')}</div>
                  </button>
                );
              })}
            </div>

            {/* Plan Info */}
            <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{activePlan.name}</h3>
                  {activePlan.savingsBadge && (
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {activePlan.savingsBadge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activePlan.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{activePlan.price.toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{activePlan.periodLabel}</span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Included in this plan:</span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                {activePlan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclosure */}
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {disclosureText}
            </div>

            {/* CTA Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleStartPayment}
                disabled={loading || (isTrial && isTrialUsed)}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-none disabled:opacity-50"
              >
                {loading
                  ? 'Connecting to Razorpay...'
                  : isTrial
                  ? (isTrialUsed ? 'Trial Already Claimed' : 'Start 7-Day Trial (₹1)')
                  : `Pay ₹${activePlan.price.toLocaleString('en-IN')} & Unlock Workspace`}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400 pt-4 pb-2 select-none">
        Secure checkout powered by Razorpay. 256-bit SSL encrypted.
      </div>
    </div>
  );
}

