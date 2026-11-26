import React, { useEffect, useRef, useState } from 'react';
import { X, Check, RefreshCw, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAccess } from '../../hooks/useAccess';
import { useToast } from '../../context/ToastContext';
import {
  PRO_PLANS,
  PaidPlanKey,
  TRIAL_PROMISE_COPY,
  getPlanDisclosureText,
} from '../../shared/pricing';
import { launchPlanCheckout } from '../../lib/razorpay';

/**
 * Dismissible slide-over upgrade & trial activation sheet opened only on explicit gated action.
 */
export function UpgradeSheet() {
  const access = useAccess();
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanKey>('yearly');
  const [startingTrial, setStartingTrial] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [activatingTimedOut, setActivatingTimedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const canStartTrial = access.state === 'none' && !access.trialUsed;
  const activePlanObj = PRO_PLANS.find((p) => p.id === selectedPlan) || PRO_PLANS[2];
  const checkoutModePreview = access.recurringPlansConfigured ? 'subscription' : 'order';
  const disclosureCopy = getPlanDisclosureText(activePlanObj, checkoutModePreview);

  useEffect(() => {
    if (!access.upgradeSheetOpen) {
      setErrorMessage(null);
      setActivatingTimedOut(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !access.activatingPlan) {
        access.closeUpgradeSheet();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [access.upgradeSheetOpen, access.activatingPlan, access.closeUpgradeSheet]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!access.upgradeSheetOpen) return null;

  const handleStartTrial = async () => {
    setErrorMessage(null);
    setStartingTrial(true);
    const res = await access.activateTrial();
    setStartingTrial(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Could not start free trial.');
      return;
    }
    showToast('7-day free trial activated. Let us set up your first invoice.', 'success');
  };

  const handleCheckout = async () => {
    if (!access.user) {
      setErrorMessage('Please sign in first.');
      return;
    }
    if (access.state === 'active' || access.state === 'grace') {
      setErrorMessage('Your plan is already active.');
      return;
    }

    setErrorMessage(null);
    setSubmittingPayment(true);
    setActivatingTimedOut(false);

    try {
      await launchPlanCheckout({
        planKey: selectedPlan,
        name: access.user.displayName || 'CrestFlow Creator',
        email: access.user.email || '',
        uid: access.user.uid,
        onActivating: () => {
          access.setActivatingPlan(true);
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(() => {
            setActivatingTimedOut(true);
          }, 10000);
        },
        onDismiss: () => {
          setSubmittingPayment(false);
          access.setActivatingPlan(false);
        },
        onFailure: (msg) => {
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          setSubmittingPayment(false);
          access.setActivatingPlan(false);
          setActivatingTimedOut(false);
          setErrorMessage(msg);
        },
        onSuccess: async () => {
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          await access.refreshAccess();
          setSubmittingPayment(false);
          access.setActivatingPlan(false);
          setActivatingTimedOut(false);
          access.closeUpgradeSheet();
          showToast('CrestFlow Pro activated.', 'success');
        },
      });
    } catch (err) {
      setSubmittingPayment(false);
      access.setActivatingPlan(false);
      setErrorMessage(err instanceof Error ? err.message : 'Unable to start checkout.');
    }
  };

  const handleRefreshStatus = async () => {
    await access.refreshAccess();
    if (access.canWrite) {
      access.setActivatingPlan(false);
      setActivatingTimedOut(false);
      access.closeUpgradeSheet();
      showToast('Plan status refreshed.', 'success');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-sheet-title"
      onClick={() => {
        if (!access.activatingPlan) access.closeUpgradeSheet();
      }}
    >
      <div
        className="w-full max-w-md h-full bg-[#131318] border-l border-[#2A2A33] text-[#F7F7F8] flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#2A2A33]">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#FFC145]">
              CrestFlow Pro
            </span>
            <h2 id="upgrade-sheet-title" className="text-lg font-semibold text-[#F7F7F8]">
              {access.activatingPlan ? 'Activating your plan...' : 'Activate workspace access'}
            </h2>
            {access.upgradeContext?.benefit && !access.activatingPlan && (
              <p className="text-xs text-[#A1A1AA] leading-relaxed">{access.upgradeContext.benefit}</p>
            )}
          </div>
          {!access.activatingPlan && (
            <button type="button" onClick={access.closeUpgradeSheet} aria-label="Close upgrade sheet" className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] bg-transparent border-0 cursor-pointer">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 flex-1">
          {access.activatingPlan ? (
            <div className="rounded-xl bg-[#1B1B22] border border-[#2A2A33] p-5 space-y-4 text-center">
              <Loader2 size={28} className="animate-spin text-[#FFC145] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#F7F7F8]">Activating your plan...</p>
                <p className="text-xs text-[#A1A1AA]">
                  Verifying Razorpay signature and updating your entitlement.
                </p>
              </div>
              {activatingTimedOut && (
                <div className="rounded-lg bg-[#131318] border border-[#2A2A33] p-3 text-left space-y-2">
                  <p className="text-xs text-[#A1A1AA]">
                    Verification is taking slightly longer than usual. Your webhook confirmation will apply automatically, or refresh status now.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshStatus}
                    className="w-full py-2 px-3 rounded-lg bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] text-xs font-semibold text-[#F7F7F8] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh status</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {canStartTrial && (
                <div className="rounded-xl bg-[#1B1B22] border border-[#2A2A33] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#F7F7F8]">Start Free Trial</span>
                    <span className="text-xs font-semibold text-[#2DD4A0] tabular-figures">₹0</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">{TRIAL_PROMISE_COPY}</p>
                  <button
                    type="button"
                    disabled={startingTrial}
                    onClick={handleStartTrial}
                    className="w-full py-2.5 px-4 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {startingTrial ? 'Starting trial...' : 'Start 7-day free trial'}
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  Choose a plan
                </div>
                {PRO_PLANS.map((plan) => {
                  const id = plan.id as PaidPlanKey;
                  const selected = selectedPlan === id;
                  const isBestValue = Boolean(plan.isBestValue);

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(id)}
                      className={`w-full text-left rounded-xl p-3.5 border transition-colors cursor-pointer ${
                        selected
                          ? isBestValue
                            ? 'bg-[#1B1B22] best-value-glow'
                            : 'bg-[#1B1B22] border-[#FF2D4A]'
                          : 'bg-[#131318] border-[#2A2A33] hover:bg-[#1B1B22]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#F7F7F8]">{plan.name}</span>
                          {isBestValue && <span className="px-2 py-0.5 rounded bg-[#2A2A33] text-[10px] font-semibold text-[#FFC145]">Best value</span>}
                          {plan.savingsBadge && <span className="text-[11px] font-semibold text-[#2DD4A0]">{plan.savingsBadge}</span>}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[#F7F7F8] tabular-figures">₹{plan.price}<span className="text-xs font-normal text-[#A1A1AA]">/{plan.interval}</span></div>
                          <div className="text-[11px] text-[#A1A1AA] tabular-figures">~₹{plan.monthlyEquivalent}/mo</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-[#1B1B22] border border-[#2A2A33] p-3.5 space-y-2">
                {activePlanObj.features.slice(0, 4).map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-xs text-[#A1A1AA]">
                    <Check size={13} className="text-[#2DD4A0] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed flex items-start gap-2">
                <ShieldCheck size={14} className="shrink-0 text-[#A1A1AA] mt-0.5" /><span>{disclosureCopy}</span>
              </p>
              {errorMessage && (
                <div className="rounded-lg bg-[#1B1B22] border border-[#F0607A]/50 p-3 flex items-start gap-2 text-xs text-[#F0607A]">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>
        {!access.activatingPlan && (
          <div className="p-5 border-t border-[#2A2A33]">
            <button type="button" disabled={submittingPayment || startingTrial} onClick={handleCheckout} className="w-full py-2.5 px-4 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50">
              {submittingPayment ? 'Opening Razorpay checkout...' : `Pay ₹${activePlanObj.price} for ${activePlanObj.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpgradeSheet;
