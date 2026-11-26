import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Download, ArrowUpRight, AlertCircle } from 'lucide-react';
import { Client, Invoice, WorkItem } from '../../types';
import { SubscriptionState } from '../../hooks/useSubscription';
import { useAccess } from '../../hooks/useAccess';
import { useFirestore } from '../../hooks/useFirestore';
import { PRO_PLANS, TRIAL_PROMISE_COPY } from '../../shared/pricing';
import {
  buildClientsCsv,
  buildInvoicesCsv,
  buildWorkItemsCsv,
  buildWorkspaceBackupJson,
  downloadExportFile,
} from '../../lib/workspaceExport';
import { trackAccessEvent } from '../../lib/analytics';

interface BillingPageProps {
  user: User;
  subscriptionState?: SubscriptionState;
  onNavigateToPricing: () => void;
  onNavigateToDashboard?: () => void;
}

/**
 * Dedicated Billing & Membership overview matching Section 9 tokens.
 */
export default function BillingPage({
  user,
  onNavigateToPricing,
}: BillingPageProps) {
  const access = useAccess();
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const liveUid = access.state !== 'none' ? user?.uid : undefined;
  const { data: clients } = useFirestore<Client>('clients', liveUid);
  const { data: workItems } = useFirestore<WorkItem>('workItems', liveUid);
  const { data: invoices } = useFirestore<Invoice>('invoices', liveUid);

  const currentPlanObj =
    PRO_PLANS.find((p) => p.id === access.billingCycle || p.id === access.plan) || PRO_PLANS[2];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCancel = async () => {
    if (access.state === 'trialing') {
      setFeedback({
        type: 'success',
        text: `${TRIAL_PROMISE_COPY} Your trial ends automatically unless you choose a plan.`,
      });
      return;
    }

    if (
      !window.confirm(
        'Cancel auto-renewal? You keep full Pro access until the end of your current paid period.',
      )
    ) {
      return;
    }

    setCancelling(true);
    setFeedback(null);
    try {
      await access.cancelSubscription();
      setFeedback({
        type: 'success',
        text: `Auto-renewal cancelled. Pro access remains active until ${formatDate(access.validUntil)}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to cancel subscription.',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleExportJson = () => {
    trackAccessEvent('export_clicked', { format: 'json', source: 'billing' });
    const stamp = new Date().toISOString().slice(0, 10);
    const json = buildWorkspaceBackupJson({ clients, workItems, invoices });
    downloadExportFile(`crestflow-backup-${stamp}.json`, json, 'application/json;charset=utf-8');
  };

  const handleExportCsv = () => {
    trackAccessEvent('export_clicked', { format: 'csv', source: 'billing' });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadExportFile(`crestflow-clients-${stamp}.csv`, buildClientsCsv(clients), 'text/csv;charset=utf-8');
    downloadExportFile(`crestflow-work-items-${stamp}.csv`, buildWorkItemsCsv(workItems, clients), 'text/csv;charset=utf-8');
    downloadExportFile(`crestflow-invoices-${stamp}.csv`, buildInvoicesCsv(invoices, clients), 'text/csv;charset=utf-8');
  };

  const statusTone =
    access.state === 'active'
      ? 'text-[#2DD4A0]'
      : access.state === 'trialing'
      ? 'text-[#FFC145]'
      : access.state === 'grace'
      ? 'text-[#FFB020]'
      : access.state === 'expired' || access.state === 'suspended'
      ? 'text-[#F0607A]'
      : 'text-[#A1A1AA]';

  const statusLabel =
    access.state === 'none'
      ? 'Exploring sample data'
      : access.state === 'trialing'
      ? `Trial (${access.daysLeft} days left)`
      : access.state === 'grace'
      ? `Grace (${access.daysLeft} days left)`
      : access.state === 'active'
      ? access.isLifetime
        ? 'Active · Lifetime'
        : access.cancelAtPeriodEnd
        ? 'Active · Ends Period End'
        : 'Active'
      : access.state === 'suspended'
      ? 'Suspended'
      : 'Expired';

  return (
    <div className="min-h-full bg-[#0B0B0E] text-[#F7F7F8] p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F7F7F8]">Billing &amp; Membership</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Server-verified membership state, valid dates, cancellation, and workspace backups.
          </p>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-[#131318] border-[#2DD4A0]/40 text-[#2DD4A0]'
                : 'bg-[#131318] border-[#F0607A]/40 text-[#F0607A]'
            }`}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="rounded-xl bg-[#131318] border border-[#2A2A33] p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#2A2A33]">
            <div>
              <div className="text-xs uppercase tracking-wider text-[#A1A1AA] font-semibold">
                Current Plan
              </div>
              <div className="text-lg font-bold text-[#F7F7F8] mt-1">
                {access.state === 'trialing'
                  ? 'CrestFlow Pro (7-Day Free Trial)'
                  : access.isLifetime
                  ? 'CrestFlow Pro (Lifetime)'
                  : access.state === 'active' || access.state === 'grace'
                  ? currentPlanObj.name
                  : 'No Active Paid Plan'}
              </div>
            </div>
            <span className={`text-sm font-semibold ${statusTone}`}>{statusLabel}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg bg-[#1B1B22] border border-[#2A2A33] p-3.5">
              <div className="text-[#A1A1AA]">Valid until</div>
              <div className="text-sm font-semibold text-[#F7F7F8] mt-1 tabular-figures">
                {access.isLifetime ? 'Lifetime' : formatDate(access.validUntil)}
              </div>
            </div>
            <div className="rounded-lg bg-[#1B1B22] border border-[#2A2A33] p-3.5">
              <div className="text-[#A1A1AA]">Billing mode</div>
              <div className="text-sm font-semibold text-[#F7F7F8] mt-1">
                {access.state === 'trialing'
                  ? 'Cardless trial (no charge)'
                  : access.checkoutMode === 'order' || access.cancelAtPeriodEnd
                  ? 'One-time / ends automatically'
                  : access.state === 'active'
                  ? 'Auto-renewing Razorpay subscription'
                  : 'Pay when ready'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {!access.canWrite && (
                <button
                  type="button"
                  onClick={() => access.openUpgradeSheet({ action: 'upgrade' })}
                  className="px-4 py-2 rounded-lg cf-btn-primary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{access.state === 'none' ? 'Start 7-day free trial' : 'Reactivate Pro'}</span>
                  <ArrowUpRight size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateToPricing}
                className="px-3.5 py-2 rounded-lg bg-[#1B1B22] hover:bg-[#22222B] border border-[#2A2A33] text-xs font-semibold text-[#F7F7F8] cursor-pointer"
              >
                Compare plans
              </button>
              {access.state === 'active' &&
                !access.isLifetime &&
                !access.cancelAtPeriodEnd &&
                access.checkoutMode !== 'order' && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleCancel}
                    className="px-3.5 py-2 rounded-lg bg-[#1B1B22] border border-[#2A2A33] text-xs font-semibold text-[#F0607A] cursor-pointer disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel auto-renewal'}
                  </button>
                )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-2 rounded-lg bg-[#1B1B22] border border-[#2A2A33] text-xs font-medium text-[#F7F7F8] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={13} /> Export JSON
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-2 rounded-lg bg-[#1B1B22] border border-[#2A2A33] text-xs font-medium text-[#F7F7F8] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          {access.state === 'active' && !access.isLifetime && (
            <p className="text-[11px] text-[#A1A1AA]">
              Mid-period plan switching is disabled in this release. Wait until {formatDate(access.validUntil)} or cancel auto-renewal to pick another billing cycle next period.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
