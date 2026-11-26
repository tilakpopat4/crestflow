import React, { useState, useMemo } from 'react';
import { Invoice, WorkItem, Client, UserProfile } from '../types';
import { IndianRupee, Clock, TrendingUp, DownloadCloud, UploadCloud, AlertCircle, StickyNote as StickyNoteIcon, FileText, Award, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import { useAccess } from '../hooks/useAccess';
import { SAMPLE_CLIENTS, SAMPLE_INVOICES, SAMPLE_WORK_ITEMS } from '../data/sampleWorkspaceData';
import { TrialProgressCard } from './access/TrialProgressCard';
import { trackAccessEvent } from '../lib/analytics';
import {
  buildClientsCsv,
  buildInvoicesCsv,
  buildWorkItemsCsv,
  buildWorkspaceBackupJson,
  downloadExportFile,
} from '../lib/workspaceExport';
import StickyNotesWidget from './StickyNotesWidget';
import PaymentDateModal from './PaymentDateModal';
import AISummarizer from './AISummarizer';
import { calculateWorkJourney } from '../lib/anniversary';
import GettingStartedCard from './GettingStartedCard';
import RevenueComparisonChart from './dashboard/RevenueComparisonChart';
import DashboardRecentInvoices from './dashboard/DashboardRecentInvoices';
import DashboardMilestoneBanner from './dashboard/DashboardMilestoneBanner';
import { formatInvoiceNumber } from '../lib/invoiceUtils';
import { usePaymentDueNotifier } from '../hooks/usePaymentDueNotifier';
import { DashboardSkeleton } from './skeletons';
import { useAiSummarizerConfig } from '../lib/aiConfig';
import { StatCard } from './ui/StatCard';
import { Button } from './ui/button';
import { useDashboardBackup } from '../hooks/useDashboardBackup';

// Theme tokens reference for dashboard charts: backgroundColor: '#1B1B22', stroke="#2A2A33"
interface DashboardTabProps {
  user: User | null;
  profile?: UserProfile | null;
  onNavigateToClients?: () => void;
  onNavigateToWork?: () => void;
  onNavigateToInvoices?: () => void;
  onEditProfile?: () => void;
}

export default function DashboardTab({
  user,
  profile,
  onNavigateToClients,
  onNavigateToWork,
  onNavigateToInvoices,
  onEditProfile,
}: DashboardTabProps) {
  const access = useAccess();
  const isExploring = access.state === 'none';
  const liveUid = !isExploring ? user?.uid : undefined;

  const { data: fsClients, addOrUpdateItem: updateClient } = useFirestore<Client>('clients', liveUid);
  const { data: fsInvoices, loading: fsLoading, addOrUpdateItem, removeItem, batchReplaceAll } = useFirestore<Invoice>('invoices', liveUid);
  const { batchReplaceAll: batchReplaceClients } = useFirestore<any>('clients', liveUid);
  const { data: fsWorkItems, addOrUpdateItem: updateWorkItem } = useFirestore<WorkItem>('workItems', liveUid);

  const clients = isExploring ? SAMPLE_CLIENTS : fsClients;
  const invoices = isExploring ? SAMPLE_INVOICES : fsInvoices;
  const workItems = isExploring ? SAMPLE_WORK_ITEMS : fsWorkItems;
  const loading = isExploring ? false : fsLoading;

  const [activeWorkspaceTool, setActiveWorkspaceTool] = useState<'none' | 'notes' | 'ai' | 'milestones'>('none');
  const { isEnabled: isAiEnabled } = useAiSummarizerConfig();
  const journey = calculateWorkJourney(profile?.freelanceStartDate);
  const [paymentModalState, setPaymentModalState] = useState<{ invoiceId: string | null; isOpen: boolean }>({ invoiceId: null, isOpen: false });

  const { fileInputRef, handleImport, migrateLocalData } = useDashboardBackup({
    invoices,
    batchReplaceClients,
    batchReplaceAllInvoices: batchReplaceAll,
  });

  const handleExportJsonBackup = () => {
    trackAccessEvent('export_clicked', { format: 'json', source: 'dashboard' });
    const stamp = new Date().toISOString().slice(0, 10);
    const json = buildWorkspaceBackupJson({ profile, clients, workItems, invoices });
    downloadExportFile(`crestflow-backup-${stamp}.json`, json, 'application/json;charset=utf-8');
  };

  const handleExportCsvFiles = () => {
    trackAccessEvent('export_clicked', { format: 'csv', source: 'dashboard' });
    const s = new Date().toISOString().slice(0, 10);
    [
      [`crestflow-clients-${s}.csv`, buildClientsCsv(clients)],
      [`crestflow-work-items-${s}.csv`, buildWorkItemsCsv(workItems, clients)],
      [`crestflow-invoices-${s}.csv`, buildInvoicesCsv(invoices, clients)],
    ].forEach(([name, csv]) => downloadExportFile(name, csv, 'text/csv;charset=utf-8'));
  };

  usePaymentDueNotifier(user, clients, invoices, workItems);

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(), currentYear = now.getFullYear();
    let totalEarned = 0, totalInvoicesThisMonth = 0;

    invoices.forEach((inv) => {
      const invDate = new Date(inv.date);
      if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) totalInvoicesThisMonth++;
      if (inv.status === 'Paid') {
        const amount = Number(inv.totalAmount) || 0;
        const paymentDate = inv.lastPaymentDate ? new Date(inv.lastPaymentDate) : invDate;
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
          totalEarned += amount;
        }
      }
    });

    const totalDue = invoices
      .filter((inv) => inv.status === 'Pending' && !clients.find((c) => c.id === inv.clientId || c.name === inv.clientName)?.isClosed)
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    const overdueAmount = invoices
      .filter((inv) => {
        if (inv.status !== 'Pending') return false;
        const clientObj = clients.find((c) => c.id === inv.clientId || c.name === inv.clientName);
        return !clientObj?.isClosed && now.getTime() > new Date(inv.date).getTime() + (Number(clientObj?.paymentCycleDays) || 30) * 86400000;
      })
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    return { totalEarned, totalDue, overdueAmount, totalInvoicesThisMonth };
  }, [invoices, clients]);

  const toggleInvoiceStatus = (id: string) => {
    if (!access.requireAccess('create_invoice', 'Update invoice payment status and record settlements.')) return;
    if (invoices.find((i) => i.id === id)) setPaymentModalState({ invoiceId: id, isOpen: true });
  };

  const handleConfirmPaymentDate = async (invoiceId: string, timestamp: number | null) => {
    if (!access.requireAccess('create_invoice', 'Update invoice payment status and record settlements.')) return;
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      const nextStatus = timestamp ? 'Paid' : 'Pending';
      await addOrUpdateItem({ ...inv, status: nextStatus, lastPaymentDate: timestamp || undefined });
      if (nextStatus === 'Paid') {
        const c = clients.find((item) => item.id === inv.clientId || item.name === inv.clientName);
        if (c) await updateClient({ ...c, lastPaymentDate: timestamp || Date.now() });
      }
    }
    setPaymentModalState({ invoiceId: null, isOpen: false });
  };

  const deleteInvoice = async (id: string) => {
    if (!access.requireAccess('create_invoice', 'Modify or delete existing invoices.')) return;
    if (!confirm('Are you sure you want to delete this invoice record?')) return;
    try {
      const linkedWork = workItems.filter((w) => w.invoiceId === id);
      for (const item of linkedWork) {
        await updateWorkItem({ ...item, invoiceId: undefined, status: 'Uninvoiced' });
      }
      await removeItem(id);
    } catch (err: any) {
      alert('Failed to reset work items: ' + (err?.message || String(err)));
    }
  };

  const recentInvoices = useMemo(() => {
    return invoices
      .filter((inv) => !clients.find((c) => c.id === inv.clientId || c.name === inv.clientName)?.isClosed)
      .sort((a, b) => b.date - a.date);
  }, [invoices, clients]);

  if (loading) return <DashboardSkeleton />;

  const modalInv = invoices.find((i) => i.id === paymentModalState.invoiceId);
  const trialInvoicedTotal = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Dashboard</h2>
            <p className="text-text-secondary mt-1 text-sm">Financial overview.</p>
          </div>
          {isExploring && (
            <span className="text-xs font-medium text-[#FFC145] bg-[#1B1B22] border border-[#2A2A33] px-2.5 py-1 rounded">
              Sample data
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {localStorage.getItem('clients') || localStorage.getItem('monthlyWork') ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!access.requireAccess('manage_onboarding', 'Migrate legacy local backups into your cloud workspace.')) return;
                void migrateLocalData();
              }}
            >
              {!access.canWrite ? <Lock size={12} /> : <UploadCloud size={13} />}
              <span className="hidden min-[380px]:inline">Migrate</span>
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={handleExportJsonBackup}>
            <DownloadCloud size={13} /> Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCsvFiles}>
            <DownloadCloud size={13} /> Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!access.requireAccess('manage_onboarding', 'Import backup JSON into your active workspace.')) return;
              fileInputRef.current?.click();
            }}
          >
            {!access.canWrite ? <Lock size={12} /> : <UploadCloud size={13} />} Import
          </Button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
        </div>
      </div>

      <TrialProgressCard
        invoicedAmount={trialInvoicedTotal}
        deliverablesCount={workItems.length}
      />

      <GettingStartedCard
        userId={user?.uid} profile={profile} clients={clients} invoices={invoices} workItems={workItems}
        onEditProfile={onEditProfile} onNavigateToClients={onNavigateToClients} onNavigateToWork={onNavigateToWork} onNavigateToInvoices={onNavigateToInvoices}
      />

      {/* Metric Cards: Top Financial Pulse Hero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        <StatCard label="Total Earned This Month" value={`₹${metrics.totalEarned.toLocaleString('en-IN')}`} accentColor="gold" useDisplayFont icon={<IndianRupee size={16} />} comparison={`${metrics.totalInvoicesThisMonth} this month`} />
        <StatCard label="Total Due" value={`₹${metrics.totalDue.toLocaleString('en-IN')}`} accentColor={metrics.totalDue > 0 ? 'amber' : 'default'} useDisplayFont icon={<Clock size={16} />} comparison="Active clients" />
        <StatCard label="Overdue Amount" value={`₹${metrics.overdueAmount.toLocaleString('en-IN')}`} accentColor={metrics.overdueAmount > 0 ? 'rose' : 'default'} useDisplayFont icon={<AlertCircle size={16} className={metrics.overdueAmount > 0 ? 'text-[#F0607A]' : 'text-[#A1A1AA]'} />} comparison={metrics.overdueAmount > 0 ? 'Past due date' : 'On time'} />
        <StatCard label="Invoices Issued" value={metrics.totalInvoicesThisMonth} useDisplayFont icon={<TrendingUp size={16} />} comparison="This month" />
      </div>

      <div className="bg-[#131318] border border-[#2A2A33] p-4 sm:p-6 rounded-xl flex flex-col min-w-0">
        <RevenueComparisonChart invoices={invoices} freelanceStartDate={profile?.freelanceStartDate} workItems={workItems} onNavigateToInvoices={onNavigateToInvoices} />
      </div>

      <DashboardRecentInvoices recentInvoices={recentInvoices} toggleInvoiceStatus={toggleInvoiceStatus} deleteInvoice={deleteInvoice} onNavigateToInvoices={onNavigateToInvoices} />

      <div className="bg-[#131318] border border-[#2A2A33] p-4 sm:p-6 rounded-xl">
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${activeWorkspaceTool !== 'none' ? 'mb-4' : ''}`}>
          <h3 className="text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">Workspace Tools</h3>
          <div className="inline-flex p-0.5 bg-[#1B1B22] border border-[#2A2A33] rounded-lg shrink-0 self-start sm:self-auto flex-wrap">
            <button type="button" onClick={() => setActiveWorkspaceTool((p) => (p === 'notes' ? 'none' : 'notes'))} className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-0 ${activeWorkspaceTool === 'notes' ? 'bg-[#2A2A33] text-[#F7F7F8]' : 'text-[#A1A1AA] hover:text-[#F7F7F8]'}`}>
              <StickyNoteIcon size={13} /> Notes
            </button>
            {isAiEnabled && (
              <button type="button" onClick={() => setActiveWorkspaceTool((p) => (p === 'ai' ? 'none' : 'ai'))} className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-0 ${activeWorkspaceTool === 'ai' ? 'bg-[#2A2A33] text-[#F7F7F8]' : 'text-[#A1A1AA] hover:text-[#F7F7F8]'}`}>
                <FileText size={13} /> AI Summarizer
              </button>
            )}
            {journey && (
              <button type="button" onClick={() => setActiveWorkspaceTool((p) => (p === 'milestones' ? 'none' : 'milestones'))} className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-0 ${activeWorkspaceTool === 'milestones' ? 'bg-[#2A2A33] text-[#F7F7F8]' : 'text-[#A1A1AA] hover:text-[#F7F7F8]'}`}>
                <Award size={13} /> Milestones
              </button>
            )}
          </div>
        </div>
        {activeWorkspaceTool === 'notes' && <div className="animate-in fade-in duration-200"><StickyNotesWidget user={user} clients={clients} /></div>}
        {isAiEnabled && activeWorkspaceTool === 'ai' && (
          <div className="animate-in fade-in duration-200">
            <AISummarizer clients={clients} workItems={workItems} profile={profile} />
          </div>
        )}
        {activeWorkspaceTool === 'milestones' && journey && <DashboardMilestoneBanner journey={journey} />}
      </div>

      <PaymentDateModal
        isOpen={paymentModalState.isOpen} onClose={() => setPaymentModalState({ invoiceId: null, isOpen: false })}
        onConfirm={(ts) => handleConfirmPaymentDate(paymentModalState.invoiceId!, ts)}
        onUnmark={() => handleConfirmPaymentDate(paymentModalState.invoiceId!, null)}
        defaultDate={modalInv?.lastPaymentDate} isAlreadyPaid={modalInv?.status === 'Paid'}
        invoiceNumber={formatInvoiceNumber(modalInv || { id: paymentModalState.invoiceId || '' }, invoices)}
      />
    </div>
  );
}
