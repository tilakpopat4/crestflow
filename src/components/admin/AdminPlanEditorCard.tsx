import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { PlanPricing } from '../../lib/subscriptionPlans';

interface AdminPlanEditorCardProps {
  plan: PlanPricing;
  onChange: (updated: PlanPricing) => void;
}

/**
 * Interactive editor for an individual subscription plan (Trial, Monthly, Quarterly, 6-Month, Yearly).
 * Allows editing labels, pricing display, descriptions, disclosure notes, extra info, and features list.
 */
export default function AdminPlanEditorCard({ plan, onChange }: AdminPlanEditorCardProps) {
  const [newFeature, setNewFeature] = useState('');
  const isTrial = plan.id === 'trial';

  const updateField = <K extends keyof PlanPricing>(key: K, value: PlanPricing[K]) => {
    onChange({ ...plan, [key]: value });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const next = [...plan.features];
    next[index] = value;
    updateField('features', next);
  };

  const handleAddFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    updateField('features', [...plan.features, trimmed]);
    setNewFeature('');
  };

  const handleDeleteFeature = (index: number) => {
    if (plan.features.length <= 1) return;
    updateField('features', plan.features.filter((_, i) => i !== index));
  };

  const handleMoveFeature = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= plan.features.length) return;
    const next = [...plan.features];
    [next[index], next[target]] = [next[target], next[index]];
    updateField('features', next);
  };

  const inputClass =
    'w-full text-xs p-2.5 rounded-lg border border-[#2A2A33] dark:border-[#2A2A33] bg-[#131318] dark:bg-[#0B0B0E] text-[#F7F7F8] dark:text-[#F7F7F8] outline-none focus:border-indigo-600';

  return (
    <div className="bg-[#131318] dark:bg-[#131318] rounded-xl p-5 border border-[#2A2A33] dark:border-[#2A2A33] space-y-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2A2A33] dark:border-[#2A2A33]">
        <div>
          <h3 className="text-sm font-bold text-[#F7F7F8] dark:text-[#F7F7F8]">
            Editing: {plan.name}
          </h3>
          <p className="text-[11px] text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5">
            Plan ID: <span className="font-mono">{plan.id}</span> &middot; Code: <span className="font-mono">{plan.planCode}</span>
          </p>
        </div>
        {isTrial && (
          <span className="text-[11px] text-[#A1A1AA] dark:text-[#A1A1AA] inline-flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Trial price is locked at ₹0 per platform policy</span>
          </span>
        )}
      </div>

      {/* Row 1: Identity & Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Plan Title</label>
          <input
            type="text"
            value={plan.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g. Pro Monthly"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Tab Label (Wall)</label>
          <input
            type="text"
            value={plan.tabLabel ?? plan.name.replace('Pro ', '')}
            onChange={(e) => updateField('tabLabel', e.target.value)}
            placeholder="e.g. Monthly"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Badge Label (Optional)</label>
          <input
            type="text"
            value={plan.savingsBadge || ''}
            onChange={(e) => updateField('savingsBadge', e.target.value)}
            placeholder="e.g. Save 16% or 100% Free"
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 2: Pricing & Billing Interval */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Price (₹ INR)</label>
          <input
            type="number"
            min={0}
            disabled={isTrial}
            value={isTrial ? 0 : plan.price}
            onChange={(e) => updateField('price', Math.max(0, Number(e.target.value) || 0))}
            className={`${inputClass} ${isTrial ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Period Suffix</label>
          <input
            type="text"
            value={plan.periodLabel}
            onChange={(e) => updateField('periodLabel', e.target.value)}
            placeholder="/ month"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Monthly Equivalent (₹)</label>
          <input
            type="number"
            min={0}
            disabled={isTrial}
            value={isTrial ? 0 : plan.monthlyEquivalent}
            onChange={(e) => updateField('monthlyEquivalent', Math.max(0, Number(e.target.value) || 0))}
            className={`${inputClass} ${isTrial ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Billing Interval Text</label>
          <input
            type="text"
            value={plan.interval}
            onChange={(e) => updateField('interval', e.target.value)}
            placeholder="month / 3 months / year"
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 3: Description & CTA Button */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Plan Description</label>
          <input
            type="text"
            value={plan.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Short summary shown under plan name"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">Button Label (Optional Override)</label>
          <input
            type="text"
            value={plan.ctaLabel || ''}
            onChange={(e) => updateField('ctaLabel', e.target.value)}
            placeholder={isTrial ? 'Start 7-Day Free Trial' : `Pay ₹${plan.price} & Unlock Workspace`}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 4: Disclosure / Info Box & Additional Extra Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
            Billing / Disclosure Info Box
          </label>
          <textarea
            rows={2}
            value={plan.disclosureText || ''}
            onChange={(e) => updateField('disclosureText', e.target.value)}
            placeholder="Leave blank to use automatic billing disclosure text"
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1">
            Additional Custom Info / Note (Optional)
          </label>
          <textarea
            rows={2}
            value={plan.extraInfo || ''}
            onChange={(e) => updateField('extraInfo', e.target.value)}
            placeholder="Add any extra info, perk, or notice for this plan"
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      {/* Row 5: Features List Editor */}
      <div className="space-y-3 pt-2 border-t border-[#2A2A33] dark:border-[#2A2A33]">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
            Included Features ({plan.features.length})
          </label>
          <span className="text-[11px] text-[#A1A1AA]">Shown on Subscription Wall, Pricing Page &amp; Upgrade Modal</span>
        </div>

        <div className="space-y-2">
          {plan.features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={feat}
                onChange={(e) => handleFeatureChange(idx, e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => handleMoveFeature(idx, -1)}
                disabled={idx === 0}
                title="Move up"
                className="p-2 text-[#A1A1AA] hover:text-[#A1A1AA] dark:hover:text-[#F7F7F8] hover:bg-[#131318] dark:hover:bg-[#1B1B22] rounded-lg border-0 cursor-pointer disabled:opacity-30 transition-colors duration-120"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveFeature(idx, 1)}
                disabled={idx === plan.features.length - 1}
                title="Move down"
                className="p-2 text-[#A1A1AA] hover:text-[#A1A1AA] dark:hover:text-[#F7F7F8] hover:bg-[#131318] dark:hover:bg-[#1B1B22] rounded-lg border-0 cursor-pointer disabled:opacity-30 transition-colors duration-120"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFeature(idx)}
                disabled={plan.features.length <= 1}
                title="Remove feature"
                className="p-2 text-[#A1A1AA] hover:text-[#E0002B] dark:hover:text-[#F0607A] hover:bg-[#131318] dark:hover:bg-[#1B1B22] rounded-lg border-0 cursor-pointer disabled:opacity-30 transition-colors duration-120"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add New Feature Input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddFeature();
              }
            }}
            placeholder="Type a new feature and press Enter or click Add..."
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={handleAddFeature}
            disabled={!newFeature.trim()}
            className="px-3.5 py-2.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg border-0 cursor-pointer inline-flex items-center gap-1.5 transition-colors duration-120 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Feature</span>
          </button>
        </div>
      </div>
    </div>
  );
}
