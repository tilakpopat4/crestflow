import React, { useState } from 'react';
import { Copy, Check, QrCode } from 'lucide-react';

interface ProfileInvoicingCardProps {
  upiId: string;
  setUpiId: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  userId: string;
}

export const ProfileInvoicingCard: React.FC<ProfileInvoicingCardProps> = ({
  upiId,
  setUpiId,
  phone,
  setPhone,
  userId
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const onboardingLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/onboarding/${userId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(onboardingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <QrCode size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span>Invoicing &amp; Payout Rails</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configures your direct UPI receiver and client onboarding intake channel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Receiving UPI ID
          </label>
          <input
            type="text"
            placeholder="e.g. yourname@bank"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Used to render high-contrast vector QR codes directly on invoices.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Contact Phone Number
          </label>
          <input
            type="text"
            placeholder="e.g. +91 98749 03810"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Appears on invoice contact headers and client WhatsApp notifications.
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Your Public Client Onboarding URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={onboardingLink}
            className="flex-1 px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 select-all outline-none"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer border-none"
          >
            {copiedLink ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          Share this URL with clients so they can view your services, submit deliverable requests, and review projects.
        </p>
      </div>
    </div>
  );
};
