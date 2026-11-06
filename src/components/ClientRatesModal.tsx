import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Client } from '../types';
import { getCurrencySymbol } from '../lib/currencyUtils';
import { RatesCurrencySelector } from './RatesCurrencySelector';
import { RatesBasisSelector } from './RatesBasisSelector';

interface ClientRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSaveRates: (rates: {
    currency?: string;
    paymentBasis: 'per_reel' | 'monthly_retainer';
    defaultRate: number;
    monthlyRetainerAmount?: number;
    onSiteShootRate?: number;
    websiteMakingRate?: number;
    revisionsIncluded?: number;
  }) => Promise<void>;
}

/**
 * ClientRatesModal allows configuring client currency, payment basis, and default rates.
 * Adheres strictly to GEMINI.md: flat, restrained SaaS aesthetic, no decorative illustrations,
 * light button backgrounds instead of borders, and smooth animated switches via Motion.
 */
export const ClientRatesModal: React.FC<ClientRatesModalProps> = ({
  isOpen,
  onClose,
  client,
  onSaveRates,
}) => {
  const isMonthly =
    client.paymentBasis === 'monthly_retainer' ||
    Boolean(client.monthlyRetainerAmount && client.monthlyRetainerAmount > 0);

  const [currency, setCurrency] = useState<string>(client.currency || 'INR');
  const [paymentBasis, setPaymentBasis] = useState<'per_reel' | 'monthly_retainer'>(
    isMonthly ? 'monthly_retainer' : 'per_reel'
  );
  const [monthlyRetainerAmount, setMonthlyRetainerAmount] = useState<string>(
    client.monthlyRetainerAmount
      ? String(client.monthlyRetainerAmount)
      : isMonthly
      ? String(client.defaultRate)
      : ''
  );
  const [defaultRate, setDefaultRate] = useState<string>(String(client.defaultRate || ''));
  const [onSiteShootRate, setOnSiteShootRate] = useState<string>(
    client.onSiteShootRate ? String(client.onSiteShootRate) : ''
  );
  const [websiteMakingRate, setWebsiteMakingRate] = useState<string>(
    client.websiteMakingRate ? String(client.websiteMakingRate) : ''
  );
  const [revisionsIncluded, setRevisionsIncluded] = useState<string>(
    client.revisionsIncluded !== undefined ? String(client.revisionsIncluded) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      setCurrency(client.currency || 'INR');
      const monthly =
        client.paymentBasis === 'monthly_retainer' ||
        Boolean(client.monthlyRetainerAmount && client.monthlyRetainerAmount > 0);
      setPaymentBasis(monthly ? 'monthly_retainer' : 'per_reel');
      setMonthlyRetainerAmount(
        client.monthlyRetainerAmount
          ? String(client.monthlyRetainerAmount)
          : monthly
          ? String(client.defaultRate)
          : ''
      );
      setDefaultRate(String(client.defaultRate || ''));
      setOnSiteShootRate(client.onSiteShootRate ? String(client.onSiteShootRate) : '');
      setWebsiteMakingRate(client.websiteMakingRate ? String(client.websiteMakingRate) : '');
      setRevisionsIncluded(client.revisionsIncluded !== undefined ? String(client.revisionsIncluded) : '');
      setIsSaving(false);
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const rateVal =
        paymentBasis === 'monthly_retainer' && monthlyRetainerAmount
          ? Number(monthlyRetainerAmount) || 0
          : Number(defaultRate) || 0;

      await onSaveRates({
        currency,
        paymentBasis,
        defaultRate: rateVal,
        monthlyRetainerAmount:
          paymentBasis === 'monthly_retainer' && monthlyRetainerAmount
            ? Number(monthlyRetainerAmount)
            : undefined,
        onSiteShootRate: onSiteShootRate ? Number(onSiteShootRate) : undefined,
        websiteMakingRate: websiteMakingRate ? Number(websiteMakingRate) : undefined,
        revisionsIncluded: revisionsIncluded !== '' ? Math.max(0, parseInt(revisionsIncluded, 10)) : undefined,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Failed to save rates: ' + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-5 cursor-default max-h-[90vh] overflow-y-auto"
      >
        {/* Header - Clean typography without decorative icons */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Edit Rates &amp; Pricing
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update billing rates for <strong className="text-slate-700 dark:text-slate-200">{client.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg border-0 bg-transparent cursor-pointer transition-colors duration-120"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Currency Switcher */}
          <RatesCurrencySelector
            currency={currency}
            onChange={setCurrency}
            shouldReduceMotion={shouldReduceMotion}
          />

          {/* Payment Basis Switcher - Borderless, clean light button backgrounds */}
          <RatesBasisSelector
            paymentBasis={paymentBasis}
            onChange={setPaymentBasis}
            shouldReduceMotion={shouldReduceMotion}
          />

          {/* Rate Input Section with Smooth Transition */}
          <AnimatePresence mode="wait">
            {paymentBasis === 'monthly_retainer' ? (
              <motion.div
                key="retainer-box"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -3 }}
                transition={{ duration: 0.14 }}
                className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl"
              >
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Fixed Monthly Retainer Amount ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {currencySymbol}
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={monthlyRetainerAmount || defaultRate}
                    onChange={(e) => {
                      setMonthlyRetainerAmount(e.target.value);
                      setDefaultRate(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                    placeholder="e.g. 25000"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Invoices for this client will automatically bill this exact fixed amount each month.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="per-reel-box"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -3 }}
                transition={{ duration: 0.14 }}
                className="space-y-1.5"
              >
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Default Rate per Reel / Deliverable ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {currencySymbol}
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                    placeholder="e.g. 1500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* On Site Shoot Rate */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              On Site Shoot Rate ({currencySymbol}) (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={onSiteShootRate}
                onChange={(e) => setOnSiteShootRate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          {/* Website Making Rate */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Website Making Rate ({currencySymbol}) (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={websiteMakingRate}
                onChange={(e) => setWebsiteMakingRate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                placeholder="e.g. 15000"
              />
            </div>
          </div>

          {/* Revisions Included */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Revisions Included per Deliverable (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={revisionsIncluded}
              onChange={(e) => setRevisionsIncluded(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
              placeholder="e.g. 2 (leave blank for unlimited)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3.5 border-t border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-[#242424] hover:bg-[#1f1f1f] rounded-lg cursor-pointer border-0 transition-colors duration-120"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#1f1f1f] hover:bg-[#181818] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors duration-120 border-0 cursor-pointer shadow-xs"
            >
              <span>{isSaving ? 'Saving…' : 'Save Rates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientRatesModal;
