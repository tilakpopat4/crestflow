import React from 'react';
import { Check } from 'lucide-react';

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
  return (
    <section id="section-invoicing" className="grid grid-cols-1 gap-x-8 gap-y-4 pt-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Invoicing &amp; payouts
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          UPI destination and default invoice details.
        </p>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
          {/* UPI ID / VPA */}
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="invoicing-upi" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                UPI ID / VPA
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
                upiError ? 'border-red-500 focus:border-red-600' : 'border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500'
              } placeholder:text-slate-400 outline-none transition-colors`}
            />
            {upiError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{upiError}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="invoicing-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phone number
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Optional</span>
            </div>
            <input
              id="invoicing-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-slate-400 dark:focus:border-slate-500 outline-none transition-colors"
            />
          </div>

          {/* Default Services Description */}
          <div className="sm:col-span-2">
            <label htmlFor="invoicing-services" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Default invoice item
            </label>
            <input
              id="invoicing-services"
              type="text"
              value={servicesDescription}
              onChange={(e) => setServicesDescription(e.target.value)}
              placeholder="e.g. Video Editing Services"
              className="block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-slate-400 dark:focus:border-slate-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Section Action Bar */}
        <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[#333333] px-5 py-3 sm:px-6">
          <p className="mr-auto flex items-center gap-1.5 text-xs text-slate-400">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                <Check size={13} />
                <span>Saved</span>
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                <span className="size-1.5 rounded-full bg-slate-400" />
                <span>Unsaved changes</span>
              </span>
            ) : (
              <span>Up to date</span>
            )}
          </p>

          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onDiscard}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#333333] hover:bg-[#3e3e3e] border-0 px-3.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors duration-120"
            >
              Discard
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 text-xs font-semibold cursor-pointer border-0 transition-colors duration-120"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProfileInvoicingSection;
