import React, { useState, useMemo } from 'react';
import { Invoice, WorkItem, Client, UserProfile } from '../types';
import { IndianRupee, Clock, TrendingUp, DownloadCloud, UploadCloud, AlertCircle, StickyNote as StickyNoteIcon, FileText, Award } from 'lucide-react';
import { User } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import StickyNotesWidget from './StickyNotesWidget';
import PaymentDateModal from './PaymentDateModal';
import AISummarizer from './AISummarizer';
import { calculateWorkJourney } from '../lib/anniversary';
import GettingStartedCard from './GettingStartedCard';
import RevenueComparisonChart from './dashboard/RevenueComparisonChart';
import DashboardClientRevenue from './dashboard/DashboardClientRevenue';
import DashboardRecentInvoices from './dashboard/DashboardRecentInvoices';
import DashboardMilestoneBanner from './dashboard/DashboardMilestoneBanner';
import { formatInvoiceNumber } from '../lib/invoiceUtils';
import { usePaymentDueNotifier } from '../hooks/usePaymentDueNotifier';
import { DashboardSkeleton } from './skeletons';
import { useAiSummarizerConfig } from '../lib/aiConfig';
import { StatCard } from './ui/StatCard';
import { Button } from './ui/button';
import { useDashboardBackup } from '../hooks/useDashboardBackup';

