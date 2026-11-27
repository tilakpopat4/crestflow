import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeft, Calendar, Edit3, CheckCircle2, Clock, DollarSign, MessageSquare, Users, Archive, ClipboardList, FileText } from 'lucide-react';
import { User } from 'firebase/auth';
import { Client } from '../types';
import { formatCurrencyAmount } from '../lib/currencyUtils';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/StatCard';
import { useAccess } from '../hooks/useAccess';
import { useClientDashboard } from '../hooks/useClientDashboard';
import GoogleDriveUploadModal from './GoogleDriveUploadModal';
import MediaEmbedModal from './MediaEmbedModal';
import ClientRatesModal from './ClientRatesModal';
import ClientRecordPaymentModal from './client-dashboard/ClientRecordPaymentModal';
import SubClientsModal from './client-dashboard/SubClientsModal';
import ClientWorkFormModal from './client-dashboard/ClientWorkFormModal';
import ClientHeaderCard from './client-dashboard/ClientHeaderCard';
import ClientWorkLogsTab from './client-dashboard/ClientWorkLogsTab';
import ClientInvoicesTab from './client-dashboard/ClientInvoicesTab';
import ClientRatesInfoTab from './client-dashboard/ClientRatesInfoTab';

interface ClientDashboardProps {
  client: Client;
  user: User | null;
  onBack: () => void;
  onEditClient: (client: Client) => void;
}

/**
 * Client Dashboard tab view.
 * Detail overview for an individual client with financials, deliverables, invoices, and rates.
 */
