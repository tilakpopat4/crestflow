import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ExternalLink, RefreshCw, LogOut, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { User } from 'firebase/auth';
import { UserProfile, SubscriptionPlanItem } from '../types';
import {
  SUBSCRIPTION_PLAN,
  createSubscriptionOrder,
  checkPaymentStatus,
  submitUtrForVerification,
  activateSubscription,
  PaymentSessionResult,
  getReceivingUpiId,
  fetchSubscriptionPlans,
  cancelSubscriptionOrder
} from '../lib/youpiService';


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
  const [step, setStep] = useState<'select' | 'pay' | 'pending' | 'success'>('select');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<PaymentSessionResult | null>(null);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showManualUtr, setShowManualUtr] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300);

  // Dynamic Plans
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanItem | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const merchantVpa = getReceivingUpiId();

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSession(null);
      setError(null);
      setShowManualUtr(false);
      setRemainingSeconds(300);
      setUtrNumber('');
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

  // Polling YouPI payment status when session is active or pending
  useEffect(() => {
    if ((step !== 'pay' && step !== 'pending') || !session?.paymentId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!session.paymentId) return;
      const status = await checkPaymentStatus(session.paymentId);
      if (!isMounted) return;

      if (status === 'SUCCESS') {
        clearInterval(interval);
        if (onSubscriptionUpdated) await onSubscriptionUpdated();
        setStep('success');
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step, session, onSubscriptionUpdated]);

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

  if (!isOpen) return null;

  const handleStartPayment = async () => {
    setLoading(true);
    setError(null);
    const planToUse = selectedPlan || plans[0];
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


  const handleSubmitUtr = async () => {
    if (!session || !utrNumber.trim()) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await submitUtrForVerification({
        userId: user.uid,
        orderId: session.orderId,
        utr: utrNumber.trim(),
        userEmail: user.email || '',
        amount: session.amount
      });

      if (res.isInstantVerified) {
        if (onSubscriptionUpdated) await onSubscriptionUpdated();
        setStep('success');
      } else {
        setStep('pending');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not verify payment reference. Please check your UTR.');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyVpa = () => {
    navigator.clipboard.writeText(merchantVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

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
              {step === 'success'
                ? 'Subscription Active'
                : step === 'pending'
                ? 'Payment Under Verification'
                : 'CrestFlow Subscription'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {step === 'select'
                ? 'Active subscription required to use CrestFlow (₹49 / month)'
                : step === 'pay'
                ? 'Scan the UPI QR code to complete your payment'
                : step === 'pending'
                ? 'Reference submitted — awaiting confirmation'
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
            <div className="space-y-4">
              {loadingPlans ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading available plans and offers...
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((p) => {
                    const isSelected = selectedPlan?.id === p.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {p.name}
                                </h3>
                                {p.badge && (
                                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                                    • {p.badge}
                                  </span>
                                )}
                              </div>
                              {p.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {p.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xl font-bold text-slate-900 dark:text-white">
                              ₹{p.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                              {p.periodLabel}
                            </span>
                          </div>
                        </div>

                        {/* Features List (shown for selected or single plan) */}
                        {(isSelected || plans.length === 1) && p.features && p.features.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                              {p.features.map((feat, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="text-slate-400 shrink-0">•</span>
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {isMandatory && onLogout ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={handleStartPayment}
                  disabled={loading || loadingPlans || !selectedPlan}
                  className="px-5 py-2.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? 'Initializing...'
                    : `Pay ₹${(selectedPlan || plans[0] || SUBSCRIPTION_PLAN).price.toFixed(2)} with UPI`}
                </button>
              </div>
            </div>
          )}


          {step === 'pay' && session && (
            <div className="space-y-4">
              {/* Queue Allocation & Countdown Header */}
              <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Queue Slot #1 Allocated</span>
                </div>
                <div className="font-mono text-xs">
                  {remainingSeconds > 0 ? (
                    <span className="text-slate-600 dark:text-slate-400">
                      Slot active for <strong className="font-semibold text-slate-900 dark:text-white">{formatTimer(remainingSeconds)}</strong>
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-semibold">Session Expired</span>
                  )}
                </div>
              </div>

              {/* QR and Payment Details */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shrink-0 shadow-xs">
                  <QRCodeSVG
                    value={session.upiIntentUrl}
                    size={150}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2.5">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Subscription Fee
                    </span>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      ₹{session.amount} <span className="text-xs font-normal text-slate-500">/ month</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Order: {session.orderId}
                    </p>
                  </div>

                  {/* UPI VPA Copy */}
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      {merchantVpa}
                    </span>
                    <button
                      type="button"
                      onClick={copyVpa}
                      className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedVpa ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedVpa ? 'Copied' : 'Copy UPI'}</span>
                    </button>
                  </div>

                  {/* Direct App Link */}
                  <div className="pt-0.5">
                    <a
                      href={session.upiIntentUrl}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      <ExternalLink size={12} />
                      <span>Open in GPay / PhonePe / Paytm / Cred</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Status & Collapsible UTR Verification Accordion */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <RefreshCw size={13} className="animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Awaiting automatic UPI payment confirmation...</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Real-time</span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowManualUtr(!showManualUtr)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>{showManualUtr ? '▾ Hide reference entry' : '▸ Paid already? Enter UPI reference (UTR)'}</span>
                  </button>

                  {showManualUtr && (
                    <div className="mt-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        If your payment was completed but not auto-detected within 30 seconds, enter the 12-digit UTR from your bank app receipt:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 428912345678"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSubmitUtr}
                          disabled={isVerifying || !utrNumber.trim()}
                          className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none"
                        >
                          {isVerifying ? 'Verifying...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions: Back to Plans and Cancel & Release Slot */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  &larr; Back to Plans
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  Cancel & Release Slot
                </button>
              </div>
            </div>
          )}

          {step === 'pending' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Payment Submitted for Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your reference <span className="font-mono text-slate-900 dark:text-white font-medium">{utrNumber}</span> has been logged. Our system and administrator are verifying the payment. Your account will automatically activate as soon as confirmed.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setIsVerifying(true);
                    try {
                      if (session && utrNumber.trim()) {
                        await submitUtrForVerification({
                          userId: user.uid,
                          orderId: session.orderId,
                          utr: utrNumber.trim(),
                          userEmail: user.email || '',
                          amount: session.amount
                        });
                      }
                      if (onSubscriptionUpdated) await onSubscriptionUpdated();
                    } catch (e: any) {
                      console.warn('Status check warning:', e);
                    } finally {
                      setIsVerifying(false);
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
                  <span>Check Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('pay')}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Edit Reference
                </button>
              </div>

            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <Check size={24} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Subscription Activated
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Your ₹49/month CrestFlow Pro plan is now active for the next 30 days. You have full access to all features.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                Start Using CrestFlow
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
