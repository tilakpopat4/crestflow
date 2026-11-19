import { useState } from 'react';
import { User } from 'firebase/auth';
import { Client, Invoice, WorkItem, UserProfile } from '../types';
import { useFirestore } from './useFirestore';
import { calculateClientFinancials, getPaymentStatusInfo } from '../lib/paymentUtils';
import { getCurrencySymbol } from '../lib/currencyUtils';
import { formatLocalDateToYMD, parseYMDToTimestamp } from '../lib/dateUtils';
import { generateUUID } from '../lib/utils';

/**
 * Encapsulates state and mutation logic for ClientDashboard.
 */
export function useClientDashboard(client: Client, user: User | null) {
  const { data: invoices, addOrUpdateItem: updateInvoice } = useFirestore<Invoice>('invoices', user?.uid);
  const { data: workItems, addOrUpdateItem: updateWorkItem, removeItem: removeWorkItem } = useFirestore<WorkItem>('workItems', user?.uid);
  const { addOrUpdateItem: updateClient } = useFirestore<Client>('clients', user?.uid);
  const { data: profiles } = useFirestore<UserProfile>('profiles', user?.uid);

  const profile = profiles[0] || null;
  const currencySymbol = getCurrencySymbol(client.currency);
  const [copiedReviewLink, setCopiedReviewLink] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubClientsModalOpen, setIsSubClientsModalOpen] = useState(false);
  const [isWorkFormOpen, setIsWorkFormOpen] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [embedModalData, setEmbedModalData] = useState<{ isOpen: boolean; url: string; title: string; clientName?: string } | null>(null);
  const [subClientFilter, setSubClientFilter] = useState<'all' | 'direct' | string>('all');
  const [activeTab, setActiveTab] = useState<'work' | 'invoices' | 'settings'>('work');

  const [workFormData, setWorkFormData] = useState({
    subClientId: '',
    description: '',
    videoUrl: '',
    quantity: '1',
    rate: String(client.defaultRate),
    date: formatLocalDateToYMD(new Date()),
  });

  const clientInvoices = invoices.filter((inv) => inv.clientId === client.id);
  const clientWorkItems = workItems.filter((item) => item.clientId === client.id);
  const financials = calculateClientFinancials(client.id, invoices, workItems);
  const statusInfo = getPaymentStatusInfo(client, invoices, workItems);

  const handleCopyReviewLink = () => {
    if (!user) return;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const nameParam = encodeURIComponent(profile?.name || user.displayName || 'Freelancer');
    const clientNameParam = encodeURIComponent(client.name);
    const link = `${baseUrl}?feedback=true&uid=${user.uid}&name=${nameParam}&clientId=${client.id}&clientName=${clientNameParam}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedReviewLink(true);
        setTimeout(() => setCopiedReviewLink(false), 2000);
      }).catch(() => prompt('Copy review link:', link));
    } else {
      prompt('Copy review link:', link);
    }
  };

  const handleSavePaymentDate = async (paymentDateStr: string, markPaid: boolean) => {
    const selectedTimestamp = parseYMDToTimestamp(paymentDateStr);
    await updateClient({ ...client, lastPaymentDate: selectedTimestamp });
    if (markPaid) {
      for (const inv of financials.pendingInvoices) {
        await updateInvoice({ ...inv, status: 'Paid' });
      }
    }
    alert('Payment date updated successfully!');
  };

  const handleSaveRates = async (rates: {
    currency?: string;
    paymentBasis: 'per_reel' | 'monthly_retainer';
    defaultRate: number;
    monthlyRetainerAmount?: number;
    onSiteShootRate?: number;
    websiteMakingRate?: number;
    revisionsIncluded?: number;
  }) => {
    const updatedClient: Client = {
      ...client,
      currency: rates.currency || client.currency || 'INR',
      paymentBasis: rates.paymentBasis,
      defaultRate: rates.defaultRate,
      monthlyRetainerAmount: rates.monthlyRetainerAmount,
      onSiteShootRate: rates.onSiteShootRate,
      websiteMakingRate: rates.websiteMakingRate,
      revisionsIncluded: rates.revisionsIncluded,
    };
    if (!rates.onSiteShootRate) delete updatedClient.onSiteShootRate;
    if (!rates.websiteMakingRate) delete updatedClient.websiteMakingRate;
    if (rates.revisionsIncluded === undefined) delete updatedClient.revisionsIncluded;
    if (rates.paymentBasis !== 'monthly_retainer') delete updatedClient.monthlyRetainerAmount;
    await updateClient(updatedClient);
  };

  const handleOpenAddWork = () => {
    setEditingWorkId(null);
    setWorkFormData({
      subClientId: '',
      description: '',
      videoUrl: '',
      quantity: '1',
      rate: String(client.defaultRate),
      date: formatLocalDateToYMD(new Date()),
    });
    setIsWorkFormOpen(true);
  };

  const handleStartEditWork = (item: WorkItem) => {
    setEditingWorkId(item.id);
    setWorkFormData({
      subClientId: item.subClientId || '',
      description: item.description,
      videoUrl: item.videoUrl || '',
      quantity: String(item.quantity),
      rate: String(item.rate),
      date: formatLocalDateToYMD(item.date),
    });
    setIsWorkFormOpen(true);
  };

  const handleSaveWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isMonthlyClient = client.paymentBasis === 'monthly_retainer';
      const selectedRate = isMonthlyClient ? 0 : (Number(workFormData.rate) || client.defaultRate);
      const selectedQty = Number(workFormData.quantity);
      const selectedDate = parseYMDToTimestamp(workFormData.date);
      const trimmedVideoUrl = workFormData.videoUrl.trim() || undefined;
      const selectedSub = (client.subClients || []).find((sc) => sc.id === workFormData.subClientId);

      if (editingWorkId) {
        const existing = workItems.find((w) => w.id === editingWorkId);
        if (existing) {
          const updatedWork: WorkItem = {
            ...existing,
            subClientId: selectedSub?.id,
            subClientName: selectedSub?.name,
            description: workFormData.description,
            videoUrl: trimmedVideoUrl,
            quantity: selectedQty,
            rate: selectedRate,
            date: selectedDate,
          };
          if (existing.status === 'Invoiced' && existing.invoiceId) {
            const invoice = invoices.find((inv) => inv.id === existing.invoiceId);
            if (invoice) {
              if (invoice.invoiceType === 'monthly_retainer' && invoice.deliverables) {
                const updatedDeliverables = invoice.deliverables.map((deliv: any) =>
                  deliv.id === existing.id || deliv.workItemId === existing.id
                    ? { ...deliv, title: workFormData.description, quantity: selectedQty, subClientId: selectedSub?.id, subClientName: selectedSub?.name, videoUrl: trimmedVideoUrl }
                    : deliv
                );
                await updateInvoice({ ...invoice, deliverables: updatedDeliverables });
              } else if (invoice.reels) {
                let replaced = false;
                const updatedReels = invoice.reels.map((reel: any) => {
                  if (!replaced && reel.title === existing.description && reel.quantity === existing.quantity && reel.rate === existing.rate) {
                    replaced = true;
                    return { ...reel, title: workFormData.description, quantity: selectedQty, rate: selectedRate, subClientId: selectedSub?.id, subClientName: selectedSub?.name, videoUrl: trimmedVideoUrl };
                  }
                  return reel;
                });
                const newSubtotal = updatedReels.reduce((sum: number, r: any) => sum + (r.quantity * r.rate), 0);
                await updateInvoice({ ...invoice, reels: updatedReels, totalAmount: Math.max(0, newSubtotal - (invoice.discountAmount || 0)) });
              }
            }
          }
          await updateWorkItem(updatedWork);
        }
      } else {
        const newWork: WorkItem = {
          id: generateUUID(),
          clientId: client.id,
          subClientId: selectedSub?.id,
          subClientName: selectedSub?.name,
          description: workFormData.description,
          videoUrl: trimmedVideoUrl,
          quantity: selectedQty,
          rate: selectedRate,
          date: selectedDate,
          status: 'Uninvoiced',
          createdAt: Date.now(),
        };
        await updateWorkItem(newWork);
      }
      setEditingWorkId(null);
      setIsWorkFormOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Error saving work item: ' + (err?.message || String(err)));
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this work item?')) {
      await removeWorkItem(id);
    }
  };

  const formattedLastPaymentDate = client.lastPaymentDate && !isNaN(new Date(client.lastPaymentDate).getTime())
    ? new Date(client.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not Recorded';

  const nextDueTime = new Date(statusInfo.nextDueDate).getTime();
  const formattedNextDueDate = !isNaN(nextDueTime)
    ? new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return {
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
  };
}
