import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Film, Calendar, DollarSign } from 'lucide-react';
import { Client } from '../types';

interface ClientRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSaveRates: (rates: {
    paymentBasis: 'per_reel' | 'monthly_retainer';
    defaultRate: number;
    monthlyRetainerAmount?: number;
    onSiteShootRate?: number;
    websiteMakingRate?: number;
  }) => Promise<void>;
}

export const ClientRatesModal: React.FC<ClientRatesModalProps> = ({
  isOpen,
  onClose,
  client,
  onSaveRates,
}) => {
  const isMonthly = client.paymentBasis === 'monthly_retainer' || Boolean(client.monthlyRetainerAmount && client.monthlyRetainerAmount > 0);
  const [paymentBasis, setPaymentBasis] = useState<'per_reel' | 'monthly_retainer'>(isMonthly ? 'monthly_retainer' : 'per_reel');
  const [monthlyRetainerAmount, setMonthlyRetainerAmount] = useState<string>(
    client.monthlyRetainerAmount ? String(client.monthlyRetainerAmount) : isMonthly ? String(client.defaultRate) : ''
  );
  const [defaultRate, setDefaultRate] = useState<string>(String(client.defaultRate || ''));
  const [onSiteShootRate, setOnSiteShootRate] = useState<string>(client.onSiteShootRate ? String(client.onSiteShootRate) : '');
  const [websiteMakingRate, setWebsiteMakingRate] = useState<string>(client.websiteMakingRate ? String(client.websiteMakingRate) : '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const monthly = client.paymentBasis === 'monthly_retainer' || Boolean(client.monthlyRetainerAmount && client.monthlyRetainerAmount > 0);
      setPaymentBasis(monthly ? 'monthly_retainer' : 'per_reel');
      setMonthlyRetainerAmount(
        client.monthlyRetainerAmount ? String(client.monthlyRetainerAmount) : monthly ? String(client.defaultRate) : ''
      );
      setDefaultRate(String(client.defaultRate || ''));
      setOnSiteShootRate(client.onSiteShootRate ? String(client.onSiteShootRate) : '');
      setWebsiteMakingRate(client.websiteMakingRate ? String(client.websiteMakingRate) : '');
      setIsSaving(false);
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const rateVal =
        paymentBasis === 'monthly_retainer' && monthlyRetainerAmount
          ? Number(monthlyRetainerAmount) || 0
          : Number(defaultRate) || 0;

      await onSaveRates({
        paymentBasis,
        defaultRate: rateVal,
        monthlyRetainerAmount:
          paymentBasis === 'monthly_retainer' && monthlyRetainerAmount
            ? Number(monthlyRetainerAmount)
            : undefined,
        onSiteShootRate: onSiteShootRate ? Number(onSiteShootRate) : undefined,
        websiteMakingRate: websiteMakingRate ? Number(websiteMakingRate) : undefined,
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
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 cursor-default max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign size={18} className="text-indigo-600 dark:text-indigo-400" />
              Edit Rates &amp; Pricing
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update billing rates for <strong className="text-slate-700 dark:text-slate-200">{client.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Basis */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payment Basis / Billing Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentBasis('per_reel')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  paymentBasis === 'per_reel'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 text-sm flex items-center justify-center ${
                    paymentBasis === 'per_reel'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Film size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold">Per Reel / Deliverable</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Calculated per video item</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentBasis('monthly_retainer')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  paymentBasis === 'monthly_retainer'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 text-sm flex items-center justify-center ${
                    paymentBasis === 'monthly_retainer'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Calendar size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold">Monthly Retainer</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Fixed monthly fee</div>
                </div>
              </button>
            </div>
          </div>

          {/* Monthly Retainer Input or Default Reel Rate */}
          {paymentBasis === 'monthly_retainer' ? (
            <div className="space-y-1.5 p-3.5 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
              <label className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                Fixed Monthly Retainer Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₹
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
                  className="w-full border border-indigo-200 dark:border-indigo-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                  placeholder="e.g. 25000"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Invoices for this client will automatically bill this exact fixed amount each month.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Default Rate per Reel / Deliverable (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₹
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                  placeholder="e.g. 1500"
                />
              </div>
            </div>
          )}

          {/* On Site Shoot Rate */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              On Site Shoot Rate (₹) (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={onSiteShootRate}
                onChange={(e) => setOnSiteShootRate(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          {/* Website Making Rate */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Website Making Rate (₹) (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={websiteMakingRate}
                onChange={(e) => setWebsiteMakingRate(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600"
                placeholder="e.g. 15000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>{isSaving ? 'Saving…' : 'Save Rates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientRatesModal;