export default function ClientDashboard({ client, user, onBack, onEditClient }: ClientDashboardProps) {
  const shouldReduceMotion = useReducedMotion();
  const access = useAccess();
  const {
    invoices,
    clientInvoices,
    clientWorkItems,
    financials,
    statusInfo,
    currencySymbol,
    copiedReviewLink,
    handleCopyReviewLink,
    isDriveModalOpen,
    setIsDriveModalOpen,
    isRatesModalOpen,
    setIsRatesModalOpen,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    isSubClientsModalOpen,
    setIsSubClientsModalOpen,
    isWorkFormOpen,
    setIsWorkFormOpen,
    editingWorkId,
    setEditingWorkId,
    workFormData,
    setWorkFormData,
    embedModalData,
    setEmbedModalData,
    subClientFilter,
    setSubClientFilter,
    activeTab,
    setActiveTab,
    handleSavePaymentDate,
    handleSaveRates,
    handleOpenAddWork,
    handleStartEditWork,
    handleSaveWorkLog,
    handleDeleteWork,
    formattedLastPaymentDate,
    formattedNextDueDate,
    updateInvoice,
    updateClient,
    updateWorkItem,
  } = useClientDashboard(client, user);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-text-primary w-full min-w-0">
      {/* Top Action Bar with Back button and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <Button variant="secondary" size="sm" onClick={onBack} className="gap-1.5 w-fit">
          <ArrowLeft size={14} />
          <span>Back</span>
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={handleCopyReviewLink} className="gap-1.5" title="Copy feedback request link for this client">
            {copiedReviewLink ? <><CheckCircle2 size={13} /> Link Copied!</> : <><MessageSquare size={13} /> Request Review</>}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!access.requireAccess('edit_client', 'Add or manage client sub-brands.')) return;
              setIsSubClientsModalOpen(true);
            }}
            className="gap-1.5"
            title="Add or edit sub-clients for this client"
          >
            <Users size={13} /> Sub-Clients {client.subClients?.length ? `(${client.subClients.length})` : ''}
          </Button>

          <Button variant="secondary" size="sm" onClick={() => onEditClient(client)} className="gap-1.5">
            <Edit3 size={13} /> Edit
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (!access.requireAccess('edit_client', 'Record client payments and update billing cycles.')) return;
              setIsPaymentModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Calendar size={13} /> Record Payment
          </Button>
        </div>
      </div>

      {/* Closed Client Banner */}
      {client.isClosed && (
        <div className="flex items-center gap-3 bg-surface-700 border border-surface-400 rounded-xl px-4 py-3 w-full min-w-0">
          <Archive size={18} className="text-text-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">This client is closed</p>
            <p className="text-xs text-text-muted">
              Work is no longer active. All history, invoices, and data are preserved.
              {client.closedAt && ` Closed on ${new Date(client.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`}
            </p>
          </div>
        </div>
      )}

      {/* Main Client Profile Header Card */}
      <ClientHeaderCard
        client={client}
        currencySymbol={currencySymbol}
        clientWorkItems={clientWorkItems}
        clientInvoices={clientInvoices}
        statusInfo={statusInfo}
        onUpdateClient={updateClient}
      />

      {/* Dashboard Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
        <StatCard
          label="Prev Paid"
          value={formattedLastPaymentDate}
          icon={Calendar}
          subtext={
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="text-xs text-text-secondary hover:text-text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              Change date
            </button>
          }
        />
        <StatCard
          label="Next Due"
          value={formattedNextDueDate}
          icon={Clock}
          subtext={statusInfo.daysRemaining === 0 ? 'Due Today!' : statusInfo.daysRemaining > 0 ? `In ${statusInfo.daysRemaining}d` : `${Math.abs(statusInfo.daysRemaining)}d overdue`}
        />
        <StatCard
          label="Pending Balance"
          value={formatCurrencyAmount(financials.totalPendingAmount, client.currency)}
          icon={DollarSign}
          alert={financials.totalPendingAmount > 0}
          subtext={`${financials.pendingInvoices.length} inv, ${financials.uninvoicedWork.length} un-invoiced`}
        />
        <StatCard
          label="Total Billed"
          value={formatCurrencyAmount(financials.paidTotal, client.currency)}
          icon={CheckCircle2}
          subtext="From paid invoices"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="bg-surface-700 border border-surface-400 rounded-xl overflow-hidden">
        <div className="px-4 md:px-6 pt-3 flex gap-4 md:gap-6 overflow-x-auto scrollbar-none">
          <motion.button
            onClick={() => setActiveTab('work')}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={`relative pb-3 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 outline-none cursor-pointer border-0 bg-transparent ${
              activeTab === 'work' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <ClipboardList size={15} /> Work Logs ({clientWorkItems.length})
            {activeTab === 'work' && (
              <motion.div layoutId="clientDashboardTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary rounded-full" transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }} />
            )}
          </motion.button>

          <motion.button
            onClick={() => setActiveTab('invoices')}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={`relative pb-3 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 outline-none cursor-pointer border-0 bg-transparent ${
              activeTab === 'invoices' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <FileText size={15} /> Invoices ({clientInvoices.length})
            {activeTab === 'invoices' && (
              <motion.div layoutId="clientDashboardTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary rounded-full" transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }} />
            )}
          </motion.button>

          <motion.button
            onClick={() => setActiveTab('settings')}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={`relative pb-3 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 outline-none cursor-pointer border-0 bg-transparent ${
              activeTab === 'settings' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <DollarSign size={15} /> Client Rates &amp; Info
            {activeTab === 'settings' && (
              <motion.div layoutId="clientDashboardTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary rounded-full" transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }} />
            )}
          </motion.button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.15 }}
            className="w-full"
          >
            {activeTab === 'work' && (
              <ClientWorkLogsTab
                client={client}
                clientWorkItems={clientWorkItems}
                subClientFilter={subClientFilter}
                setSubClientFilter={setSubClientFilter}
                onOpenDrive={() => setIsDriveModalOpen(true)}
                onOpenLogWork={handleOpenAddWork}
                onStartEditWork={handleStartEditWork}
                onDeleteWork={handleDeleteWork}
                onWatchPreview={(url, title) => setEmbedModalData({ isOpen: true, url, title, clientName: client.name })}
              />
            )}
            {activeTab === 'invoices' && (
              <ClientInvoicesTab client={client} clientInvoices={clientInvoices} invoices={invoices} onUpdateInvoice={updateInvoice} onUpdateClient={updateClient} />
            )}
            {activeTab === 'settings' && (
              <ClientRatesInfoTab client={client} onOpenRatesModal={() => setIsRatesModalOpen(true)} onEditClient={onEditClient} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ClientRecordPaymentModal
        isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} client={client}
        pendingInvoicesCount={financials.pendingInvoices.length} pendingInvoiceTotal={financials.pendingInvoiceTotal} onSave={handleSavePaymentDate}
      />
      <SubClientsModal
        isOpen={isSubClientsModalOpen} onClose={() => setIsSubClientsModalOpen(false)} client={client}
        clientWorkItems={clientWorkItems} onUpdateClient={updateClient}
      />
      <ClientWorkFormModal
        isOpen={isWorkFormOpen} onClose={() => { setEditingWorkId(null); setIsWorkFormOpen(false); }}
        editingWorkId={editingWorkId} workFormData={workFormData} setWorkFormData={setWorkFormData}
        client={client} currencySymbol={currencySymbol} onSave={handleSaveWorkLog}
        onOpenDrive={() => setIsDriveModalOpen(true)} onOpenSubClients={() => setIsSubClientsModalOpen(true)}
      />
      <GoogleDriveUploadModal
        isOpen={isDriveModalOpen} onClose={() => setIsDriveModalOpen(false)} clients={[client]} defaultClientId={client.id}
        onWorkItemsCreated={async (newWorks) => {
          for (const item of newWorks) {
            await updateWorkItem(item);
          }
        }}
        onWorkItemCreated={async (newWork) => { await updateWorkItem(newWork); setIsDriveModalOpen(false); }}
        onLinkGenerated={(result) => {
          setWorkFormData((prev) => ({ ...prev, videoUrl: result.webViewLink, description: prev.description.trim() ? prev.description : result.name }));
          setIsWorkFormOpen(true);
        }}
      />
      <MediaEmbedModal
        isOpen={!!embedModalData?.isOpen} onClose={() => setEmbedModalData(null)}
        url={embedModalData?.url || ''} title={embedModalData?.title || 'Video Deliverable'} clientName={embedModalData?.clientName}
      />
      <ClientRatesModal isOpen={isRatesModalOpen} onClose={() => setIsRatesModalOpen(false)} client={client} onSaveRates={handleSaveRates} />
    </div>
  );
}
