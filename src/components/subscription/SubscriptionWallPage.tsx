import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogOut, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { SubscriptionState } from '../../hooks/useSubscription';
import { AppRoute } from '../../lib/router';
import { db } from '../../firebase';
import { ALL_DISPLAY_PLANS, PlanIntervalKey, TRIAL_PLAN, getTrialDisclosureText } from '../../lib/subscriptionPlans';
import { loadRazorpayScript } from '../../lib/razorpay';

interface SubscriptionWallPageProps {
  user: User;
  profile?: UserProfile | null;
  subscriptionState: SubscriptionState;
  onLogout: () => void;
  onNavigate?: (route: AppRoute) => void;
}

export default function SubscriptionWallPage({ user, profile, subscriptionState, onLogout }: SubscriptionWallPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [selectedCycle, setSelectedCycle] = useState<PlanIntervalKey>('trial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subData, setSubData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return onSnapshot(doc(db, 'subscriptions', user.uid), (snap) => {
      if (snap.exists()) setSubData(snap.data());
    });
  }, [user?.uid]);

  // Instantly redirect if access is granted or subscription becomes active
  useEffect(() => {
    if (subscriptionState.hasAccess || (subData && (subData.status === 'active' || subData.status === 'trialing'))) {
      window.location.href = '/';
    }
  }, [subscriptionState.hasAccess, subData]);

  // Fast auto-resolution during verification phase so the user never gets stuck
  useEffect(() => {
    if (!isVerifying) return;
    const interval = setInterval(async () => {
      await subscriptionState.refreshSubscription();
      if (subscriptionState.hasAccess) window.location.href = '/';
    }, 1200);
    const timeout = setTimeout(() => { window.location.href = '/'; }, 3500);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isVerifying, subscriptionState]);

  const isTrialUsed = Boolean(
    subData?.hasHadTrial || subData?.hasHadSubscription || subData?.trialEndsAt ||
    subData?.status === 'active' || subData?.status === 'trialing' || subData?.status === 'cancelled' || subData?.status === 'expired'
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
      if (!await loadRazorpayScript()) throw new Error('Unable to connect to Razorpay. Please check your connection.');
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
        prefill: { name: profile?.name || user.displayName || '', email: user.email || '', contact: profile?.phone || '' },
        theme: { color: '#282828' },
        handler: async function (response: any) {
          setIsVerifying(true);
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
              await subscriptionState.refreshSubscription();
              window.location.href = '/';
              return;
            }
            const errJson = await verifyRes.json().catch(() => ({}));
            setError(errJson.error || 'Payment verification failed');
            setIsVerifying(false);
            setLoading(false);
          } catch (e: any) {
            await subscriptionState.refreshSubscription();
            if (subscriptionState.hasAccess) { window.location.href = '/'; return; }
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

  const disclosureText = isTrial ? getTrialDisclosureText(activePlan) : `Billed at ₹${activePlan.price.toLocaleString('en-IN')} immediately upon payment. Renews every ${activePlan.interval} until cancelled.`;

  return (
    <div className="min-h-full flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <img src="/app_logo_icon.png" alt="CrestFlow" className="w-8 h-8 rounded" />
          <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">CrestFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">Signed in as <strong className="text-slate-700 dark:text-slate-200">{user.email}</strong></span>
          <motion.button type="button" onClick={onLogout} whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded border-none bg-slate-100 dark:bg-slate-800/80 cursor-pointer transition-colors">
            <LogOut size={13} /><span>Sign Out</span>
          </motion.button>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto py-8 sm:py-10 space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Unlock Full Access to CrestFlow</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            To use client portals, generate automated invoices with direct UPI QR codes, and schedule work deliveries, an active subscription is required.
          </p>
        </div>

        {error && <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 text-center">{error}</div>}

        {isVerifying ? (
          <div className="p-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Activating Your Workspace...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifying payment authorization and preparing your dashboard.</p>
            </div>
            <div className="pt-1">
              <button type="button" onClick={() => { window.location.href = '/'; }} className="px-5 py-2.5 bg-[#282828] hover:bg-[#383838] text-white text-xs font-semibold rounded-lg border border-[#3a3a3a] cursor-pointer transition-colors">
                Enter Workspace Now
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80 select-none">
              {ALL_DISPLAY_PLANS.map((p) => {
                const isSelected = selectedCycle === p.id;
                const isPlanDisabled = p.id === 'trial' && isTrialUsed;
                return (
                  <motion.button
                    key={p.id} type="button" disabled={isPlanDisabled}
                    whileHover={shouldReduceMotion || isPlanDisabled ? undefined : { scale: 1.02 }}
                    whileTap={shouldReduceMotion || isPlanDisabled ? undefined : { scale: 0.98 }}
                    onClick={() => setSelectedCycle(p.id)}
                    className={`relative z-10 px-2 py-2 rounded text-xs transition-colors border-none text-center outline-none ${
                      isPlanDisabled ? 'text-slate-500 opacity-60 cursor-not-allowed' : isSelected ? 'text-slate-900 dark:text-white font-semibold cursor-pointer' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
                    }`}
                  >
                    {isSelected && (
                      <motion.div layoutId="wallActiveTab" className="absolute inset-0 bg-white dark:bg-slate-700/90 border border-slate-200 dark:border-slate-600/70 rounded shadow-xs -z-10" transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }} />
                    )}
                    <div className="flex items-center justify-center gap-1">
                      <span>{p.name.replace('Pro ', '')}</span>
                      {p.id === 'trial' && isTrialUsed && <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 font-normal">Used</span>}
                    </div>
                    <div className={`text-[11px] font-normal ${isSelected ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>₹{p.price.toLocaleString('en-IN')}</div>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activePlan.id} initial={shouldReduceMotion ? false : { opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={shouldReduceMotion ? undefined : { opacity: 0, y: -3 }} transition={{ duration: 0.12 }} className="space-y-4">
                <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{activePlan.name}</h3>
                      {activePlan.savingsBadge && <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{activePlan.savingsBadge}</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activePlan.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{activePlan.price.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{activePlan.periodLabel}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Included in this plan:</span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    {activePlan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={14} className="text-indigo-400 shrink-0 mt-0.5" /><span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {disclosureText}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="pt-2 flex justify-end">
              <motion.button
                type="button" onClick={handleStartPayment} disabled={loading || (isTrial && isTrialUsed)}
                whileHover={shouldReduceMotion || loading || (isTrial && isTrialUsed) ? undefined : { scale: 1.02 }}
                whileTap={shouldReduceMotion || loading || (isTrial && isTrialUsed) ? undefined : { scale: 0.98 }}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#282828] hover:bg-[#383838] text-white rounded-lg text-xs font-semibold cursor-pointer border border-[#3a3a3a] disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? <><RefreshCw size={13} className="animate-spin" /><span>Connecting to Razorpay...</span></> : isTrial ? (isTrialUsed ? 'Trial Already Claimed' : 'Start 7-Day Trial (₹1)') : `Pay ₹${activePlan.price.toLocaleString('en-IN')} & Unlock Workspace`}
              </motion.button>
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
