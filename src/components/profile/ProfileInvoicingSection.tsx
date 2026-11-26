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
 * Enforces UPI ID as required for invoice QR generation.
 */
export const ProfileInvoicingSection: React.FC<ProfileInvoicingSectionProps> = ({
  upiId,
  setUpiId,
  phone,
  setPhone,
  servicesDescription,
  setServicesDescription,
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
        <h2 className="text-base font-semibold text-[#F7F7F8]">
          Invoicing &amp; payouts
        </h2>
        <p className="mt-1 text-xs text-[#A1A1AA] leading-relaxed">
          UPI destination and default invoice details.
        </p>
      </div>

      <div className="rounded-xl bg-[#131318] border border-[#2A2A33] overflow-hidden">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
          {/* UPI ID / VPA - Required for generating invoices */}
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="invoicing-upi" className="block text-xs font-semibold text-[#F7F7F8]">
                UPI ID / VPA <span className="text-[#F0607A]">*</span>
              </label>
              <span className="text-[11px] font-medium text-[#FFC145]">Required for invoices</span>
            </div>
            <input
              id="invoicing-upi"
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. yourname@okicici"
              className={`block h-10 w-full rounded-lg bg-[#1B1B22] px-3 text-sm text-[#F7F7F8] border ${
                upiError ? 'border-[#F0607A] focus:border-[#F0607A]' : 'border-[#2A2A33] focus:border-[#F7F7F8]'
              } placeholder:text-[#8E8E98] outline-none transition-colors`}
            />
            {upiError ? (
              <p className="mt-1 text-xs text-[#F0607A] font-medium">{upiError}</p>
            ) : (
              <p className="mt-1 text-[11px] text-[#A1A1AA]">
                Printed as a scannable payment QR code on every PDF and shareable client invoice.
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="invoicing-phone" className="block text-xs font-semibold text-[#F7F7F8]">
                Phone number
              </label>
              <span className="text-[11px] text-[#A1A1AA]">Optional</span>
            </div>
            <input
              id="invoicing-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="block h-10 w-full rounded-lg bg-[#1B1B22] px-3 text-sm text-[#F7F7F8] border border-[#2A2A33] placeholder:text-[#8E8E98] focus:border-[#F7F7F8] outline-none transition-colors"
            />
          </div>

          {/* Default Services Description */}
          <div className="sm:col-span-2">
            <label htmlFor="invoicing-services" className="mb-1.5 block text-xs font-semibold text-[#F7F7F8]">
              Default invoice item
            </label>
            <input
              id="invoicing-services"
              type="text"
              value={servicesDescription}
              onChange={(e) => setServicesDescription(e.target.value)}
              placeholder="e.g. Video Editing Services"
              className="block h-10 w-full rounded-lg bg-[#1B1B22] px-3 text-sm text-[#F7F7F8] border border-[#2A2A33] placeholder:text-[#8E8E98] focus:border-[#F7F7F8] outline-none transition-colors"
            />
          </div>
        </div>

        {/* Section Action Bar */}
        <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[#2A2A33] px-5 py-3 sm:px-6">
          <p className="mr-auto flex items-center gap-1.5 text-xs text-[#A1A1AA]">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 text-[#2DD4A0] font-medium">
                <Check size={13} />
                <span>Saved</span>
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-[#F7F7F8] font-medium">
                <span className="size-1.5 rounded-full bg-[#FFB020]" />
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
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] px-3.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F7F7F8] cursor-pointer"
            >
              Discard
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center rounded-lg cf-btn-primary disabled:opacity-50 text-white px-4 text-xs font-semibold cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProfileInvoicingSection;
