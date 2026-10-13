import React, { useState } from 'react';
import { Circle, X, UserCheck, Users, Check } from 'lucide-react';
import { Client, Invoice, WorkItem, UserProfile } from '../types';

interface GettingStartedCardProps {
  userId?: string;
  profile?: UserProfile | null;
  clients: Client[];
  invoices: Invoice[];
  workItems: WorkItem[];
  onEditProfile?: () => void;
  onNavigateToClients?: () => void;
  onNavigateToWork?: () => void;
  onNavigateToInvoices?: () => void;
}

/**
 * GettingStartedCard renders a lightweight, professional checklist for first-time onboarding.
 * Helps users configure their profile, add clients, and generate their first invoice without trapping them.
 */
export default function GettingStartedCard({
  userId,
  profile,
  clients,
  invoices,
  workItems,
  onEditProfile,
  onNavigateToClients,
  onNavigateToWork,
  onNavigateToInvoices
}: GettingStartedCardProps) {
  const storageKey = userId ? `crestflow_onboarding_dismissed_${userId}` : 'crestflow_onboarding_dismissed';

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(storageKey));
  });

  const isProfileComplete = Boolean(
    profile?.name &&
    profile?.name.trim() !== '' &&
    profile?.upiId &&
    profile.upiId !== 'Not specified'
  );

  const isClientAdded = clients.length > 0;
  const isWorkOrInvoiceDone = workItems.length > 0 || invoices.length > 0;

  const stepsCompleted = (isProfileComplete ? 1 : 0) + (isClientAdded ? 1 : 0) + (isWorkOrInvoiceDone ? 1 : 0);

  // If user has dismissed the guide or completed all steps and navigated away, do not render
  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Getting Started with CrestFlow
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ({stepsCompleted} of 3 completed)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Follow these 3 steps to set up your workflow, manage client payment cycles, and issue branded invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Dismiss guide"
          aria-label="Dismiss onboarding guide"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        {/* Step 1: Profile & Payment Info */}
        <div className={`p-4 rounded-lg border transition-colors flex flex-col justify-between space-y-3 ${
          isProfileComplete
            ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Step 1
              </span>
              {isProfileComplete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  <Check size={13} /> Completed
                </span>
              ) : (
                <Circle size={14} className="text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4 className="text-sm font-bold">Freelancer Profile</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Set your name, title, and UPI ID for automated invoice branding and scan-to-pay QR codes.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={onEditProfile}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isProfileComplete
                  ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <UserCheck size={13} /> {isProfileComplete ? 'Edit Profile' : 'Set Up Profile'}
            </button>
          </div>
        </div>

        {/* Step 2: Add First Client */}
        <div className={`p-4 rounded-lg border transition-colors flex flex-col justify-between space-y-3 ${
          isClientAdded
            ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Step 2
              </span>
              {isClientAdded ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  <Check size={13} /> Completed
                </span>
              ) : (
                <Circle size={14} className="text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4 className="text-sm font-bold">Add Your First Client</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Save client contact details, agreed rates (per-reel or monthly retainer), and payment cycle due dates.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={onNavigateToClients}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isClientAdded
                  ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Users size={13} /> {isClientAdded ? 'View Clients' : 'Add First Client'}
            </button>
          </div>
        </div>

        {/* Step 3: Log Work & Generate Invoice */}
        <div className={`p-4 rounded-lg border transition-colors flex flex-col justify-between space-y-3 ${
          isWorkOrInvoiceDone
            ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Step 3
              </span>
              {isWorkOrInvoiceDone ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  <Check size={13} /> Completed
                </span>
              ) : (
                <Circle size={14} className="text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4 className="text-sm font-bold">Log Work & Invoicing</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Track deliverables with preview links or generate a PDF invoice statement ready to email to your client.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onNavigateToWork}
              className="py-2 px-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center cursor-pointer"
            >
              Log Work
            </button>
            <button
              type="button"
              onClick={onNavigateToInvoices}
              className="py-2 px-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-center cursor-pointer"
            >
              Create Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
