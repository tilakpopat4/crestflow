import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { SubscriptionPlanItem } from '../../types';

interface AdminPlanFormProps {
  onSave: (planData: Omit<SubscriptionPlanItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  existingPlansCount: number;
}

/**
 * Plan / Promotional Offer creation form.
 * Adheres strictly to GEMINI.md design standards: flat, restrained SaaS aesthetic, 120ms transitions.
 */
export default function AdminPlanForm({
  onSave,
  onCancel,
  isSubmitting,
  existingPlansCount
}: AdminPlanFormProps) {
  const [name, setName] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [price, setPrice] = useState('49');
  const [durationDays, setDurationDays] = useState('30');
  const [periodLabel, setPeriodLabel] = useState('/ month');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState(
    'Unlimited client accounts\nDynamic UPI QR invoices\nClient review portal'
  );

  const handleNameChange = (val: string) => {
    setName(val);
    if (!planCode || planCode === name.toLowerCase().replace(/[^a-z0-9]/g, '_')) {
      setPlanCode(val.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    }
  };

  const handleDurationPreset = (days: number, label: string) => {
    setDurationDays(String(days));
    setPeriodLabel(label);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !planCode.trim() || !price) return;

    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    onSave({
      planCode: planCode.trim(),
      name: name.trim(),
      price: parseFloat(price) || 49,
      currency: 'INR',
      durationDays: parseInt(durationDays, 10) || 30,
      periodLabel: periodLabel.trim() || '/ month',
      badge: badge.trim() || undefined,
      description: description.trim() || undefined,
      features,
      isActive: true,
      sortOrder: existingPlansCount + 1
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-4"
    >
      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
        Create New Subscription Plan / Offer
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Plan Name</label>
          <input
            type="text"
            placeholder="e.g. Quarterly Saver"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Plan Code (Unique)</label>
          <input
            type="text"
            placeholder="e.g. quarterly_saver"
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value)}
            required
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Price (INR ₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="49.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-semibold outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Billing Period Label</label>
          <input
            type="text"
            placeholder="e.g. / 3 months or / year"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            required
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-600 dark:text-slate-400 font-medium">Duration (Days Access)</label>
            <div className="flex gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleDurationPreset(30, '/ month')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline border-0 bg-transparent p-0 cursor-pointer"
              >
                30d
              </button>
              <span className="text-slate-400">•</span>
              <button
                type="button"
                onClick={() => handleDurationPreset(90, '/ 3 months')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline border-0 bg-transparent p-0 cursor-pointer"
              >
                90d
              </button>
              <span className="text-slate-400">•</span>
              <button
                type="button"
                onClick={() => handleDurationPreset(180, '/ 6 months')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline border-0 bg-transparent p-0 cursor-pointer"
              >
                180d
              </button>
              <span className="text-slate-400">•</span>
              <button
                type="button"
                onClick={() => handleDurationPreset(365, '/ year')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline border-0 bg-transparent p-0 cursor-pointer"
              >
                365d
              </button>
            </div>
          </div>
          <input
            type="number"
            min="1"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            required
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
            Offer Tag / Badge (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 25% OFF, Best Value, Launch Special"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Description</label>
          <input
            type="text"
            placeholder="Short summary of this offer"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
            Features (one per line)
          </label>
          <textarea
            rows={2}
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-120 border-0 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1 border-0 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Saving...' : 'Save Plan'}</span>
        </button>
      </div>
    </form>
  );
}
