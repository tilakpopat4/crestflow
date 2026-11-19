import { useState, useMemo } from 'react';
import { Client, Reel, WorkItem, InvoiceDeliverable } from '../types';
import { generateUUID } from '../lib/utils';
import { formatLocalDateToYMD } from '../lib/dateUtils';

interface UseInvoiceFormStateProps {
  clients: Client[];
  workItems: WorkItem[];
}

/**
 * Encapsulates form inputs, deliverables, adjustments, and calculation state for invoice generation.
 */
export function useInvoiceFormState({ clients, workItems }: UseInvoiceFormStateProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dateTo, setDateTo] = useState(() => formatLocalDateToYMD(new Date()));
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [reels, setReels] = useState<Reel[]>([]);
  const [linkedWorkItemIds, setLinkedWorkItemIds] = useState<string[]>([]);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [extraCostAmount, setExtraCostAmount] = useState('');
  const [extraCostDescription, setExtraCostDescription] = useState('');
  const [directGrandTotalInput, setDirectGrandTotalInput] = useState('');
  const [customUpiId, setCustomUpiId] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceBillingMode, setInvoiceBillingMode] = useState<'per_reel' | 'monthly_retainer'>('per_reel');
  const [monthlyRetainerInput, setMonthlyRetainerInput] = useState('');
  const [monthlyServiceDescription, setMonthlyServiceDescription] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const effectiveReels = useMemo<Reel[]>(() => {
    if (invoiceBillingMode === 'monthly_retainer') {
      const fixedRate = Number(monthlyRetainerInput) || 0;
      const monthStr = dateFrom
        ? new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const desc = monthlyServiceDescription.trim() || `Monthly Video Editing Retainer (${monthStr})`;
      const validReels = reels.filter((r) => r.title.trim());
      return validReels.length > 0 ? validReels : [{ id: reels[0]?.id || 'monthly-retainer-item', title: desc, quantity: 1, rate: fixedRate }];
    }
    return reels;
  }, [invoiceBillingMode, monthlyRetainerInput, monthlyServiceDescription, dateFrom, reels]);

  const currentBillingDeliverables = useMemo<InvoiceDeliverable[]>(() => {
    if (!selectedClientId) return [];
    const logs = workItems.filter((w) => {
      if (w.clientId !== selectedClientId) return false;
      if (linkedWorkItemIds.length > 0) return linkedWorkItemIds.includes(w.id);
      if (w.status !== 'Uninvoiced') return false;
      const dStr = formatLocalDateToYMD(new Date(w.date));
      return dStr >= dateFrom && dStr <= dateTo;
    });
    logs.sort((a, b) => a.date - b.date || a.createdAt - b.createdAt);
    return logs.map((w) => ({
      id: w.id,
      title: w.description,
      quantity: w.quantity || 1,
      videoUrl: w.videoUrl,
      date: w.date,
      subClientName: w.subClientName,
    }));
  }, [selectedClientId, workItems, linkedWorkItemIds, dateFrom, dateTo]);

  const total = invoiceBillingMode === 'monthly_retainer' ? Number(monthlyRetainerInput) || 0 : reels.reduce((sum, r) => sum + r.quantity * r.rate, 0);
  const discount = Number(discountAmount) || 0;
  const extraCost = Number(extraCostAmount) || 0;
  const grandTotal = Math.max(0, total - discount + extraCost);

  const handleClientChange = (newId: string) => {
    setSelectedClientId(newId);
    const clientObj = clients.find((c) => c.id === newId);
    if (clientObj) {
      setDateTo(formatLocalDateToYMD(new Date()));
      if (clientObj.createdAt) setDateFrom(formatLocalDateToYMD(clientObj.createdAt));
      const isRetainer = clientObj.paymentBasis === 'monthly_retainer' || (!!clientObj.monthlyRetainerAmount && clientObj.monthlyRetainerAmount > 0);
      setInvoiceBillingMode(isRetainer ? 'monthly_retainer' : 'per_reel');
      if (isRetainer) {
        setMonthlyRetainerInput(String(clientObj.monthlyRetainerAmount || clientObj.defaultRate || ''));
        const monthStr = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        setMonthlyServiceDescription(`Monthly Video Editing & Content Creation Retainer (${monthStr})`);
      }
    }
  };

  const addItem = (defaultTitle: string, defaultRate: number) => {
    setReels([...reels, { id: generateUUID(), title: defaultTitle, quantity: 1, rate: defaultRate }]);
  };

  const updateReel = (id: string, field: keyof Reel, value: string | number) => {
    setReels(reels.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeReel = (id: string) => {
    if (reels.length > 1) setReels(reels.filter((r) => r.id !== id));
  };

  const handleApplyDirectGrandTotal = () => {
    const targetVal = Number(directGrandTotalInput);
    if (isNaN(targetVal) || directGrandTotalInput.trim() === '' || targetVal < 0) return alert('Please enter a valid amount.');
    const targetSubtotal = targetVal + discount - extraCost;
    if (reels.length === 0) {
      setReels([{ id: generateUUID(), title: 'Video Editing Services', quantity: 1, rate: Math.round(targetSubtotal) }]);
      return;
    }
    const n = reels.length;
    const totalRupees = Math.round(targetSubtotal);
    const baseRupees = Math.floor(totalRupees / n);
    const remainingRupees = totalRupees - baseRupees * n;
    setReels(reels.map((reel, idx) => ({ ...reel, rate: Math.round((baseRupees + (idx < remainingRupees ? 1 : 0)) / (reel.quantity > 0 ? reel.quantity : 1)) })));
  };

  const handleRoundFigures = () => {
    if (reels.length === 0) return;
    const newReels = reels.map((reel) => {
      const qty = reel.quantity > 0 ? reel.quantity : 1;
      const rounded = Math.round((reel.quantity * reel.rate) / 100) * 100;
      return { ...reel, rate: Math.max(1, Math.round(rounded / qty)) };
    });
    setReels(newReels);
    const newSubtotal = newReels.reduce((sum, r) => sum + r.quantity * r.rate, 0);
    setDirectGrandTotalInput(Math.max(0, newSubtotal - discount + extraCost).toString());
  };

  return {
    selectedClientId,
    setSelectedClientId,
    selectedClient,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    reels,
    setReels,
    linkedWorkItemIds,
    setLinkedWorkItemIds,
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
    invoiceBillingMode,
    setInvoiceBillingMode,
    monthlyRetainerInput,
    setMonthlyRetainerInput,
    monthlyServiceDescription,
    setMonthlyServiceDescription,
    effectiveReels,
    currentBillingDeliverables,
    total,
    discount,
    extraCost,
    grandTotal,
    handleClientChange,
    addItem,
    updateReel,
    removeReel,
    handleApplyDirectGrandTotal,
    handleRoundFigures,
  };
}