// Theme tokens reference for dashboard charts: backgroundColor: '#282828', stroke="#444444"
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
  const { data: clients, addOrUpdateItem: updateClient } = useFirestore<Client>('clients', user?.uid);
  const { data: invoices, loading, addOrUpdateItem, removeItem, batchReplaceAll } = useFirestore<Invoice>('invoices', user?.uid);
  const { batchReplaceAll: batchReplaceClients } = useFirestore<any>('clients', user?.uid);
  const { data: workItems, addOrUpdateItem: updateWorkItem } = useFirestore<WorkItem>('workItems', user?.uid);
  const [activeWorkspaceTool, setActiveWorkspaceTool] = useState<'none' | 'notes' | 'ai' | 'milestones'>('none');
  const { isEnabled: isAiEnabled } = useAiSummarizerConfig();
  const journey = calculateWorkJourney(profile?.freelanceStartDate);
  const [paymentModalState, setPaymentModalState] = useState<{ invoiceId: string | null; isOpen: boolean }>({ invoiceId: null, isOpen: false });
  const [clientRevenueTimeframe, setClientRevenueTimeframe] = useState<'all' | 'month'>('all');

  const { fileInputRef, handleExport, handleImport, migrateLocalData } = useDashboardBackup({
    invoices,
    batchReplaceClients,
    batchReplaceAllInvoices: batchReplaceAll,
  });

  usePaymentDueNotifier(user, clients, invoices, workItems);

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(), currentYear = now.getFullYear();
    let totalEarned = 0, totalInvoicesThisMonth = 0;
    const allTimeClientRevenueMap = new Map<string, number>();
    const monthClientRevenueMap = new Map<string, number>();

    invoices.forEach((inv) => {
      const invDate = new Date(inv.date);
      if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) totalInvoicesThisMonth++;
      if (inv.status === 'Paid') {
        const resolvedName = clients.find((c) => c.id === inv.clientId)?.name || inv.clientName || 'Client';
        const amount = Number(inv.totalAmount) || 0;
        allTimeClientRevenueMap.set(resolvedName, (allTimeClientRevenueMap.get(resolvedName) || 0) + amount);
        const paymentDate = inv.lastPaymentDate ? new Date(inv.lastPaymentDate) : invDate;
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
          totalEarned += amount;
          monthClientRevenueMap.set(resolvedName, (monthClientRevenueMap.get(resolvedName) || 0) + amount);
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

    const allTimeChartData = Array.from(allTimeClientRevenueMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const monthChartData = Array.from(monthClientRevenueMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const chartData = allTimeChartData.length > 0 ? allTimeChartData : monthChartData;
    return { totalEarned, totalDue, overdueAmount, totalInvoicesThisMonth, chartData, allTimeChartData, monthChartData };
  }, [invoices, clients]);

  const activeClientRevenueData = useMemo(() => {
    return clientRevenueTimeframe === 'month' ? metrics.monthChartData : metrics.allTimeChartData;
  }, [clientRevenueTimeframe, metrics]);

  const toggleInvoiceStatus = (id: string) => {
    if (invoices.find((i) => i.id === id)) setPaymentModalState({ invoiceId: id, isOpen: true });
  };

  const handleConfirmPaymentDate = async (invoiceId: string, timestamp: number | null) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      const nextStatus = timestamp ? 'Paid' : 'Pending';
      await addOrUpdateItem({ ...inv, status: nextStatus, lastPaymentDate: timestamp || undefined });
      if (nextStatus === 'Paid') {
        const clientObj = clients.find((c) => c.id === inv.clientId || c.name === inv.clientName);
        if (clientObj) await updateClient({ ...clientObj, lastPaymentDate: timestamp || Date.now() });
      }
    }
    setPaymentModalState({ invoiceId: null, isOpen: false });
  };

  const deleteInvoice = async (id: string) => {
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0">
      <div className="flex flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Dashboard</h2>
          <p className="text-text-secondary mt-1 text-sm">Financial overview & payment cycles.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {localStorage.getItem('clients') || localStorage.getItem('monthlyWork') ? (
            <Button variant="secondary" size="sm" onClick={migrateLocalData}>
              <UploadCloud size={13} /> <span className="hidden min-[380px]:inline">Migrate</span>
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={handleExport}><DownloadCloud size={13} /> Export</Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}><UploadCloud size={13} /> Import</Button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
        </div>
      </div>

      <GettingStartedCard
        userId={user?.uid} profile={profile} clients={clients} invoices={invoices} workItems={workItems}
        onEditProfile={onEditProfile} onNavigateToClients={onNavigateToClients} onNavigateToWork={onNavigateToWork} onNavigateToInvoices={onNavigateToInvoices}
      />

      {/* Metric Cards: Top Financial Pulse Hero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        <StatCard
          label="Total Earned This Month"
          value={`₹${metrics.totalEarned.toLocaleString('en-IN')}`}
          icon={<IndianRupee size={16} />}
          comparison={`${metrics.totalInvoicesThisMonth} invoice${metrics.totalInvoicesThisMonth === 1 ? '' : 's'} this month`}
        />
        <StatCard
          label="Total Due"
          value={`₹${metrics.totalDue.toLocaleString('en-IN')}`}
          icon={<Clock size={16} />}
          comparison="Across active clients"
        />
        <StatCard
          label="Overdue Amount"
          value={<span className={metrics.overdueAmount > 0 ? 'text-accent' : 'text-text-primary'}>₹{metrics.overdueAmount.toLocaleString('en-IN')}</span>}
          icon={<AlertCircle size={16} className={metrics.overdueAmount > 0 ? 'text-accent' : 'text-text-secondary'} />}
          comparison={metrics.overdueAmount > 0 ? 'Past payment cycle due date' : 'All invoices current'}
          className={metrics.overdueAmount > 0 ? 'border-accent/40' : ''}
        />
        <StatCard
          label="Invoices Issued"
          value={metrics.totalInvoicesThisMonth}
          icon={<TrendingUp size={16} />}
          comparison="Issued this month"
        />
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-surface-700 border border-surface-400 p-4 sm:p-6 rounded-xl shadow-2xs flex flex-col min-w-0">
          <RevenueComparisonChart
            invoices={invoices}
            freelanceStartDate={profile?.freelanceStartDate}
            workItems={workItems}
            onNavigateToInvoices={onNavigateToInvoices}
          />
        </div>

        <div className="lg:col-span-1 min-w-0">
          <DashboardClientRevenue
            activeClientRevenueData={activeClientRevenueData}
            clientRevenueTimeframe={clientRevenueTimeframe}
            setClientRevenueTimeframe={setClientRevenueTimeframe}
            allTimeDataCount={metrics.allTimeChartData.length}
            onNavigateToClients={onNavigateToClients}
          />
        </div>
      </div>

      <DashboardRecentInvoices
        recentInvoices={recentInvoices}
        toggleInvoiceStatus={toggleInvoiceStatus}
        deleteInvoice={deleteInvoice}
        onNavigateToInvoices={onNavigateToInvoices}
      />

      {/* Workspace Tools: Progressive Disclosure */}
      <div className="bg-surface-700 border border-surface-400 p-4 sm:p-6 rounded-xl shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-4">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">Workspace Tools</h3>
            <p className="text-[11px] sm:text-xs text-text-secondary mt-0.5">
              {isAiEnabled ? 'Quick access to scratchpad notes and Gemini AI summaries' : 'Quick access to scratchpad notes and client snippets'}
            </p>
          </div>
          <div className="inline-flex p-0.5 bg-surface-800 border border-surface-400 rounded-lg shrink-0 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setActiveWorkspaceTool((prev) => (prev === 'notes' ? 'none' : 'notes'))}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
                activeWorkspaceTool === 'notes' ? 'bg-surface-600 text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <StickyNoteIcon size={13} /> Notes {activeWorkspaceTool === 'notes' ? '(Active)' : ''}
            </button>
            {isAiEnabled && (
              <button
                type="button"
                onClick={() => setActiveWorkspaceTool((prev) => (prev === 'ai' ? 'none' : 'ai'))}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
                  activeWorkspaceTool === 'ai' ? 'bg-surface-600 text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileText size={13} /> AI Summarizer {activeWorkspaceTool === 'ai' ? '(Active)' : ''}
              </button>
            )}
            {journey && (
              <button
                type="button"
                onClick={() => setActiveWorkspaceTool((prev) => (prev === 'milestones' ? 'none' : 'milestones'))}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
                  activeWorkspaceTool === 'milestones' ? 'bg-surface-600 text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Award size={13} /> Milestones {activeWorkspaceTool === 'milestones' ? '(Active)' : ''}
              </button>
            )}
          </div>
        </div>

        {activeWorkspaceTool === 'notes' && (
          <div className="animate-in fade-in duration-200">
            <StickyNotesWidget user={user} clients={clients} />
          </div>
        )}

        {isAiEnabled && activeWorkspaceTool === 'ai' && (
          <div className="animate-in fade-in duration-200">
            <AISummarizer clients={clients} workItems={workItems} profile={profile} />
          </div>
        )}

        {activeWorkspaceTool === 'milestones' && journey && (
          <DashboardMilestoneBanner journey={journey} />
        )}
      </div>

      <PaymentDateModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState({ invoiceId: null, isOpen: false })}
        onConfirm={(ts) => handleConfirmPaymentDate(paymentModalState.invoiceId!, ts)}
        onUnmark={() => handleConfirmPaymentDate(paymentModalState.invoiceId!, null)}
        defaultDate={modalInv?.lastPaymentDate}
        isAlreadyPaid={modalInv?.status === 'Paid'}
        invoiceNumber={formatInvoiceNumber(modalInv || { id: paymentModalState.invoiceId || '' }, invoices)}
      />
    </div>
  );
}
