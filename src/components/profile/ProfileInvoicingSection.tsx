import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { getOnboardingUrl, isValidUsername } from '../../lib/userHandle';

interface ProfileInvoicingSectionProps {
  upiId: string;
  setUpiId: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  servicesDescription: string;
  setServicesDescription: (val: string) => void;
  userId: string;
  handle?: string;
  isSaving: boolean;
  isSaved: boolean;
  isDirty: boolean;
  upiError?: string;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * Invoicing & Payout Rails settings section.
 * Configures UPI receiver, telephone contact, and onboarding link.
 */
export const ProfileInvoicingSection: React.FC<ProfileInvoicingSectionProps> = ({
  upiId,
  setUpiId,
  phone,
  setPhone,
  servicesDescription,
  setServicesDescription,
  userId,
  handle,
  isSaving,
  isSaved,
  isDirty,
  upiError,
  onSave,
  onDiscard,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const isHandleConfigured = Boolean(handle && isValidUsername(handle));
  const onboardingLink = isHandleConfigured ? getOnboardingUrl(handle!) : '';

  const handleCopyLink = () => {
    if (!isHandleConfigured || !onboardingLink) {
      alert('Please set your username in the Public Profile section first.');
      return;
    }
    navigator.clipboard.writeText(onboardingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section id="section-invoicing" className="grid grid-cols-1 gap-x-8 gap-y-4 pt-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Invoicing &amp; payouts
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Your direct UPI payment destination, default invoice line item description, and client intake channels.
        </p>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 shadow-xs ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
          {/* UPI ID / VPA */}
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="invoicing-upi" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Direct UPI ID / VPA
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Optional</span>
            </div>
            <input
              id="invoicing-upi"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. yourname@bank"
              className={`block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border ${
                upiError ? 'border-red-500 focus:border-red-600' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400'
              } placeholder:text-slate-400 outline-none transition-colors`}
            />
            {upiError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{upiError}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Receives direct peer-to-peer invoice settlements with instant QR code generation.
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="invoicing-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contact phone number
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Optional</span>
            </div>
            <input
              id="invoicing-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Printed on invoice headers for direct client communication.
            </p>
          </div>

          {/* Default Services Description */}
          <div className="sm:col-span-2">
            <label htmlFor="invoicing-services" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Default invoice line item
            </label>
            <input
              id="invoicing-services"
              type="text"
              value={servicesDescription}
              onChange={(e) => setServicesDescription(e.target.value)}
              placeholder="e.g. Video Editing Services"
              className="block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Auto-fills invoice line items when generating deliverables bills.
            </p>
          </div>

          {/* Client Intake Channel */}
          <div className="sm:col-span-2 p-3.5 rounded-lg bg-[#181818] border border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-white">
                Direct client onboarding link
              </span>
              <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                {isHandleConfigured ? onboardingLink : 'Set username in Public Profile to activate'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!isHandleConfigured}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold border shrink-0 transition-colors duration-120 ${
                !isHandleConfigured
                  ? 'bg-[#282828] text-slate-500 border-[#333333] cursor-not-allowed opacity-60'
                  : 'bg-[#282828] hover:bg-[#383838] text-slate-300 hover:text-white border-[#3a3a3a] cursor-pointer'
              }`}
            >
              {copiedLink ? <Check size={12} className="text-slate-300" /> : <Copy size={12} className="text-slate-400" />}
              <span>{copiedLink ? 'Link copied' : 'Copy link'}</span>
            </button>
          </div>
        </div>

        {/* Section Action Bar */}
        <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[#333333] px-5 py-3 sm:px-6">
          <p className="mr-auto flex items-center gap-1.5 text-xs text-slate-400">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                <Check size={13} />
                <span>Saved just now</span>
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                <span className="size-1.5 rounded-full bg-slate-400" />
                <span>You have unsaved changes</span>
              </span>
            ) : (
              <span>All changes up to date</span>
            )}
          </p>

          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onDiscard}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#282828] hover:bg-[#383838] border border-[#3a3a3a] px-3.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors duration-120"
            >
              Discard
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 text-xs font-semibold cursor-pointer border-0 transition-colors duration-120"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProfileInvoicingSection;
