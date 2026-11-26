import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, CreditCard } from 'lucide-react';
import {
  usePricingConfig,
  PricingWallConfig,
  DEFAULT_PRICING_CONFIG,
} from '../../lib/pricingConfig';
import { PlanIntervalKey, PlanPricing } from '../../lib/subscriptionPlans';
import AdminPlanEditorCard from './AdminPlanEditorCard';

/**
 * Admin manager for editing all Subscription Wall copy, Pricing Page copy,
 * and every plan's title, pricing, badge, description, features, disclosure, and extra info.
 * Persisted to Firestore (`system_settings/pricing_config`) via Worker API.
 */
export default function AdminPricingManager() {
  const { config, saveConfig, resetConfig, loading } = usePricingConfig();
  const [draft, setDraft] = useState<PricingWallConfig>(config);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanIntervalKey>('trial');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) setDraft(config);
  }, [loading, config]);

  const showStatus = (msg: string) => {
    setErrorMessage(null);
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveConfig(draft);
      setDraft(saved);
      showStatus('Subscription wall & plans published live.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save pricing configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all subscription wall text and plan features back to default?')) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const reset = await resetConfig();
      setDraft(reset || DEFAULT_PRICING_CONFIG);
      showStatus('Subscription plans reset to defaults.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset pricing configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handlePlanChange = (updatedPlan: PlanPricing) => {
    setDraft((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)),
    }));
  };

  const activePlan = draft.plans.find((p) => p.id === selectedPlanId) || draft.plans[0];
  const inputClass =
    'w-full text-xs p-2.5 rounded-lg border border-[#2A2A33] dark:border-[#2A2A33] bg-[#131318] dark:bg-[#0B0B0E] text-[#F7F7F8] dark:text-[#F7F7F8] outline-none focus:border-indigo-600';

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-[#131318] dark:bg-[#131318] rounded-xl p-5 border border-[#2A2A33] dark:border-[#2A2A33] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-[#F7F7F8] dark:text-[#F7F7F8] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#FF2D4A] dark:text-[#FF2D4A]" />
            <span>Subscription Wall &amp; Plans Editor</span>
          </h2>
          <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] mt-1">
            Edit headlines, terms, features, badges, and custom notes for every plan across the Subscription Wall, Pricing Page, and Upgrade Modal.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {statusMessage && (
            <span className="text-xs font-medium text-[#FF2D4A] dark:text-[#FF2D4A] inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-3 py-2 text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] hover:text-[#F7F7F8] dark:hover:text-white bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] dark:hover:bg-[#1B1B22] rounded-lg cursor-pointer border-0 inline-flex items-center gap-1.5 transition-colors duration-120"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg cursor-pointer border-0 inline-flex items-center gap-1.5 transition-colors duration-120"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-[#1B1B22] dark:bg-red-950/40 border border-[#E0002B] dark:border-red-900 text-xs text-[#E0002B] dark:text-[#F0607A]">
          {errorMessage}
        </div>
      )}

      {/* Section 1: Plan Selector & Plan Editor */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#131318] dark:bg-[#131318] rounded-lg border border-[#2A2A33] dark:border-[#2A2A33]">
          {draft.plans.map((p) => {
            const isSelected = p.id === selectedPlanId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                className={`px-3 py-2 rounded-lg text-xs border-0 cursor-pointer transition-colors duration-120 text-center ${
                  isSelected
                    ? 'bg-[#1B1B22] text-white font-semibold'
                    : 'bg-transparent text-[#A1A1AA] dark:text-[#A1A1AA] hover:text-[#F7F7F8] dark:hover:text-white font-medium'
                }`}
              >
                <div className="truncate">{p.tabLabel || p.name.replace('Pro ', '')}</div>
                <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-[#A1A1AA]' : 'text-[#A1A1AA]'}`}>
                  {p.price === 0 ? 'Free' : `₹${p.price.toLocaleString('en-IN')}`}
                </div>
              </button>
            );
          })}
        </div>

        {activePlan && (
          <AdminPlanEditorCard plan={activePlan} onChange={handlePlanChange} />
        )}
      </div>

      {/* Section 2: Global Subscription Wall & Pricing Page Copy */}
      <div className="bg-[#131318] dark:bg-[#131318] rounded-xl p-5 border border-[#2A2A33] dark:border-[#2A2A33] space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
          Subscription Wall &amp; Pricing Page Headings &amp; Terms
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
              Subscription Wall Heading
            </label>
            <input
              type="text"
              value={draft.wallTitle}
              onChange={(e) => setDraft({ ...draft, wallTitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
              Public Pricing Page Heading
            </label>
            <input
              type="text"
              value={draft.pricingTitle}
              onChange={(e) => setDraft({ ...draft, pricingTitle: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
              Subscription Wall Subtitle
            </label>
            <textarea
              rows={2}
              value={draft.wallSubtitle}
              onChange={(e) => setDraft({ ...draft, wallSubtitle: e.target.value })}
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
              Public Pricing Page Subtitle
            </label>
            <textarea
              rows={2}
              value={draft.pricingSubtitle}
              onChange={(e) => setDraft({ ...draft, pricingSubtitle: e.target.value })}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
              Terms Box Title (Pricing Page)
            </label>
            <input
              type="text"
              value={draft.termsTitle}
              onChange={(e) => setDraft({ ...draft, termsTitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
              Checkout Footer Note (Subscription Wall)
            </label>
            <input
              type="text"
              value={draft.footerNote}
              onChange={(e) => setDraft({ ...draft, footerNote: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
            Terms &amp; Policy Body Text
          </label>
          <textarea
            rows={3}
            value={draft.termsBody}
            onChange={(e) => setDraft({ ...draft, termsBody: e.target.value })}
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>
    </div>
  );
}
