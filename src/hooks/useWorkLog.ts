import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { useFirestore } from './useFirestore';
import { useAccess } from './useAccess';
import { SAMPLE_CLIENTS, SAMPLE_INVOICES, SAMPLE_WORK_ITEMS } from '../data/sampleWorkspaceData';
import { Client, WorkItem, Invoice } from '../types';
import { generateUUID } from '../lib/utils';
import { formatLocalDateToYMD, parseYMDToTimestamp } from '../lib/dateUtils';
import { syncWorkItemToInvoice, removeWorkItemFromInvoice } from '../lib/workLogInvoiceSync';

export interface WorkLogFormData {
  clientId: string;
  subClientId: string;
  description: string;
  videoUrl: string;
  quantity: string;
  rate: string;
  date: string;
}

const initialFormData: WorkLogFormData = {
  clientId: '',
  subClientId: '',
  description: '',
  videoUrl: '',
  quantity: '1',
  rate: '',
  date: formatLocalDateToYMD(new Date()),
};

/**
 * Encapsulates state, query filtering, and mutation handlers for WorkLogTab.
 */
export function useWorkLog(user: User, initialSearchQuery: string = '') {
  const access = useAccess();
  const isExploring = access.state === 'none';
  const liveUid = !isExploring ? user?.uid : undefined;

  const { data: fsClients, loading: fsClientsLoading } = useFirestore<Client>('clients', liveUid);
  const { data: fsWorkItems, loading: fsWorkLoading, addOrUpdateItem, removeItem } = useFirestore<WorkItem>('workItems', liveUid);
  const { data: fsInvoices, loading: fsInvoicesLoading, addOrUpdateItem: addOrUpdateInvoice, removeItem: removeInvoice } = useFirestore<any>('invoices', liveUid);

  const clients = isExploring ? SAMPLE_CLIENTS : fsClients;
  const workItems = isExploring ? SAMPLE_WORK_ITEMS : fsWorkItems;
  const invoices = isExploring ? SAMPLE_INVOICES : fsInvoices;
  const clientsLoading = isExploring ? false : fsClientsLoading;
  const workLoading = isExploring ? false : fsWorkLoading;
  const invoicesLoading = isExploring ? false : fsInvoicesLoading;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [embedModalData, setEmbedModalData] = useState<{ isOpen: boolean; url: string; title: string; clientName?: string } | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedWorkIds, setSelectedWorkIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [formData, setFormData] = useState<WorkLogFormData>(initialFormData);

  useEffect(() => {
    if (initialSearchQuery !== undefined) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const closedClientIds = useMemo(
    () => new Set((clients || []).filter((c) => c.isClosed).map((c) => c.id)),
    [clients]
  );

  const handleEditWork = (work: WorkItem) => {
    if (!access.requireAccess('log_work', 'Edit logged deliverables, rates, and Drive preview links.')) return;
    setEditingWorkId(work.id);
    setFormData({
      clientId: work.clientId,
      subClientId: work.subClientId || '',
      description: work.description,
      videoUrl: work.videoUrl || '',
      quantity: String(work.quantity),
      rate: String(work.rate),
      date: formatLocalDateToYMD(work.date),
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingWorkId(null);
    setFormData(initialFormData);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access.requireAccess('log_work', 'Log deliverables and track client work items.')) return;
    if (!formData.clientId) return alert('Please select a client');

    const client = clients.find((c) => c.id === formData.clientId);
    const selectedSub = client?.subClients?.find((sc) => sc.id === formData.subClientId);
    const isMonthlyClient = client?.paymentBasis === 'monthly_retainer';
    const selectedRate = isMonthlyClient ? 0 : Number(formData.rate) || (client ? client.defaultRate : 0);
    const selectedDate = parseYMDToTimestamp(formData.date);
    const selectedQty = Number(formData.quantity);
    const trimmedVideoUrl = formData.videoUrl.trim() || undefined;

    try {
      if (editingWorkId) {
        const existing = workItems.find((w) => w.id === editingWorkId);
        const clientObj = clients.find((c) => c.id === formData.clientId);
        if (existing) {
          const updatedWork: WorkItem = {
            ...existing,
            clientId: formData.clientId,
            clientEmail: clientObj?.email ? clientObj.email.toLowerCase().trim() : existing.clientEmail,
            subClientId: selectedSub ? selectedSub.id : formData.subClientId ? formData.subClientId : undefined,
            subClientName: selectedSub ? selectedSub.name : undefined,
            description: formData.description,
            videoUrl: trimmedVideoUrl,
            quantity: selectedQty,
            rate: selectedRate,
            date: selectedDate,
          };

          if (existing.status === 'Invoiced' && existing.invoiceId) {
            const invoice = invoices.find((inv) => inv.id === existing.invoiceId);
            if (invoice) {
              const updatedInv = syncWorkItemToInvoice(invoice, existing, {
                description: formData.description,
                quantity: selectedQty,
                rate: selectedRate,
                videoUrl: trimmedVideoUrl,
                subClientId: selectedSub?.id,
                subClientName: selectedSub?.name,
              });
              await addOrUpdateInvoice(updatedInv);
            }
          }
          await addOrUpdateItem(updatedWork);
        }
      } else {
        const clientObj = clients.find((c) => c.id === formData.clientId);
        const newWork: WorkItem = {
          id: generateUUID(),
          clientId: formData.clientId,
          clientEmail: clientObj?.email ? clientObj.email.toLowerCase().trim() : undefined,
          subClientId: selectedSub ? selectedSub.id : formData.subClientId ? formData.subClientId : undefined,
          subClientName: selectedSub ? selectedSub.name : undefined,
          description: formData.description,
          videoUrl: trimmedVideoUrl,
          quantity: selectedQty,
          rate: selectedRate,
          date: selectedDate,
          status: 'Uninvoiced',
          createdAt: Date.now(),
        };
        await addOrUpdateItem(newWork);
      }
      handleCancel();
    } catch (err: any) {
      console.error(err);
      alert('Error saving work item: ' + (err?.message || String(err)));
    }
  };

  const deleteWork = async (item: WorkItem) => {
    if (!access.requireAccess('log_work', 'Modify or delete logged work items.')) return;
    const isInvoiced = item.status === 'Invoiced';
    const message = isInvoiced
      ? 'This work log is currently invoiced. Deleting it will also remove it from the associated invoice and adjust the invoice totals. Are you sure you want to delete this work log?'
      : 'Are you sure you want to delete this work log?';

    if (confirm(message)) {
      try {
        if (isInvoiced && item.invoiceId) {
          const invoice = invoices.find((inv) => inv.id === item.invoiceId);
          if (invoice) {
            const updatedInv = removeWorkItemFromInvoice(invoice, item);
            if (!updatedInv) {
              await removeInvoice(invoice.id);
            } else {
              await addOrUpdateInvoice(updatedInv);
            }
          }
        }
        await removeItem(item.id);
      } catch (err: any) {
        console.error('Error deleting work log:', err);
        alert('Failed to delete work log: ' + (err?.message || String(err)));
      }
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedWorkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredWork = workItems.filter((w) => {
    const isClosedClient = closedClientIds.has(w.clientId);
    if (!showClosed && isClosedClient) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const client = clients.find((c) => c.id === w.clientId);
    const clientName = client ? client.name.toLowerCase() : '';
    return w.description.toLowerCase().includes(q) || clientName.includes(q) || (w.videoUrl && w.videoUrl.toLowerCase().includes(q));
  });

  const sortedWork = [...filteredWork].sort((a, b) => (sortOrder === 'asc' ? a.date - b.date || a.createdAt - b.createdAt : b.date - a.date || b.createdAt - a.createdAt));

  const visibleIds = sortedWork.map((w) => w.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedWorkIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedWorkIds.has(id)) && !allVisibleSelected;
  const selectedCount = selectedWorkIds.size;
  const selectedItems = workItems.filter((w) => selectedWorkIds.has(w.id));
  const selectedInvoicedCount = selectedItems.filter((w) => w.status === 'Invoiced').length;

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedWorkIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedWorkIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!access.requireAccess('log_work', 'Modify or delete work items in bulk.')) return;
    if (selectedWorkIds.size === 0) return;
    const itemsToDelete = workItems.filter((w) => selectedWorkIds.has(w.id));
    const invoicedCount = itemsToDelete.filter((w) => w.status === 'Invoiced').length;
    const msg = invoicedCount > 0
      ? `You are about to delete ${itemsToDelete.length} work log(s), of which ${invoicedCount} are already invoiced. Continue?`
      : `Delete ${itemsToDelete.length} selected work log(s)? This cannot be undone.`;
    if (!confirm(msg)) return;

    try {
      for (const item of itemsToDelete) {
        if (item.status === 'Invoiced' && item.invoiceId) {
          const invoice = invoices.find((inv) => inv.id === item.invoiceId);
          if (invoice) {
            const updatedInv = removeWorkItemFromInvoice(invoice, item);
            if (!updatedInv) await removeInvoice(invoice.id);
            else await addOrUpdateInvoice(updatedInv);
          }
        }
        await removeItem(item.id);
      }
      setSelectedWorkIds(new Set());
    } catch (err: any) {
      alert('Error deleting work logs: ' + (err?.message || String(err)));
    }
  };

  const handleBulkSave = async (updatedWorkItems: WorkItem[], updatedInvoices: Invoice[]) => {
    if (!access.requireAccess('log_work', 'Edit work items in bulk.')) return;
    for (const inv of updatedInvoices) await addOrUpdateInvoice(inv);
    for (const wi of updatedWorkItems) await addOrUpdateItem(wi);
    setSelectedWorkIds(new Set());
  };

  return {
    clients, workItems, invoices, clientsLoading, workLoading, invoicesLoading,
    isFormOpen, setIsFormOpen, isDriveModalOpen, setIsDriveModalOpen, embedModalData, setEmbedModalData,
    editingWorkId, sortOrder, setSortOrder, searchQuery, setSearchQuery,
    selectedWorkIds, setSelectedWorkIds, isBulkEditModalOpen, setIsBulkEditModalOpen, showClosed, setShowClosed,
    formData, setFormData, closedClientIds, handleEditWork, handleCancel, handleSubmit, deleteWork,
    toggleSelectItem, handleSelectAll, handleBulkDelete, handleBulkSave, sortedWork,
    allVisibleSelected, someVisibleSelected, selectedCount, selectedItems, selectedInvoicedCount, addOrUpdateItem,
  };
}
