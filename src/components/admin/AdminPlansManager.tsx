import React, { useState, useEffect } from 'react';
import { SubscriptionPlanItem } from '../../types';
import {
  fetchSubscriptionPlans,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  toggleSubscriptionPlan
} from '../../lib/youpiService';
import { Plus, Trash2, Power, RefreshCw, X } from 'lucide-react';
import AdminPlanForm from './AdminPlanForm';

/**
 * Plans and promotional deals manager.
 * Allows creating, pausing, and deleting pricing tiers.
 * Adheres strictly to GEMINI.md: 6px solid dot statuses, 120ms transitions, no colored pills.
 */
export default function AdminPlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await fetchSubscriptionPlans(false); // false = load all including paused
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (
    planData: Omit<SubscriptionPlanItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setIsSubmitting(true);
    try {
      await createSubscriptionPlan(planData);
      setShowAddForm(false);
      await loadPlans();
    } catch (err: any) {
      alert(`Error creating plan: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (plan: SubscriptionPlanItem) => {
    setActionLoading(plan.id);
    try {
      await toggleSubscriptionPlan(plan.id, !plan.isActive);
      await loadPlans();
    } catch (err: any) {
      alert(`Error toggling plan: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (plan: SubscriptionPlanItem) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) return;
    setActionLoading(plan.id);
    try {
      await deleteSubscriptionPlan(plan.id);
      await loadPlans();
    } catch (err: any) {
      alert(`Error deleting plan: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden space-y-4">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Plans & Promotional Offers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create custom subscription tiers, festival discounts, or promotional trial offers. Active plans appear in member checkout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors duration-120 inline-flex items-center gap-1.5 cursor-pointer border-0"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddForm ? 'Cancel' : 'New Plan / Offer'}</span>
          </button>

          <button
            onClick={loadPlans}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 border-0 cursor-pointer"
            title="Refresh plans"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Add Plan Form */}
      {showAddForm && (
        <AdminPlanForm
          onSave={handleCreatePlan}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={isSubmitting}
          existingPlansCount={plans.length}
        />
      )}

      {/* Plans Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No subscription plans configured. Add a plan above.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 font-semibold">Plan / Offer</th>
                <th className="p-3 font-semibold">Price</th>
                <th className="p-3 font-semibold">Access Duration</th>
                <th className="p-3 font-semibold">Features / Notes</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {plans.map((p) => {
                const isProcessing = actionLoading === p.id;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-120"
                  >
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.badge && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            • {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Code: {p.planCode}
                      </div>
                      {p.description && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      ₹{p.price.toFixed(2)}
                      <span className="text-[11px] font-normal text-slate-500 ml-1">
                        {p.periodLabel}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {p.durationDays} days
                    </td>
                    <td className="p-3 max-w-xs text-slate-500 dark:text-slate-400 text-[11px]">
                      {p.features && p.features.length > 0 ? (
                        <span>
                          {p.features.slice(0, 2).join(' • ')}
                          {p.features.length > 2 ? ` (+${p.features.length - 2} more)` : ''}
                        </span>
                      ) : (
                        <span className="italic">Standard features</span>
                      )}
                    </td>
                    <td className="p-3">
                      {p.isActive ? (
                        <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-indigo-600 dark:text-indigo-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Paused</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggle(p)}
                          disabled={isProcessing}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1 border-0 cursor-pointer"
                          title={p.isActive ? 'Pause plan from checkout' : 'Activate plan for checkout'}
                        >
                          <Power className="w-3 h-3" />
                          <span>{p.isActive ? 'Pause' : 'Activate'}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(p)}
                          disabled={isProcessing}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 disabled:opacity-50 border-0 cursor-pointer"
                          title="Delete plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
