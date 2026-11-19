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
      className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-700 rounded-xl border border-surface-400 text-text-primary shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 cursor-default max-h-[90vh] overflow-y-auto"
      >
        {/* Header - Clean typography without decorative icons */}
        <div className="flex justify-between items-start border-b border-surface-400/80 pb-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              Edit Rates &amp; Pricing
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Update billing rates for <strong className="text-text-primary">{client.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
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
                    className="w-full bg-surface-800 border border-surface-400 rounded-lg pl-8 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-surface-300"
                    placeholder="e.g. 25000"
                  />
                </div>
                <p className="text-[11px] text-text-secondary mt-1">
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
                <label className="block text-xs font-semibold text-text-secondary">
                  Default Rate per Reel / Deliverable ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                    {currencySymbol}
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="w-full bg-surface-800 border border-surface-400 rounded-lg pl-8 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-surface-300"
                    placeholder="e.g. 1500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* On Site Shoot Rate */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              On Site Shoot Rate ({currencySymbol}) (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={onSiteShootRate}
                onChange={(e) => setOnSiteShootRate(e.target.value)}
                className="w-full bg-surface-800 border border-surface-400 rounded-lg pl-8 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-surface-300"
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          {/* Website Making Rate */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Website Making Rate ({currencySymbol}) (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={websiteMakingRate}
                onChange={(e) => setWebsiteMakingRate(e.target.value)}
                className="w-full bg-surface-800 border border-surface-400 rounded-lg pl-8 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-surface-300"
                placeholder="e.g. 15000"
              />
            </div>
          </div>

          {/* Revisions Included */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Revisions Included per Deliverable (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={revisionsIncluded}
              onChange={(e) => setRevisionsIncluded(e.target.value)}
              className="w-full bg-surface-800 border border-surface-400 rounded-lg px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-surface-300"
              placeholder="e.g. 2 (leave blank for unlimited)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3.5 border-t border-surface-400/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-600 rounded-lg cursor-pointer border-0 transition-colors bg-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors border-0 cursor-pointer shadow-xs"
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
