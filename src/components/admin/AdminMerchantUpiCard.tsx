import React, { useState } from 'react';
import { getReceivingUpiId, SUBSCRIPTION_PLAN } from '../../lib/youpiService';
import { Copy, Check, CreditCard, ShieldCheck } from 'lucide-react';

/**
 * Merchant UPI Payment Gateway Settings card.
 * Adheres strictly to GEMINI.md: flat, restrained SaaS aesthetic with 120ms transitions.
 */
export default function AdminMerchantUpiCard() {
  const upiId = getReceivingUpiId();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg flex items-center justify-center">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Merchant UPI Payment Gateway Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current receiving UPI VPA address configured for ₹{SUBSCRIPTION_PLAN.price} monthly member subscriptions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Active Receiving UPI ID (VPA)
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 select-all">
              {upiId}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors duration-120 border-0 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Configured in <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.env</code> via <code className="text-indigo-600 dark:text-indigo-400 font-mono">VITE_SUBSCRIPTION_UPI_ID</code>.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Anti-Fraud & Verification Rules</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
            <li>Bank UTR numbers are enforced unique across payments.</li>
            <li>New payments hold <span className="font-mono text-slate-700 dark:text-slate-300">PENDING_VERIFICATION</span> until approved by Admin.</li>
            <li>Approving instantly credits Pro access to the user profile.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
