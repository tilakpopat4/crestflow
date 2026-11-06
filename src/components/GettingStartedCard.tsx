import React, { useState, useEffect } from 'react';
import { Circle, X, Check, Users, Clock, FileText, QrCode, Send } from 'lucide-react';
import { Client, Invoice, WorkItem, UserProfile } from '../types';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

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
  const reminderKey = userId ? `crestflow_reminder_sent_${userId}` : 'crestflow_reminder_sent_guest';

  const checkIsDismissed = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (profile?.gettingStartedDismissed === true) return true;
    if (localStorage.getItem('crestflow_onboarding_dismissed_global') === 'true') return true;
    if (localStorage.getItem('crestflow_onboarding_dismissed') === 'true') return true;
    if (storageKey && localStorage.getItem(storageKey) === 'true') return true;
    return false;
  };

  const [isDismissed, setIsDismissed] = useState<boolean>(checkIsDismissed);
  const [hasSentReminder, setHasSentReminder] = useState<boolean>(() => {
    try {
      return localStorage.getItem(reminderKey) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (profile?.gettingStartedDismissed === true) {
      setIsDismissed(true);
    }
  }, [profile?.gettingStartedDismissed]);

  // Step completions
  const isClientAdded = clients.length > 0;
  const isWorkLogged = workItems.length > 0;
  const isInvoiceGenerated = invoices.length > 0;
  const isUpiAdded = Boolean(profile?.upiId && profile.upiId.trim() !== '' && profile.upiId !== 'Not specified');
  const isReminderSent = hasSentReminder;

  const stepsCompleted = (isClientAdded ? 1 : 0) +
    (isWorkLogged ? 1 : 0) +
    (isInvoiceGenerated ? 1 : 0) +
    (isUpiAdded ? 1 : 0) +
    (isReminderSent ? 1 : 0);

  // Hide automatically if all 5 steps are complete or guide dismissed
  if (isDismissed || stepsCompleted === 5) {
    return null;
  }

  const handleDismiss = async () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crestflow_onboarding_dismissed_global', 'true');
      localStorage.setItem('crestflow_onboarding_dismissed', 'true');
      if (storageKey) localStorage.setItem(storageKey, 'true');
    }
    if (userId) {
      try {
        await setDoc(doc(db, 'profiles', userId), { gettingStartedDismissed: true }, { merge: true });
      } catch (err) {
        console.warn('Failed to persist gettingStartedDismissed:', err);
      }
    }
  };

  const handleTriggerReminderStep = () => {
    setHasSentReminder(true);
    try {
      localStorage.setItem(reminderKey, 'true');
    } catch { /* ignore */ }
    if (onNavigateToClients) {
      onNavigateToClients();
    }
  };

  const steps = [
    {
      number: 1,
      title: 'Add first client',
      description: 'Set payment cycle days, currency, and agreed deliverable rates.',
      isDone: isClientAdded,
      actionLabel: isClientAdded ? 'Completed' : 'Add Client',
      icon: Users,
      onClick: onNavigateToClients
    },
    {
      number: 2,
      title: 'Log first work item',
      description: 'Record editing tasks, deliverables, and preview links.',
      isDone: isWorkLogged,
      actionLabel: isWorkLogged ? 'Completed' : 'Log Work',
      icon: Clock,
      onClick: onNavigateToWork
    },
    {
      number: 3,
      title: 'Generate first invoice',
      description: 'Create a branded PDF invoice with embedded UPI QR payment.',
      isDone: isInvoiceGenerated,
      actionLabel: isInvoiceGenerated ? 'Completed' : 'Create Invoice',
      icon: FileText,
      onClick: onNavigateToInvoices
    },
    {
      number: 4,
      title: 'Add UPI ID',
      description: 'Set your UPI VPA to receive direct payments without chasing.',
      isDone: isUpiAdded,
      actionLabel: isUpiAdded ? 'Completed' : 'Set UPI ID',
      icon: QrCode,
      onClick: onEditProfile
    },
    {
      number: 5,
      title: 'Send reminder',
      description: 'Send a 1-click WhatsApp or email reminder on payment due day.',
      isDone: isReminderSent,
      actionLabel: isReminderSent ? 'Completed' : 'Send Reminder',
      icon: Send,
      onClick: handleTriggerReminderStep
    }
  ];

  const progressPercent = Math.round((stepsCompleted / 5) * 100);

  return (
    <div className="bg-[#282828] rounded-xl p-4 sm:p-5 shadow-xs space-y-4 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              Getting Started
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              ({stepsCompleted} of 5 completed)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Log work, get paid by UPI without chasing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
          title="Dismiss onboarding guide"
          aria-label="Dismiss onboarding guide"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#212121] h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 5-Step Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.number}
              className={`p-3.5 rounded-xl flex flex-col justify-between space-y-2.5 transition-colors ${
                step.isDone
                  ? 'bg-[#212121] text-slate-300 opacity-90'
                  : 'bg-[#212121] text-white'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Step {step.number}
                  </span>
                  {step.isDone ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200">
                      <Check size={12} strokeWidth={2.5} /> Done
                    </span>
                  ) : (
                    <Circle size={13} className="text-slate-500" />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <StepIcon size={14} className={step.isDone ? 'text-slate-400' : 'text-white'} />
                  <h4 className="text-xs font-bold truncate">{step.title}</h4>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                  {step.description}
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={step.onClick}
                  disabled={step.isDone}
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    step.isDone
                      ? 'bg-[#282828] text-slate-500 cursor-default'
                      : 'bg-[#333333] hover:bg-[#3d3d3d] text-white cursor-pointer'
                  }`}
                >
                  {step.isDone ? 'Completed' : step.actionLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
