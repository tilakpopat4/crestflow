import React, { useState } from 'react';
import { Download, ArrowUpRight, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { Client, Invoice, UserProfile, WorkItem } from '../../types';
import { SubscriptionState } from '../../hooks/useSubscription';
import { useAccess } from '../../hooks/useAccess';
import { useFirestore } from '../../hooks/useFirestore';
import { useToast } from '../../context/ToastContext';
import { formatCurrencyAmount } from '../../lib/currencyUtils';
import { TRIAL_PROMISE_COPY } from '../../shared/pricing';
import { trackAccessEvent } from '../../lib/analytics';
import {
  buildClientsCsv,
  buildInvoicesCsv,
  buildWorkItemsCsv,
  buildWorkspaceBackupJson,
  downloadExportFile,
} from '../../lib/workspaceExport';

interface MembershipBannerProps {
  subscriptionState?: SubscriptionState;
  profile?: UserProfile | null;
  onOpenPricing?: () => void;
  onOpenBilling?: () => void;
}

/**
 * Slim top status & action banner for Explorer Mode, Grace Period,
 * and Expired Read/Export Mode. Never renders during 'loading'.
 */
export const MembershipBanner: React.FC<MembershipBannerProps> = ({
  profile = null,
}) => {
  const access = useAccess();
  const { showToast } = useToast();
  const [startingTrial, setStartingTrial] = useState(false);

  const expiredUid = access.isExpired && access.user?.uid ? access.user.uid : undefined;
  const { data: clients } = useFirestore<Client>('clients', expiredUid);
  const { data: workItems } = useFirestore<WorkItem>('workItems', expiredUid);
  const { data: invoices } = useFirestore<Invoice>('invoices', expiredUid);

  if (access.isLoading) return null;

  const handleStartTrial = async () => {
    setStartingTrial(true);
    const res = await access.activateTrial();
    setStartingTrial(false);
    if (res.success) {
      showToast('7-day free trial started. Create your first invoice to begin.', 'success');
    } else {
      showToast(res.error || 'Could not start free trial.', 'error');
      access.openUpgradeSheet({
        action: 'activate_trial',
        benefit: TRIAL_PROMISE_COPY,
      });
    }
  };

  const handleExportJson = () => {
    trackAccessEvent('export_clicked', { format: 'json', state: access.state });
    const json = buildWorkspaceBackupJson({ profile, clients, workItems, invoices });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadExportFile(`crestflow-backup-${stamp}.json`, json, 'application/json;charset=utf-8');
    showToast('Full workspace JSON backup downloaded.', 'success');
  };

  const handleExportCsvAll = () => {
    trackAccessEvent('export_clicked', { format: 'csv', state: access.state });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadExportFile(`crestflow-clients-${stamp}.csv`, buildClientsCsv(clients), 'text/csv;charset=utf-8');
    downloadExportFile(
      `crestflow-work-items-${stamp}.csv`,
      buildWorkItemsCsv(workItems, clients),
      'text/csv;charset=utf-8',
    );
    downloadExportFile(
      `crestflow-invoices-${stamp}.csv`,
      buildInvoicesCsv(invoices, clients),
      'text/csv;charset=utf-8',
    );
    showToast('Clients, work items, and invoices CSV files downloaded.', 'success');
  };

  // 1. Explorer Mode ('none')
  if (access.state === 'none') {
    return (
      <div
        role="region"
        aria-label="Explorer mode banner"
        className="sticky top-0 z-20 w-full bg-[#131318] border-b border-[#2A2A33] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-2 text-xs text-[#F7F7F8]">
          <Sparkles size={14} className="text-[#FFC145] shrink-0" />
          <span>
            You are exploring with sample data. Start your free 7-day trial.{' '}
            <span className="text-[#A1A1AA] hidden md:inline">{TRIAL_PROMISE_COPY}</span>
          </span>
        </div>

        <button
          type="button"
          disabled={startingTrial}
          onClick={handleStartTrial}
          className="px-3.5 py-1.5 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          {startingTrial ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Starting trial...</span>
            </>
          ) : (
            <span>Start 7-day free trial</span>
          )}
        </button>
      </div>
    );
  }

  // 2. Grace Mode ('grace')
  if (access.state === 'grace') {
    return (
      <div
        role="region"
        aria-label="Payment grace period notice"
        className="w-full bg-[#131318] border-b border-[#FFB020]/50 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 text-xs text-[#F7F7F8]">
          <AlertTriangle size={14} className="text-[#FFB020] shrink-0" />
          <span>
            Renewal payment failed. Grace access active for{' '}
            <strong className="text-[#FFB020]">{access.daysLeft}</strong> more{' '}
            {access.daysLeft === 1 ? 'day' : 'days'} before editing locks.
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            access.openUpgradeSheet({
              action: 'reactivate',
              benefit: 'Update payment now to keep uninterrupted workspace access.',
            })
          }
          className="px-3 py-1.5 rounded-lg bg-[#E0002B] hover:bg-[#FF2D4A] text-white text-xs font-semibold border-0 cursor-pointer shrink-0"
        >
          Update payment
        </button>
      </div>
    );
  }

  // 3. Expired / Suspended Mode ('expired' | 'suspended')
  if (access.state === 'expired' || access.state === 'suspended') {
    const endedOn = access.validUntil
      ? new Date(access.validUntil).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'recently';
    const trackedInr = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    return (
      <div
        role="region"
        aria-label="Plan expired banner"
        className="w-full bg-[#131318] border-b border-[#F0607A]/50 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#F7F7F8]">
            {access.state === 'suspended'
              ? 'This account is suspended. Your existing data remains readable and exportable anytime.'
              : `Your plan ended on ${endedOn}. Your data is safe. Export it any time, or reactivate to keep working.`}
          </p>
          <p className="text-[11px] text-[#A1A1AA] tabular-figures">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}, {invoices.length}{' '}
            {invoices.length === 1 ? 'invoice' : 'invoices'},{' '}
            {formatCurrencyAmount(trackedInr, 'INR')} tracked are here when you come back.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg bg-[#1B1B22] hover:bg-[#22222B] border border-[#2A2A33] text-xs font-medium text-[#F7F7F8] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsvAll}
            className="px-3 py-1.5 rounded-lg bg-[#1B1B22] hover:bg-[#22222B] border border-[#2A2A33] text-xs font-medium text-[#F7F7F8] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          {access.state === 'expired' && (
            <button
              type="button"
              onClick={() =>
                access.openUpgradeSheet({
                  action: 'reactivate',
                  benefit: 'Reactivate CrestFlow Pro to resume adding clients, logging work, and sending invoices.',
                })
              }
              className="px-3.5 py-1.5 rounded-lg cf-btn-primary text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Reactivate</span>
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default MembershipBanner;
