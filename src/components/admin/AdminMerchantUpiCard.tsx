import React, { useState } from 'react';
import { getReceivingUpiId, SUBSCRIPTION_PLAN } from '../../lib/youpiService';
import { Copy, Check, CreditCard, ShieldCheck, Power } from 'lucide-react';
import { useSubscriptionConfig } from '../../lib/subscriptionConfig';

/**
 * Merchant UPI Payment Gateway Settings card.
 * Adheres strictly to GEMINI.md: flat, restrained SaaS aesthetic with 120ms transitions.
 */
export default function AdminMerchantUpiCard() {
  const upiId = getReceivingUpiId();
  const [copied, setCopied] = useState(false);
  const { isEnabled: isSubscriptionEnabled, setEnabled: setSubscriptionEnabled } = useSubscriptionConfig();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (val: boolean) => {
    setToggling(true);
    try {
      await setSubscriptionEnabled(val);
    } finally {
      setToggling(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-2xs">
      <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Merchant UPI Payment Gateway Settings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Current receiving UPI VPA address configured for ₹{SUBSCRIPTION_PLAN.price} monthly member subscriptions.
          </p>
        </div>
      </div>

      {/* Master Subscription Control */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Subscription Features Master Switch
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isSubscriptionEnabled
                ? 'Turn OFF to instantly remove all subscription badges, paywalls, and upgrade buttons from the main portal.'
                : 'Turn ON to reactivate subscription membership features on the main portal.'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!isSubscriptionEnabled)}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus:outline-none cursor-pointer border-0 shrink-0 ${
            isSubscriptionEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
              isSubscriptionEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Receiving UPI ID (VPA)
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 select-all">
              {upiId}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors duration-120 border-0 cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configured in <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-xs">.env</code> via <code className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">VITE_SUBSCRIPTION_UPI_ID</code>.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Anti-Fraud & Verification Rules</span>
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Bank UTR numbers are enforced unique across payments.</li>
            <li>New payments hold <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">PENDING_VERIFICATION</span> until approved by Admin.</li>
            <li>Approving instantly credits Pro access to the user profile.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
