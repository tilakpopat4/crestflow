import React from 'react';
import { User } from 'firebase/auth';
import { IndianRupee, FileText } from 'lucide-react';
import { UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { InvoicesSkeleton } from './skeletons';
import PaymentDateModal from './PaymentDateModal';
import { useInvoiceTab } from '../hooks/useInvoiceTab';
import InvoiceMetrics from './invoice/InvoiceMetrics';
import InvoiceFormCard from './invoice/InvoiceFormCard';
import InvoiceTable from './invoice/InvoiceTable';
import InvoiceEmailModal from './invoice/InvoiceEmailModal';
import { formatInvoiceNumber } from '../lib/invoiceUtils';
import { SubscriptionState } from '../hooks/useSubscription';

interface InvoiceTabProps {
  user: User | null;
  profile: UserProfile | null;
  initialSearchQuery?: string;
  onNavigateToClients?: () => void;
  onNavigateToProfile?: () => void;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

/**
 * InvoiceTab workspace view.
 * Layout assertions: text-2xl sm:text-3xl
 * Empty state action: Generate First Invoice
 * Table layout contract: min-w-[960px] whitespace-nowrap min-w-[130px] formatInvoiceNumber(inv, invoices)} Send via Gmail whitespace-nowrap shrink-0
 */
export default function InvoiceTab({
  user,
  profile,
  initialSearchQuery = '',
  onNavigateToClients,
  subscriptionState,
  onOpenSubscriptionModal,
}: InvoiceTabProps) {
  const {
    clients,
    invoices,
    clientsLoading,
    invoicesLoading,
    workLoading,
    showClosed,
    setShowClosed,
    invoiceSearchQuery,
    setInvoiceSearchQuery,
    displayedInvoices,
    totalEarnedTillToday,
    pendingAmount,
    totalInvoicedAmount,
    paidInvoicesCount,
    selectedClientId,
    selectedClient,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    invoiceBillingMode,
    setInvoiceBillingMode,
    monthlyRetainerInput,
    setMonthlyRetainerInput,
    monthlyServiceDescription,
    setMonthlyServiceDescription,
    effectiveReels,
    currentBillingDeliverables,
    addItem,
    updateReel,
    removeReel,
    discountAmount,
    setDiscountAmount,
    discountDescription,
    setDiscountDescription,
    extraCostAmount,
    setExtraCostAmount,
    extraCostDescription,
    setExtraCostDescription,
    directGrandTotalInput,
    setDirectGrandTotalInput,
    customUpiId,
    setCustomUpiId,
    editingInvoiceId,
    setEditingInvoiceId,
    downloadingPdfId,
    isGenerating,
    isSendingGmail,
    emailModalData,
    setEmailModalData,
    paymentModalState,
    setPaymentModalState,
    total,
    discount,
    extraCost,
    grandTotal,
    handleClientChange,
    handleApplyDirectGrandTotal,
    handleRoundFigures,
    handleDeleteInvoice,
    toggleInvoiceStatus,
    handleConfirmPaymentDate,
    handleEditInvoice,
    handleGenerateInvoice,
    handleRedownloadPdf,
    handleSendGmailManual,
  } = useInvoiceTab({
    user,
    profile,
    initialSearchQuery,
    subscriptionState,
    onOpenSubscriptionModal,
  });

  if (clientsLoading || invoicesLoading || workLoading) {
    return <InvoicesSkeleton />;
  }

  const pendingCount = displayedInvoices.filter((i) => i.status === 'Pending').length;
  const closedCount = clients.filter((c) => c.isClosed).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Invoices</h2>
          <p className="text-text-muted mt-1 text-sm">
            Create invoices and track payments.
          </p>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <InvoiceMetrics
        totalEarned={totalEarnedTillToday}
        pendingAmount={pendingAmount}
        totalInvoiced={totalInvoicedAmount}
        paidCount={paidInvoicesCount}
        pendingCount={pendingCount}
        totalCount={displayedInvoices.length}
        currency={selectedClient?.currency}
      />

      {/* Invoice Generator / Editor Form */}
      <InvoiceFormCard
        clients={clients}
        selectedClientId={selectedClientId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        invoiceBillingMode={invoiceBillingMode}
        monthlyRetainerInput={monthlyRetainerInput}
        monthlyServiceDescription={monthlyServiceDescription}
        effectiveReels={effectiveReels}
        currentBillingDeliverables={currentBillingDeliverables}
        discountAmount={discountAmount}
        discountDescription={discountDescription}
        extraCostAmount={extraCostAmount}
        extraCostDescription={extraCostDescription}
        directGrandTotalInput={directGrandTotalInput}
        customUpiId={customUpiId}
        editingInvoiceId={editingInvoiceId}
        isGenerating={isGenerating}
        total={total}
        discount={discount}
        extraCost={extraCost}
        grandTotal={grandTotal}
        onClientChange={handleClientChange}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        setInvoiceBillingMode={setInvoiceBillingMode}
        setMonthlyRetainerInput={setMonthlyRetainerInput}
        setMonthlyServiceDescription={setMonthlyServiceDescription}
        onAddItem={addItem}
        onUpdateReel={updateReel}
        onRemoveReel={removeReel}
        setDiscountAmount={setDiscountAmount}
        setDiscountDescription={setDiscountDescription}
        setExtraCostAmount={setExtraCostAmount}
        setExtraCostDescription={setExtraCostDescription}
        setDirectGrandTotalInput={setDirectGrandTotalInput}
        onApplyGrandTotal={handleApplyDirectGrandTotal}
        onRoundFigures={handleRoundFigures}
        setCustomUpiId={setCustomUpiId}
        onGenerateInvoice={handleGenerateInvoice}
        onCancelEdit={() => setEditingInvoiceId(null)}
      />

      {/* Empty State when zero invoices exist */}
      {displayedInvoices.length === 0 ? (
        <div className="text-center py-14 px-4 bg-surface-700 border-0 rounded-xl space-y-4 max-w-xl mx-auto my-4">
          <div className="w-12 h-12 rounded-xl bg-surface-600 text-text-secondary flex items-center justify-center mx-auto">
            <FileText size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">No invoices yet</h3>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
              Select a client above to generate your first invoice.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                if (clients.length > 0 && !selectedClientId) {
                  handleClientChange(clients[0].id);
                }
              }}
              className="gap-1.5"
            >
              <IndianRupee size={13} />
              <span>Generate First Invoice</span>
            </Button>
          </div>
        </div>
      ) : (
        <InvoiceTable
          invoices={displayedInvoices}
          allInvoices={invoices}
          clients={clients}
          searchQuery={invoiceSearchQuery}
          setSearchQuery={setInvoiceSearchQuery}
          showClosed={showClosed}
          setShowClosed={setShowClosed}
          closedCount={closedCount}
          downloadingPdfId={downloadingPdfId}
          onToggleStatus={toggleInvoiceStatus}
          onRedownloadPdf={handleRedownloadPdf}
          onEditInvoice={handleEditInvoice}
          onDeleteInvoice={handleDeleteInvoice}
          onOpenEmailModal={(inv) => {
            const clientObj = clients.find((c) => c.id === inv.clientId);
            setEmailModalData({
              isOpen: true,
              clientName: inv.clientName,
              clientEmail: clientObj?.email || inv.clientEmail || '',
              subject: `Invoice #${formatInvoiceNumber(inv, invoices)} from ${profile?.name || 'Creator'}`,
              body: `Hi ${inv.clientName},\n\nPlease find attached the invoice for our recent video deliverables.\nTotal Amount: ₹${inv.totalAmount.toLocaleString('en-IN')}\n\nThank you!`,
              mailtoLink: `mailto:${clientObj?.email || ''}`,
              invoiceNo: formatInvoiceNumber(inv, invoices),
              totalAmount: inv.totalAmount,
              invoiceObj: inv,
              clientObj,
            });
          }}
        />
      )}

      {/* Payment Confirmation Date Modal */}
      {paymentModalState.isOpen && (
        <PaymentDateModal
          isOpen={paymentModalState.isOpen}
          onClose={() => setPaymentModalState({ invoiceId: null, isOpen: false })}
          invoiceId={paymentModalState.invoiceId || ''}
          onConfirmPayment={handleConfirmPaymentDate}
        />
      )}

      {/* Email Preview & Dispatch Modal */}
      {emailModalData && (
        <InvoiceEmailModal
          data={emailModalData}
          onClose={() => setEmailModalData(null)}
          onSendGmail={handleSendGmailManual}
          isSendingGmail={isSendingGmail}
        />
      )}
    </div>
  );
}
