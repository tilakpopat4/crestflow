import { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Invoice, Client, WorkItem, UserProfile } from '../types';
import { useFirestore } from './useFirestore';
import { generateUUID } from '../lib/utils';
import { isValidUpiId, buildUpiPaymentUri } from '../lib/upiQr';
import { formatInvoiceNumber, getNextInvoiceNumber } from '../lib/invoiceUtils';
import { generateInvoiceEmailDetails } from '../lib/paymentUtils';
import { generateOffscreenPdfBlob } from '../lib/invoiceRenderer';
import { SubscriptionState } from './useSubscription';
import { useInvoicePdfOperations } from './useInvoicePdfOperations';
import { useInvoiceFormState } from './useInvoiceFormState';

interface UseInvoiceTabOptions {
  user: User | null;
  profile: UserProfile | null;
  initialSearchQuery?: string;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

/**
 * Encapsulates state, calculations, and mutations for the Invoices tab.
 */
export function useInvoiceTab({
  user,
  profile,
  initialSearchQuery = '',
  subscriptionState,
  onOpenSubscriptionModal,
}: UseInvoiceTabOptions) {
  const { data: clients, loading: clientsLoading, addOrUpdateItem: updateClient } = useFirestore<Client>('clients', user?.uid);
  const { data: invoices, loading: invoicesLoading, addOrUpdateItem: addInvoice, removeItem: deleteInvoice } = useFirestore<Invoice>('invoices', user?.uid);
  const { data: workItems, loading: workLoading, addOrUpdateItem: updateWorkItem } = useFirestore<WorkItem>('workItems', user?.uid);

  const [showClosed, setShowClosed] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState(initialSearchQuery);
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailModalData, setEmailModalData] = useState<any>(null);
  const [paymentModalState, setPaymentModalState] = useState<{ invoiceId: string | null; isOpen: boolean }>({ invoiceId: null, isOpen: false });

  const closedClientIds = useMemo(() => new Set(clients.filter((c) => c.isClosed).map((c) => c.id)), [clients]);
  const closedClientNames = useMemo(() => new Set(clients.filter((c) => c.isClosed).map((c) => c.name.toLowerCase())), [clients]);

  const activeInvoices = useMemo(() => invoices.filter((inv) => !closedClientIds.has(inv.clientId) && !closedClientNames.has(inv.clientName.toLowerCase())), [invoices, closedClientIds, closedClientNames]);
  const displayedInvoices = useMemo(() => invoices.filter((inv) => {
    const isClosed = closedClientIds.has(inv.clientId) || closedClientNames.has(inv.clientName.toLowerCase());
    return !showClosed && isClosed ? false : true;
  }), [invoices, closedClientIds, closedClientNames, showClosed]);

  const totalEarnedTillToday = activeInvoices.filter((inv) => inv.status === 'Paid').reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const pendingAmount = activeInvoices.filter((inv) => inv.status === 'Pending').reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalInvoicedAmount = activeInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const paidInvoicesCount = activeInvoices.filter((inv) => inv.status === 'Paid').length;

  const currentMonthInvoicesCount = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => inv.date && new Date(inv.date).getFullYear() === now.getFullYear() && new Date(inv.date).getMonth() === now.getMonth()).length;
  }, [invoices]);

  const formState = useInvoiceFormState({ clients, workItems });

  const hasSavedUpi = Boolean(profile?.upiId && profile.upiId !== 'Not specified' && isValidUpiId(profile.upiId));
  const payeeName = profile?.name || user?.displayName || 'Creator';
  const activeUpi = formState.customUpiId.trim() && isValidUpiId(formState.customUpiId.trim()) ? formState.customUpiId.trim() : hasSavedUpi ? profile!.upiId!.trim() : '';

  const { downloadingPdfId, isSendingGmail, handleRedownloadPdf, handleSendGmailManual } = useInvoicePdfOperations({
    profile,
    customUpiId: formState.customUpiId,
    invoices,
    clients,
    emailModalData,
    setEmailModalData,
  });

  const handleDeleteInvoice = async (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv || !window.confirm(`Delete Invoice ${formatInvoiceNumber(inv, invoices)} for ${inv.clientName}?`)) return;
    try {
      await deleteInvoice(invoiceId);
      if (inv.linkedWorkItemIds?.length) {
        for (const wId of inv.linkedWorkItemIds) {
          const w = workItems.find((item) => item.id === wId);
          if (w && w.invoiceId === invoiceId) await updateWorkItem({ ...w, status: 'Uninvoiced', invoiceId: undefined });
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete invoice.');
    }
  };

  const toggleInvoiceStatus = (id: string) => setPaymentModalState({ invoiceId: id, isOpen: true });

  const handleConfirmPaymentDate = async (invoiceId: string, timestamp: number | null) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      const nextStatus = timestamp ? 'Paid' : 'Pending';
      const pDate = timestamp || undefined;
      await addInvoice({ ...inv, status: nextStatus, lastPaymentDate: pDate });
      if (nextStatus === 'Paid') {
        const clientObj = clients.find((c) => c.id === inv.clientId || c.name === inv.clientName);
        if (clientObj?.id) await updateClient({ ...clientObj, lastPaymentDate: pDate || Date.now() });
      }
    }
    setPaymentModalState({ invoiceId: null, isOpen: false });
  };

  const handleEditInvoice = (inv: Invoice) => {
    formState.setSelectedClientId(inv.clientId);
    formState.setReels(inv.reels.map((r) => ({ ...r, id: generateUUID() })));
    const isRetainer = inv.invoiceType === 'monthly_retainer' || (inv.reels.length === 1 && inv.reels[0].title.toLowerCase().includes('retainer'));
    formState.setInvoiceBillingMode(isRetainer ? 'monthly_retainer' : 'per_reel');
    if (isRetainer) {
      formState.setMonthlyRetainerInput(String(inv.reels[0]?.rate || inv.totalAmount));
      formState.setMonthlyServiceDescription(inv.reels[0]?.title || '');
    }
    formState.setDiscountAmount(inv.discountAmount !== undefined ? String(inv.discountAmount) : '');
    formState.setDiscountDescription(inv.discountDescription || '');
    formState.setExtraCostAmount(inv.extraCostAmount !== undefined ? String(inv.extraCostAmount) : '');
    formState.setExtraCostDescription(inv.extraCostDescription || '');
    formState.setDirectGrandTotalInput(String(inv.totalAmount));
    formState.setEditingInvoiceId(inv.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateInvoice = async () => {
    if (subscriptionState && !subscriptionState.canCreateInvoice(currentMonthInvoicesCount)) {
      if (onOpenSubscriptionModal) onOpenSubscriptionModal();
      else alert(`Free plan limit reached. Upgrade to Pro for unlimited invoices.`);
      return;
    }
    if (!formState.selectedClient) return alert('Please select a client first.');
    const targetReels = formState.invoiceBillingMode === 'monthly_retainer' ? formState.effectiveReels : formState.reels;
    if (targetReels.some((r) => !r.title.trim())) return alert('Please provide a title for invoice items.');
    if (formState.invoiceBillingMode === 'monthly_retainer' && (!formState.monthlyRetainerInput || Number(formState.monthlyRetainerInput) <= 0)) return alert('Please enter a valid monthly retainer amount.');

    setIsGenerating(true);
    try {
      const deliverablesSnapshot = formState.currentBillingDeliverables.map((d) => ({ id: d.id, title: d.title, quantity: d.quantity, videoUrl: d.videoUrl, date: d.date, subClientName: d.subClientName }));
      const resolvedLinkedIds = formState.invoiceBillingMode === 'monthly_retainer' && formState.linkedWorkItemIds.length === 0
        ? (deliverablesSnapshot.map((d) => d.id).filter(Boolean) as string[])
        : [...formState.linkedWorkItemIds];

      const newInvoice: Invoice = {
        id: generateUUID(),
        invoiceNumber: getNextInvoiceNumber(invoices),
        date: Date.now(),
        clientId: formState.selectedClient.id,
        clientEmail: formState.selectedClient.email?.toLowerCase().trim(),
        clientName: formState.selectedClient.name,
        payeeName: payeeName || profile?.name,
        payeeUpiId: activeUpi || profile?.upiId,
        reels: [...targetReels],
        totalAmount: formState.grandTotal,
        status: 'Pending',
        invoiceType: formState.invoiceBillingMode,
        billingMonth: new Date(formState.dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        linkedWorkItemIds: resolvedLinkedIds,
        deliverables: formState.invoiceBillingMode === 'monthly_retainer' ? deliverablesSnapshot : undefined,
        ...(formState.discount > 0 ? { discountAmount: formState.discount, discountDescription: formState.discountDescription.trim() || 'Discount' } : {}),
        ...(formState.extraCost > 0 ? { extraCostAmount: formState.extraCost, extraCostDescription: formState.extraCostDescription.trim() || 'Extra Expenses' } : {}),
      };

      const filename = `Invoice_${formState.selectedClient.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;
      const pdfBlob = await generateOffscreenPdfBlob({ invoice: newInvoice, client: formState.selectedClient, profile, dateFrom: formState.dateFrom, dateTo: formState.dateTo, customUpiId: formState.customUpiId, deliverables: formState.invoiceBillingMode === 'monthly_retainer' ? deliverablesSnapshot : undefined });
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await addInvoice(newInvoice);
      for (const wId of resolvedLinkedIds) {
        const item = workItems.find((w) => w.id === wId);
        if (item) await updateWorkItem({ ...item, status: 'Invoiced', invoiceId: newInvoice.id });
      }

      formState.setReels([{ id: generateUUID(), title: '', quantity: 1, rate: formState.selectedClient.defaultRate }]);
      formState.setLinkedWorkItemIds([]);
      formState.setDiscountAmount('');
      formState.setDiscountDescription('');
      formState.setExtraCostAmount('');
      formState.setExtraCostDescription('');

      const emailDetails = generateInvoiceEmailDetails(formState.selectedClient, newInvoice, profile, formState.dateFrom, formState.dateTo);
      setEmailModalData({
        isOpen: true,
        clientName: formState.selectedClient.name,
        clientEmail: formState.selectedClient.email?.trim() || '',
        subject: emailDetails.subject,
        body: emailDetails.body,
        mailtoLink: emailDetails.mailtoLink,
        invoiceNo: emailDetails.invoiceNo,
        totalAmount: formState.grandTotal,
        pdfBlob,
        pdfFilename: filename,
        invoiceObj: newInvoice,
        clientObj: formState.selectedClient,
      });
    } catch (err: any) {
      console.error(err);
      alert('Error generating invoice: ' + (err?.message || String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    clients,
    invoices,
    workItems,
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
    ...formState,
    downloadingPdfId,
    isGenerating,
    isSendingGmail,
    emailModalData,
    setEmailModalData,
    paymentModalState,
    setPaymentModalState,
    handleDeleteInvoice,
    toggleInvoiceStatus,
    handleConfirmPaymentDate,
    handleEditInvoice,
    handleGenerateInvoice,
    handleRedownloadPdf,
    handleSendGmailManual,
  };
}
