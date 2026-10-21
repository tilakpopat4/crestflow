import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Client, Reel, Invoice, WorkItem, UserProfile, InvoiceDeliverable } from '../types';
import { Plus, Trash2, Download, Receipt, FileCheck, Mail, Send, Copy, X, Check, MailCheck, CheckCircle2, AlertCircle, Loader2, FileText, Search, Calculator, Divide, Coins, History, Pencil, Printer, ListChecks, IndianRupee, Archive, Clock, Sparkles, Calendar, Users } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { User } from 'firebase/auth';
import { generateUUID } from '../lib/utils';
import { generateInvoiceEmailDetails } from '../lib/paymentUtils';
import Logo from './Logo';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOMServer from 'react-dom/server';
import { sendEmailWithPdfAttachment, acquireGmailAccessToken } from '../lib/gmailService';
import PaymentDateModal from './PaymentDateModal';
import ScheduleInvoiceModal from './ScheduleInvoiceModal';
import { executeAutoInvoiceCheck, findDuplicateAutoInvoices } from '../lib/autoInvoiceService';
import { formatLocalDateToYMD } from '../lib/dateUtils';
import StatusBadge from './StatusBadge';
import { renderDocumentHtml, printDocumentHtml, generateOffscreenPdfBlob } from '../lib/invoiceRenderer';
import { generateUpiQrCodeDataUrl, buildUpiPaymentUri } from '../lib/upiQr';
import { formatInvoiceNumber, getNextInvoiceNumber } from '../lib/invoiceUtils';
import { SubscriptionState } from '../hooks/useSubscription';

interface InvoiceTabProps {
  user: User | null;
  profile: UserProfile | null;
  initialSearchQuery?: string;
  onNavigateToClients?: () => void;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

export default function InvoiceTab({
  user,
  profile,
  initialSearchQuery = '',
  onNavigateToClients,
  subscriptionState,
  onOpenSubscriptionModal
}: InvoiceTabProps) {
  const { data: clients, loading: clientsLoading, addOrUpdateItem: updateClient } = useFirestore<Client>('clients', user?.uid);
  const { data: invoices, addOrUpdateItem: addInvoice, removeItem: deleteInvoice } = useFirestore<Invoice>('invoices', user?.uid);
  const { data: workItems, addOrUpdateItem: updateWorkItem } = useFirestore<WorkItem>('workItems', user?.uid);

  const [showClosed, setShowClosed] = useState(false);
  const closedClientIds = useMemo(() => new Set(clients.filter(c => c.isClosed).map(c => c.id)), [clients]);
  const closedClientNames = useMemo(() => new Set(clients.filter(c => c.isClosed).map(c => c.name.toLowerCase())), [clients]);

  const activeInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const isClosed = closedClientIds.has(inv.clientId) || closedClientNames.has(inv.clientName.toLowerCase());
      return !isClosed;
    });
  }, [invoices, closedClientIds, closedClientNames]);

  const displayedInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const isClosed = closedClientIds.has(inv.clientId) || closedClientNames.has(inv.clientName.toLowerCase());
      if (!showClosed && isClosed) return false;
      return true;
    });
  }, [invoices, closedClientIds, closedClientNames, showClosed]);

  const totalEarnedTillToday = activeInvoices
    .filter(inv => inv.status === 'Paid')
    .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  const pendingAmount = activeInvoices
    .filter(inv => inv.status === 'Pending')
    .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  const totalInvoicedAmount = activeInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const paidInvoicesCount = activeInvoices.filter(inv => inv.status === 'Paid').length;

  const currentMonthInvoicesCount = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return invoices.filter(inv => {
      if (!inv.date) return false;
      const d = new Date(inv.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [invoices]);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>(initialSearchQuery);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setInvoiceSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  const [dateTo, setDateTo] = useState<string>(() => formatLocalDateToYMD(new Date()));
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-01`;
  });
  const [reels, setReels] = useState<Reel[]>([]);
  const [linkedWorkItemIds, setLinkedWorkItemIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [discountDescription, setDiscountDescription] = useState<string>('');
  const [extraCostAmount, setExtraCostAmount] = useState<string>('');
  const [extraCostDescription, setExtraCostDescription] = useState<string>('');
  const [directGrandTotalInput, setDirectGrandTotalInput] = useState<string>('');
  const [customUpiId, setCustomUpiId] = useState<string>('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [previewMode, setPreviewMode] = useState<'standard' | 'work-only'>('standard');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [invoiceBillingMode, setInvoiceBillingMode] = useState<'per_reel' | 'monthly_retainer'>('per_reel');
  const [monthlyRetainerInput, setMonthlyRetainerInput] = useState<string>('');
  const [monthlyServiceDescription, setMonthlyServiceDescription] = useState<string>('');
  const [emailModalData, setEmailModalData] = useState<{
    isOpen: boolean;
    clientName: string;
    clientEmail: string;
    subject: string;
    body: string;
    mailtoLink: string;
    monthCycleStr: string;
    invoiceNo: string;
    totalAmount: number;
    pdfBlob?: Blob;
    pdfFilename?: string;
    invoiceObj?: Invoice;
    clientObj?: Client;
    gmailStatus?: { sending: boolean; success?: boolean; error?: string; messageId?: string };
  } | null>(null);
  const [paymentModalState, setPaymentModalState] = useState<{ invoiceId: string | null, isOpen: boolean }>({ invoiceId: null, isOpen: false });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const effectiveReels = useMemo<Reel[]>(() => {
    if (invoiceBillingMode === 'monthly_retainer') {
      const fixedRate = Number(monthlyRetainerInput) || 0;
      const monthStr = dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const desc = monthlyServiceDescription.trim() || `Monthly Video Editing & Content Creation Retainer (${monthStr})`;
      const validReels = reels.filter(r => r.title.trim());
      if (validReels.length > 0) {
        return validReels;
      }
      return [{
        id: reels[0]?.id || 'monthly-retainer-item',
        title: desc,
        quantity: 1,
        rate: fixedRate
      }];
    }
    return reels;
  }, [invoiceBillingMode, monthlyRetainerInput, monthlyServiceDescription, dateFrom, reels]);

  const currentBillingDeliverables = useMemo<InvoiceDeliverable[]>(() => {
    if (!selectedClientId) return [];
    const logs = workItems.filter(w => {
      if (w.clientId !== selectedClientId) return false;
      if (linkedWorkItemIds.length > 0) {
        return linkedWorkItemIds.includes(w.id);
      }
      if (w.status !== 'Uninvoiced') return false;
      const dStr = formatLocalDateToYMD(new Date(w.date));
      return dStr >= dateFrom && dStr <= dateTo;
    });
    logs.sort((a, b) => (a.date - b.date) || (a.createdAt - b.createdAt));
    return logs.map(w => ({
      id: w.id,
      title: w.description,
      quantity: w.quantity || 1,
      videoUrl: w.videoUrl,
      date: w.date,
      subClientName: w.subClientName
    }));
  }, [selectedClientId, workItems, linkedWorkItemIds, dateFrom, dateTo]);

  const activeSchedulesCount = useMemo(() => {
    return clients.filter(c => !c.isClosed && c.autoInvoiceEnabled).length;
  }, [clients]);

  // Automated 6:00 AM Auto-Invoice Engine (runs background check during session)
  const autoInvoiceRef = useRef({
    clients,
    workItems,
    invoices,
    addInvoice,
    updateWorkItem,
    updateClient,
    profile
  });
  autoInvoiceRef.current = {
    clients,
    workItems,
    invoices,
    addInvoice,
    updateWorkItem,
    updateClient,
    profile
  };

  useEffect(() => {
    if (!user?.uid) return;

    const checkAndRunAutoInvoices = () => {
      const data = autoInvoiceRef.current;
      if (!data.clients || data.clients.length === 0) return;
      executeAutoInvoiceCheck(data).catch(err => {
        console.warn("[Auto-Invoice Engine] Background check error:", err);
      });
    };

    const initialTimer = setTimeout(checkAndRunAutoInvoices, 2000);
    const intervalId = setInterval(checkAndRunAutoInvoices, 60000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [user?.uid]);

  // Duplicate auto-generated invoice detection and clean-up
  const duplicateGroups = useMemo(() => findDuplicateAutoInvoices(invoices), [invoices]);
  const totalDuplicateCount = useMemo(() => {
    return duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);
  }, [duplicateGroups]);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  const handleCleanUpDuplicates = async () => {
    if (totalDuplicateCount === 0 || isCleaningDuplicates) return;
    const clientNames = Array.from(new Set(duplicateGroups.map(g => g.clientName))).join(', ');
    if (!window.confirm(`Clean up ${totalDuplicateCount} duplicate scheduled invoice(s) for ${clientNames}?\n\nThe first original invoice will be kept, and all redundant duplicates created will be safely deleted.`)) {
      return;
    }

    setIsCleaningDuplicates(true);
    try {
      let deleted = 0;
      for (const group of duplicateGroups) {
        for (const dup of group.duplicates) {
          await deleteInvoice(dup.id);
          deleted++;
        }
      }
      alert(`Cleaned up ${deleted} duplicate invoice(s) successfully.`);
    } catch (err) {
      console.error("Failed to clean up duplicates:", err);
      alert("An error occurred while cleaning up duplicates.");
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    if (!window.confirm(`Delete Invoice ${formatInvoiceNumber(inv, invoices)} for ${inv.clientName}?`)) {
      return;
    }

    try {
      await deleteInvoice(invoiceId);
      // If work items were linked to this invoice, revert them to 'Uninvoiced'
      if (inv.linkedWorkItemIds && inv.linkedWorkItemIds.length > 0) {
        for (const wId of inv.linkedWorkItemIds) {
          const w = workItems.find(item => item.id === wId);
          if (w && w.invoiceId === invoiceId) {
            await updateWorkItem({
              ...w,
              status: 'Uninvoiced',
              invoiceId: undefined
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      alert("Failed to delete invoice. Please try again.");
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const toggleInvoiceStatus = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setPaymentModalState({ invoiceId: id, isOpen: true });
    }
  };

  const handleConfirmPaymentDate = async (invoiceId: string, timestamp: number | null) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv) {
      const nextStatus = timestamp ? 'Paid' : 'Pending';
      const pDate = timestamp || undefined;
      // Update invoice
      await addInvoice({
        ...inv,
        status: nextStatus,
        lastPaymentDate: pDate
      });

      // Update client's lastPaymentDate for cycle logic
      if (nextStatus === 'Paid') {
        const clientObj = clients.find(c => c.id === inv.clientId || c.name === inv.clientName);
        if (clientObj && clientObj.id) {
          await updateClient({ ...clientObj, lastPaymentDate: pDate || Date.now() });
        }
      }
    }
    setPaymentModalState({ invoiceId: null, isOpen: false });
  };

  useEffect(() => {
    if (selectedClientId && dateFrom && dateTo) {
      // Find uninvoiced work items for this client in the selected date span
      const uninvoicedWork = workItems.filter(w => {
        if (w.clientId !== selectedClientId) return false;
        if (w.status !== 'Uninvoiced') return false;

        const workDate = new Date(w.date);
        const yyyy = workDate.getFullYear();
        const mm = String(workDate.getMonth() + 1).padStart(2, '0');
        const dd = String(workDate.getDate()).padStart(2, '0');
        const workDateStr = `${yyyy}-${mm}-${dd}`;

        return workDateStr >= dateFrom && workDateStr <= dateTo;
      });

      // Sort work log in ascending chronological order (earliest date first)
      uninvoicedWork.sort((a, b) => (a.date - b.date) || (a.createdAt - b.createdAt));

      if (uninvoicedWork.length > 0) {
        setReels(uninvoicedWork.map(w => ({
          id: generateUUID(),
          title: w.description,
          quantity: w.quantity,
          rate: w.rate,
          videoUrl: w.videoUrl,
          subClientId: w.subClientId,
          subClientName: w.subClientName,
          workItemId: w.id
        })));
        setLinkedWorkItemIds(uninvoicedWork.map(w => w.id));
      } else {
        setReels([{ id: generateUUID(), title: '', quantity: 1, rate: selectedClient ? selectedClient.defaultRate : 0 }]);
        setLinkedWorkItemIds([]);
      }
    }
  }, [selectedClientId, dateFrom, dateTo, workItems]);


  // Helper to resolve a client's previous payment date in YYYY-MM-DD format
  const getClientPreviousPaymentDateYMD = (clientObj?: Client): string | null => {
    if (!clientObj) return null;
    let prevMs: number | undefined = clientObj.lastPaymentDate
      ? (typeof clientObj.lastPaymentDate === 'number' ? clientObj.lastPaymentDate : new Date(clientObj.lastPaymentDate).getTime())
      : undefined;

    if (!prevMs) {
      const clientPaidInvoices = invoices
        .filter(i => (i.clientId === clientObj.id || i.clientName.toLowerCase() === clientObj.name.toLowerCase()) && i.status === 'Paid')
        .sort((a, b) => {
          const bTime = (b.lastPaymentDate ? (typeof b.lastPaymentDate === 'number' ? b.lastPaymentDate : new Date(b.lastPaymentDate).getTime()) : b.date);
          const aTime = (a.lastPaymentDate ? (typeof a.lastPaymentDate === 'number' ? a.lastPaymentDate : new Date(a.lastPaymentDate).getTime()) : a.date);
          return bTime - aTime;
        });

      if (clientPaidInvoices.length > 0) {
        const topPaid = clientPaidInvoices[0];
        prevMs = topPaid.lastPaymentDate ? (typeof topPaid.lastPaymentDate === 'number' ? topPaid.lastPaymentDate : new Date(topPaid.lastPaymentDate).getTime()) : topPaid.date;
      }
    }

    if (prevMs && !isNaN(prevMs)) {
      return formatLocalDateToYMD(prevMs);
    }
    return null;
  };

  // Rule for Invoice: From date defaults to previous payment date, and To date defaults to present date
  useEffect(() => {
    if (!selectedClientId) return;
    const clientObj = clients.find(c => c.id === selectedClientId);
    if (clientObj) {
      // 1. Present date by default for To Date
      const presentDateYMD = formatLocalDateToYMD(new Date());
      setDateTo(presentDateYMD);

      // 2. Previous payment date by default for From Date
      const prevPaymentYMD = getClientPreviousPaymentDateYMD(clientObj);
      if (prevPaymentYMD) {
        setDateFrom(prevPaymentYMD);
      } else if (clientObj.createdAt) {
        setDateFrom(formatLocalDateToYMD(clientObj.createdAt));
      }

      // Auto-detect retainer vs per-reel
      const isRetainer = clientObj.paymentBasis === 'monthly_retainer' || (!!clientObj.monthlyRetainerAmount && clientObj.monthlyRetainerAmount > 0);
      setInvoiceBillingMode(isRetainer ? 'monthly_retainer' : 'per_reel');
      if (isRetainer) {
        setMonthlyRetainerInput(String(clientObj.monthlyRetainerAmount || clientObj.defaultRate || ''));
        const monthBase = prevPaymentYMD ? new Date(prevPaymentYMD) : new Date();
        const monthStr = monthBase.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        setMonthlyServiceDescription(`Monthly Video Editing & Content Creation Retainer (${monthStr})`);
      }
    }
  }, [selectedClientId, clients, invoices]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedClientId(newId);
    const clientObj = clients.find(c => c.id === newId);
    if (clientObj) {
      // 1. Present date by default for To Date
      const presentDateYMD = formatLocalDateToYMD(new Date());
      setDateTo(presentDateYMD);

      // 2. Previous payment date by default for From Date
      const prevPaymentYMD = getClientPreviousPaymentDateYMD(clientObj);
      if (prevPaymentYMD) {
        setDateFrom(prevPaymentYMD);
      } else if (clientObj.createdAt) {
        setDateFrom(formatLocalDateToYMD(clientObj.createdAt));
      }

      if (clientObj.paymentBasis === 'monthly_retainer' || (clientObj.monthlyRetainerAmount && clientObj.monthlyRetainerAmount > 0)) {
        setInvoiceBillingMode('monthly_retainer');
        setMonthlyRetainerInput(String(clientObj.monthlyRetainerAmount || clientObj.defaultRate || ''));
        const monthBase = prevPaymentYMD ? new Date(prevPaymentYMD) : new Date();
        const monthStr = monthBase.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        setMonthlyServiceDescription(`Monthly Video Editing & Content Creation Retainer (${monthStr})`);
      } else {
        setInvoiceBillingMode('per_reel');
      }
    }
  };

  const addItem = (defaultTitle: string, defaultRate: number) => {
    setReels([
      ...reels,
      { id: generateUUID(), title: defaultTitle, quantity: 1, rate: defaultRate }
    ]);
  };

  const updateReel = (id: string, field: keyof Reel, value: string | number) => {
    setReels(reels.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeReel = (id: string) => {
    if (reels.length > 1) {
      setReels(reels.filter(r => r.id !== id));
    }
  };

  const handleApplyDirectGrandTotal = () => {
    const targetVal = Number(directGrandTotalInput);
    if (isNaN(targetVal) || directGrandTotalInput.trim() === '') {
      alert("Please enter a valid amount for the Grand Total.");
      return;
    }
    if (targetVal < 0) {
      alert("Grand total cannot be negative.");
      return;
    }

    const discount = Number(discountAmount) || 0;
    const extraCost = Number(extraCostAmount) || 0;
    const targetSubtotal = targetVal + discount - extraCost;

    if (reels.length === 0) {
      setReels([{ id: generateUUID(), title: 'Video Editing Services', quantity: 1, rate: Math.round(targetSubtotal) }]);
      return;
    }

    const n = reels.length;
    // Divide targetSubtotal cleanly into whole integer rupees across all reels
    const totalRupees = Math.round(targetSubtotal);
    const baseRupees = Math.floor(totalRupees / n);
    let remainingRupees = totalRupees - (baseRupees * n);

    const newReels = reels.map((reel, idx) => {
      const itemRupees = baseRupees + (idx < remainingRupees ? 1 : 0);
      const qty = reel.quantity > 0 ? reel.quantity : 1;
      const computedRate = Math.round(itemRupees / qty);
      return {
        ...reel,
        rate: computedRate
      };
    });

    setReels(newReels);
  };

  const roundToNearestHundred = (amount: number): number => {
    if (amount <= 0) return 0;
    // Standard hundred rounding: >150 -> 200, <150 -> 100
    const rounded = Math.round(amount / 100) * 100;
    return rounded === 0 && amount > 0 ? 100 : rounded;
  };

  const handleRoundFigures = () => {
    if (reels.length === 0) return;

    const newReels = reels.map(reel => {
      const qty = reel.quantity > 0 ? reel.quantity : 1;
      const currentLineTotal = reel.quantity * reel.rate;
      const roundedLineTotal = roundToNearestHundred(currentLineTotal);
      const newRate = Math.max(1, Math.round(roundedLineTotal / qty));
      return {
        ...reel,
        rate: newRate
      };
    });

    setReels(newReels);

    const newSubtotal = newReels.reduce((sum, r) => sum + (r.quantity * r.rate), 0);
    const discount = Number(discountAmount) || 0;
    const extraCost = Number(extraCostAmount) || 0;
    const newGrandTotal = Math.max(0, newSubtotal - discount + extraCost);
    setDirectGrandTotalInput(newGrandTotal.toString());
  };

  const calculateTotal = () => {
    if (invoiceBillingMode === 'monthly_retainer') {
      return Number(monthlyRetainerInput) || 0;
    }
    return reels.reduce((sum, reel) => sum + (reel.quantity * reel.rate), 0);
  };

  const total = calculateTotal();
  const discount = Number(discountAmount) || 0;
  const extraCost = Number(extraCostAmount) || 0;
  const grandTotal = Math.max(0, total - discount + extraCost);

  useEffect(() => {
    if (profile?.upiId && profile.upiId !== 'Not specified') {
      setCustomUpiId(profile.upiId);
    } else if (!customUpiId) {
      setCustomUpiId('tilakpopat2007-1@okaxis');
    }
  }, [profile]);

  const payeeName = profile?.name || user?.displayName || 'Tilak Popat';
  const activeUpi = customUpiId.trim() || (profile?.upiId && profile.upiId !== 'Not specified' ? profile.upiId : 'tilakpopat2007-1@okaxis');
  const activeUpiUri = buildUpiPaymentUri(activeUpi, payeeName, grandTotal, 'Invoice Payment');

  const handleEditInvoice = (inv: Invoice) => {
    setSelectedClientId(inv.clientId);
    setReels(inv.reels.map(r => ({ ...r, id: generateUUID() })));
    if (inv.invoiceType === 'monthly_retainer' || (inv.reels.length === 1 && (inv.reels[0].title.toLowerCase().includes('retainer') || inv.reels[0].title.toLowerCase().includes('monthly')))) {
      setInvoiceBillingMode('monthly_retainer');
      setMonthlyRetainerInput(String(inv.reels[0]?.rate || inv.totalAmount));
      setMonthlyServiceDescription(inv.reels[0]?.title || '');
    } else {
      setInvoiceBillingMode('per_reel');
    }
    if (inv.discountAmount !== undefined) {
      setDiscountAmount(inv.discountAmount.toString());
    } else {
      setDiscountAmount('');
    }
    setDiscountDescription(inv.discountDescription || '');

    if (inv.extraCostAmount !== undefined) {
      setExtraCostAmount(inv.extraCostAmount.toString());
    } else {
      setExtraCostAmount('');
    }
    setExtraCostDescription(inv.extraCostDescription || '');
    setDirectGrandTotalInput(inv.totalAmount.toString());
    setEditingInvoiceId(inv.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRedownloadPdf = async (inv: Invoice) => {
    const clientObj = clients.find(c => c.id === inv.clientId) || {
      id: inv.clientId,
      name: inv.clientName,
      email: '',
      phone: '',
      defaultRate: 0,
      createdAt: 0
    };
    setDownloadingPdfId(inv.id);
    try {
      const pdfBlob = await generateOffscreenPdfBlob({
        invoice: inv,
        client: clientObj,
        profile,
        customUpiId,
        deliverables: inv.deliverables
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const invNo = formatInvoiceNumber(inv, invoices);
      a.download = `${invNo}_${inv.clientName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error re-downloading PDF:", e);
      alert("Failed to generate PDF download. Please try again.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handlePrintDocument = async (inv?: Invoice, clientObj?: Client, hideFinanceOverride?: boolean) => {
    const isWorkSummary = !!hideFinanceOverride;
    const targetClient = clientObj || selectedClient;
    const targetInvoice: Invoice = inv || {
      id: generateUUID(),
      date: Date.now(),
      clientId: targetClient?.id || '',
      clientName: targetClient?.name || 'Client',
      reels: [...effectiveReels],
      totalAmount: grandTotal,
      status: 'Pending',
      invoiceType: invoiceBillingMode,
      ...(discount > 0 ? {
        discountAmount: discount,
        discountDescription: discountDescription.trim() || 'Discount'
      } : {}),
      ...(extraCost > 0 ? {
        extraCostAmount: extraCost,
        extraCostDescription: extraCostDescription.trim() || 'Extra Expenses'
      } : {})
    };

    if (!targetClient && !inv) {
      alert("Please select a client first.");
      return;
    }

    if (!inv && effectiveReels.length === 0) {
      alert("No work items found to print.");
      return;
    }

    const effectiveDeliverables = (inv?.deliverables && inv.deliverables.length > 0)
      ? inv.deliverables
      : currentBillingDeliverables;

    let qrDataUrl = '';
    const senderName = profile?.name || 'Tilak Popat';
    const upiId = (customUpiId && customUpiId.trim())
      || (profile?.upiId && profile.upiId !== 'Not specified' ? profile.upiId.trim() : '')
      || 'tilakpopat2007-1@okaxis';

    if (!isWorkSummary && upiId) {
      try {
        const invShortId = formatInvoiceNumber(targetInvoice, invoices);
        const res = await generateUpiQrCodeDataUrl(upiId, senderName, targetInvoice.totalAmount, `Payment for Invoice ${invShortId}`);
        if (res && res.pngDataUrl) {
          qrDataUrl = res.pngDataUrl;
        }
      } catch (e) {
        console.warn("QR code generation for print failed:", e);
      }
    }

    const htmlContent = renderDocumentHtml({
      invoice: targetInvoice,
      client: targetClient,
      profile,
      dateFrom,
      dateTo,
      qrDataUrl,
      customUpiId,
      hideFinance: isWorkSummary,
      deliverables: effectiveDeliverables
    });

    const clientNameStr = (targetClient?.name || targetInvoice.clientName || 'Client').replace(/\s+/g, '_');
    const docPrefix = isWorkSummary ? 'Work_Summary' : 'Invoice';
    const printDocTitle = `${docPrefix}_${clientNameStr}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}`;

    printDocumentHtml(htmlContent, printDocTitle);
  };

  const handlePrintWorkSummary = (inv?: Invoice, clientObj?: Client) => {
    handlePrintDocument(inv, clientObj, true);
  };

  const handleDownloadWorkSummaryPdf = async (inv?: Invoice, clientObj?: Client) => {
    const targetClient = clientObj || selectedClient;
    const targetInvoice: Invoice = inv || {
      id: generateUUID(),
      date: Date.now(),
      clientId: targetClient?.id || '',
      clientName: targetClient?.name || 'Client',
      reels: [...effectiveReels],
      totalAmount: grandTotal,
      status: 'Pending',
      invoiceType: invoiceBillingMode
    };

    if (!targetClient && !inv) {
      alert("Please select a client first.");
      return;
    }

    if (!inv && effectiveReels.length === 0) {
      alert("No work items found to download.");
      return;
    }

    const effectiveDeliverables = (inv?.deliverables && inv.deliverables.length > 0)
      ? inv.deliverables
      : currentBillingDeliverables;

    setIsGeneratingSummary(true);
    try {
      const pdfBlob = await generateOffscreenPdfBlob({
        invoice: targetInvoice,
        client: targetClient,
        profile,
        dateFrom,
        dateTo,
        hideFinance: true,
        deliverables: effectiveDeliverables
      });

      const clientNameStr = (targetClient?.name || targetInvoice.clientName || 'Client').replace(/\s+/g, '_');
      const filename = `Work_Summary_${clientNameStr}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (e: any) {
      console.error("Error generating work summary PDF:", e);
      alert("Failed to generate Work Summary PDF: " + (e?.message || String(e)));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDownload = async () => {
    if (subscriptionState && !subscriptionState.canCreateInvoice(currentMonthInvoicesCount)) {
      if (onOpenSubscriptionModal) {
        onOpenSubscriptionModal();
      } else {
        alert(`Free plan limit reached (${subscriptionState.limits.maxInvoicesPerMonth} invoices this month). Upgrade to Pro for unlimited invoices.`);
      }
      return;
    }

    if (!selectedClient) {
      alert("Please select a client first.");
      return;
    }

    const targetReels = invoiceBillingMode === 'monthly_retainer' ? effectiveReels : reels;

    if (targetReels.some(r => !r.title.trim())) {
      alert("Please provide a title for the invoice items.");
      return;
    }

    if (invoiceBillingMode === 'monthly_retainer' && (!monthlyRetainerInput || Number(monthlyRetainerInput) <= 0)) {
      alert("Please enter a valid monthly retainer amount.");
      return;
    }

    setIsGenerating(true);

    try {
      const deliverablesSnapshot: InvoiceDeliverable[] = currentBillingDeliverables.map(d => ({
        id: d.id,
        title: d.title,
        quantity: d.quantity,
        videoUrl: d.videoUrl,
        date: d.date,
        subClientName: d.subClientName
      }));

      const nextInvoiceNo = getNextInvoiceNumber(invoices);
      const newInvoice: Invoice = {
        id: generateUUID(),
        invoiceNumber: nextInvoiceNo,
        date: Date.now(),
        clientId: selectedClient.id,
        clientEmail: selectedClient.email ? selectedClient.email.toLowerCase().trim() : undefined,
        clientName: selectedClient.name,
        payeeName: payeeName || profile?.name || undefined,
        payeeUpiId: activeUpi || profile?.upiId || undefined,
        reels: [...targetReels],
        totalAmount: grandTotal,
        status: 'Pending',
        invoiceType: invoiceBillingMode,
        billingMonth: new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        linkedWorkItemIds: [...linkedWorkItemIds],
        deliverables: invoiceBillingMode === 'monthly_retainer' ? deliverablesSnapshot : undefined,
        ...(selectedClient.lastPaymentDate ? { lastPaymentDate: selectedClient.lastPaymentDate } : {}),
        ...(discount > 0 ? {
          discountAmount: discount,
          discountDescription: discountDescription.trim() || 'Discount/Deduction'
        } : {}),
        ...(extraCost > 0 ? {
          extraCostAmount: extraCost,
          extraCostDescription: extraCostDescription.trim() || 'Extra Expenses'
        } : {})
      };

      const filename = `Invoice_${selectedClient.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;

      // 1. Generate crisp, unscaled offscreen PDF blob
      const pdfBlob = await generateOffscreenPdfBlob({
        invoice: newInvoice,
        client: selectedClient,
        profile,
        dateFrom,
        dateTo,
        customUpiId,
        deliverables: invoiceBillingMode === 'monthly_retainer' ? deliverablesSnapshot : undefined
      });

      // 2. Trigger browser download
      try {
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.warn("Blob download fallback:", e);
      }

      // 3. Save invoice to cloud storage
      await addInvoice(newInvoice);

      // 4. Mark linked work items as invoiced
      for (const workId of linkedWorkItemIds) {
        const workItem = workItems.find(w => w.id === workId);
        if (workItem) {
          await updateWorkItem({ ...workItem, status: 'Invoiced', invoiceId: newInvoice.id });
        }
      }

      // 5. Clear form selection
      setReels([{ id: generateUUID(), title: '', quantity: 1, rate: selectedClient.defaultRate }]);
      setLinkedWorkItemIds([]);
      setDiscountAmount('');
      setDiscountDescription('');
      setExtraCostAmount('');
      setExtraCostDescription('');

      // 6. Generate email details for this specific invoice
      const emailDetails = generateInvoiceEmailDetails(selectedClient, newInvoice, profile, dateFrom, dateTo);
      const targetClientEmail = selectedClient.email ? selectedClient.email.trim() : '';
      let initialGmailStatus: { sending: boolean; success?: boolean; error?: string; messageId?: string } = { sending: false };

      if (targetClientEmail) {
        initialGmailStatus = { sending: true };
        sendEmailWithPdfAttachment({
          to: targetClientEmail,
          subject: emailDetails.subject,
          bodyText: emailDetails.body,
          pdfBlob: pdfBlob,
          pdfFilename: filename
        }).then(res => {
          if (res.success) {
            setEmailModalData(prev => prev ? {
              ...prev,
              gmailStatus: { sending: false, success: true, messageId: res.id }
            } : null);
          } else {
            setEmailModalData(prev => prev ? {
              ...prev,
              gmailStatus: { sending: false, success: false, error: res.error }
            } : null);
          }
        });
      }

      setEmailModalData({
        isOpen: true,
        clientName: selectedClient.name,
        clientEmail: targetClientEmail,
        subject: emailDetails.subject,
        body: emailDetails.body,
        mailtoLink: emailDetails.mailtoLink,
        monthCycleStr: emailDetails.monthCycleStr,
        invoiceNo: emailDetails.invoiceNo,
        totalAmount: grandTotal,
        pdfBlob: pdfBlob,
        pdfFilename: filename,
        invoiceObj: newInvoice,
        clientObj: selectedClient,
        gmailStatus: initialGmailStatus
      });

    } catch (err: any) {
      console.error("PDF generation / save error:", err);
      alert("An error occurred while generating or saving the PDF: " + (err?.message || String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendGmailManual = async () => {
    if (!emailModalData) return;
    const recipient = emailModalData.clientEmail.trim();
    if (!recipient) {
      alert("Please enter a recipient email address.");
      return;
    }

    setIsSendingGmail(true);
    setEmailModalData(prev => prev ? { ...prev, gmailStatus: { sending: true } } : null);

    try {
      let currentPdfBlob = emailModalData.pdfBlob;
      if (!currentPdfBlob && emailModalData.invoiceObj) {
        currentPdfBlob = await generateOffscreenPdfBlob({
          invoice: emailModalData.invoiceObj,
          client: emailModalData.clientObj,
          profile,
          deliverables: emailModalData.invoiceObj.deliverables
        });
      }

      const token = await acquireGmailAccessToken();
      const res = await sendEmailWithPdfAttachment({
        to: recipient,
        subject: emailModalData.subject,
        bodyText: emailModalData.body,
        pdfBlob: currentPdfBlob,
        pdfFilename: emailModalData.pdfFilename || `Invoice_${emailModalData.invoiceNo}.pdf`,
        accessToken: token
      });

      if (res.success) {
        setEmailModalData(prev => prev ? {
          ...prev,
          pdfBlob: currentPdfBlob,
          gmailStatus: { sending: false, success: true, messageId: res.id }
        } : null);
      } else {
        setEmailModalData(prev => prev ? {
          ...prev,
          gmailStatus: { sending: false, success: false, error: res.error }
        } : null);
      }
    } catch (err: any) {
      console.error("Gmail manual send error:", err);
      setEmailModalData(prev => prev ? {
        ...prev,
        gmailStatus: { sending: false, success: false, error: err?.message || String(err) }
      } : null);
    } finally {
      setIsSendingGmail(false);
    }
  };

  if (clientsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[360px] select-none">
        <div className="relative flex items-center justify-center mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800" />
          <div className="absolute w-8 h-8 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
        </div>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Loading invoices...</span>
      </div>
    );
  }

    return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Invoice Generator</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Create and export client invoices.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            title="Schedule automatic morning 6:00 AM invoice generation for clients"
          >
            <Clock size={16} className="text-indigo-200" />
            <span>Schedule Auto-Invoice</span>
            {activeSchedulesCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/20 text-white">
                {activeSchedulesCount} Active
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Free Tier Usage Notice */}
      {subscriptionState && !subscriptionState.isPro && subscriptionState.isSubscriptionFeatureEnabled && (
        <div className="max-w-4xl mx-auto flex items-center justify-between px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300">
          <span>Free Plan: <strong className="font-semibold text-slate-900 dark:text-slate-100">{currentMonthInvoicesCount} / {subscriptionState.limits.maxInvoicesPerMonth}</strong> invoices generated this month.</span>
          {onOpenSubscriptionModal && (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Upgrade to Pro &rarr;
            </button>
          )}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={18} className="text-indigo-500" />
                Invoice Details
              </h3>
              {editingInvoiceId && (
                <button
                  type="button"
                  onClick={() => setEditingInvoiceId(null)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Exit edit mode and reset"
                >
                  <Pencil size={11} /> Editing Mode <X size={12} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Client *</label>
                <select
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 outline-none transition-colors focus:border-indigo-500"
                  value={selectedClientId}
                  onChange={handleClientChange}
                >
                  <option value="" disabled>-- Choose a saved client --</option>
                  {clients.filter(c => !c.isClosed || c.id === selectedClientId).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.isClosed ? ' (Closed)' : ''}{c.autoInvoiceEnabled ? ' (⏰ 6 AM Auto)' : ''}
                    </option>
                  ))}
                </select>
                {selectedClient?.autoInvoiceEnabled && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                      Auto-invoicing active at 6:00 AM
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="font-bold underline hover:text-indigo-900 dark:hover:text-indigo-200 cursor-pointer"
                    >
                      Edit Schedule
                    </button>
                  </div>
                )}
                {clients.length === 0 && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-3">
                    <span>No clients available. Add a client first to generate an invoice.</span>
                    {onNavigateToClients && (
                      <button
                        type="button"
                        onClick={onNavigateToClients}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        Add Client
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date From *</label>
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 outline-none transition-colors focus:border-indigo-500"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date To *</label>
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 outline-none transition-colors focus:border-indigo-500"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            {/* Automatic Billing Format Indicator (Auto-selected from client) */}
            <div className="mb-6 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0"></span>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {invoiceBillingMode === 'monthly_retainer' ? 'Monthly Retainer Format' : 'Per Reel / Item Format'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {invoiceBillingMode === 'monthly_retainer'
                      ? 'Direct monthly flat retainer amount. Itemized work log is automatically included.'
                      : 'Calculated dynamically based on individual deliverable rates.'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  {invoiceBillingMode === 'monthly_retainer' && selectedClient?.monthlyRetainerAmount
                    ? `₹${selectedClient.monthlyRetainerAmount.toLocaleString('en-IN')}/mo`
                    : selectedClient
                    ? `₹${selectedClient.defaultRate.toLocaleString('en-IN')}/reel`
                    : ''}
                </span>
                <span className="text-[10px] text-slate-400 block">Auto-selected from client</span>
              </div>
            </div>

            {invoiceBillingMode === 'monthly_retainer' ? (
              /* Monthly Retainer Section */
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Monthly Retainer Mode
                    </span>
                  </div>
                  {selectedClient?.monthlyRetainerAmount && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 shrink-0">
                      Default: ₹{selectedClient.monthlyRetainerAmount.toLocaleString('en-IN')}/mo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-2">
                  <div className="md:col-span-8">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service / Retainer Description
                    </label>
                    <input
                      type="text"
                      value={monthlyServiceDescription}
                      onChange={(e) => setMonthlyServiceDescription(e.target.value)}
                      placeholder="e.g. Monthly Video Production & Editing Retainer"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fixed Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={monthlyRetainerInput}
                        onChange={(e) => setMonthlyRetainerInput(e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Included Deliverables List (Rates Hidden) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Included Work Deliverables ({currentBillingDeliverables.length})
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Rates hidden • Included in retainer
                    </span>
                  </div>
                  {currentBillingDeliverables.length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-1.5 px-2.5 font-semibold w-8 text-center">#</th>
                            <th className="py-1.5 px-2 font-semibold w-24">Date</th>
                            <th className="py-1.5 px-2 font-semibold">Deliverable Description</th>
                            <th className="py-1.5 px-2 font-semibold text-center w-12">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {currentBillingDeliverables.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="py-1.5 px-2.5 text-center text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                              <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">
                                {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                              </td>
                              <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                <div>{item.title}</div>
                                {item.videoUrl && (
                                  <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 underline truncate block max-w-xs">
                                    {item.videoUrl}
                                  </a>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                                {item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                      No uninvoiced deliverables in this date span.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Per-Item Line Items */
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Line Items</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => addItem('', selectedClient ? selectedClient.defaultRate : 0)}
                      className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold underline hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Reel
                    </button>
                    <button
                      onClick={() => addItem('On Site Shoot', selectedClient?.onSiteShootRate || 0)}
                      className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold underline hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add On Site Shoot
                    </button>
                    <button
                      onClick={() => addItem('Website Making', selectedClient?.websiteMakingRate || 0)}
                      className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold underline hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Website
                    </button>
                  </div>
                </div>

                {/* Quick Set Direct Grand Total */}
                <div className="mb-5 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator size={15} className="text-indigo-600 dark:text-indigo-400" />
                        Direct Grand Total Split
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Enter target grand total to divide equally across all {reels.length} item{reels.length === 1 ? '' : 's'}.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 10000"
                          value={directGrandTotalInput}
                          onChange={(e) => setDirectGrandTotalInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyDirectGrandTotal();
                            }
                          }}
                          className="w-full pl-7 pr-2 py-1.5 text-sm font-semibold border border-indigo-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                        <button
                          type="button"
                          onClick={handleApplyDirectGrandTotal}
                          className="w-full sm:w-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Divide grand total into clean whole numbers equally"
                        >
                          <Divide size={13} className="shrink-0" />
                          <span className="truncate">Split Equally</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRoundFigures}
                          className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Round prices to nearest hundred (>150 rounds to 200, <150 rounds to 100)"
                        >
                          <Coins size={13} className="shrink-0" />
                          <span className="truncate">Round Figures</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {reels.map((reel, index) => (
                    <div key={reel.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-100 dark:border-slate-700/60 relative group">
                      {reels.length > 1 && (
                        <button
                          onClick={() => removeReel(reel.id)}
                          className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                          <input
                            type="text"
                            value={reel.title}
                            onChange={(e) => updateReel(reel.id, 'title', e.target.value)}
                            placeholder="e.g. Wedding Highlight Reel"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-12">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Content / Video URL (Optional)</label>
                          <input
                            type="url"
                            value={reel.videoUrl || ''}
                            onChange={(e) => updateReel(reel.id, 'videoUrl', e.target.value)}
                            placeholder="e.g. https://instagram.com/reel/... or drive link"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-4">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={reel.quantity}
                            onChange={(e) => updateReel(reel.id, 'quantity', Number(e.target.value))}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-4">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={reel.rate}
                            onChange={(e) => updateReel(reel.id, 'rate', Number(e.target.value))}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-4 flex flex-col justify-end">
                          <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium text-right text-slate-900 dark:text-slate-100 bg-slate-100/50 dark:bg-slate-900/50">
                            ₹{(reel.quantity * reel.rate).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Adjustments Fields */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Adjustments (Optional)</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Extra Cost Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Stock footage, Travel"
                    value={extraCostDescription}
                    onChange={(e) => setExtraCostDescription(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Extra Cost Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={extraCostAmount}
                    onChange={(e) => setExtraCostAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Deduction Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Early payment discount"
                    value={discountDescription}
                    onChange={(e) => setDiscountDescription(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Deduction Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details (Optional) */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Payment & Settlement (UPI)</h4>
                <span className="text-[11px] text-slate-400">Included on Invoice</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">UPI ID for Payment QR</label>
                <input
                  type="text"
                  placeholder="e.g. username@bank"
                  value={customUpiId}
                  onChange={(e) => setCustomUpiId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-sm text-slate-500">
                <span>{invoiceBillingMode === 'monthly_retainer' ? 'Monthly Retainer' : 'Subtotal'}</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              {extraCost > 0 && (
                <div className="flex justify-between items-center text-sm text-slate-700 font-medium">
                  <span>Extra Cost ({extraCostDescription.trim() || 'Additional Expenses'})</span>
                  <span>+₹{extraCost.toLocaleString('en-IN')}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between items-center text-sm text-rose-500 font-medium">
                  <span>Deduction ({discountDescription.trim() || 'Discount'})</span>
                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Grand Total</span>
                  <button
                    type="button"
                    onClick={handleRoundFigures}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                    title="Round item prices to nearest hundred (>150 -> 200, <150 -> 100)"
                  >
                    <Coins size={12} />
                    Round Figures
                  </button>
                </div>
                <span className="text-2xl font-bold text-slate-900">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <button
                onClick={handleDownload}
                disabled={isGenerating || !selectedClient}
                className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Full Invoice...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download PDF Invoice
                  </>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintDocument(undefined, undefined, false)}
                  disabled={!selectedClient || effectiveReels.length === 0}
                  className="flex justify-center items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  title="Print official invoice statement"
                >
                  <Printer size={14} className="text-slate-400" />
                  Print Invoice
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintWorkSummary()}
                  disabled={!selectedClient || effectiveReels.length === 0}
                  className="flex justify-center items-center gap-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:bg-slate-100 text-slate-700 dark:text-slate-200 disabled:text-slate-400 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
                  title="Print work deliverables list without financial details"
                >
                  <ListChecks size={14} className="text-slate-600 dark:text-slate-300" />
                  Print Summary
                </button>
              </div>
            </div>
          </div>


        </div>

      {/* Invoice History & Email Actions Section */}
      <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Receipt size={20} className="text-indigo-600 dark:text-indigo-400" />
              Invoice History & Email Dispatch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              View generated cycle invoices and resend email notifications with itemized work details.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Local Invoice Search Bar */}
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Filter invoices or client..."
                className="w-full bg-slate-50 dark:bg-slate-900 text-sm pl-9 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {invoiceSearchQuery && (
                <button
                  onClick={() => setInvoiceSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {closedClientIds.size > 0 && (
              <button
                type="button"
                onClick={() => setShowClosed(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                  showClosed
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={showClosed ? "Hide invoices of closed clients" : "Show invoices of closed clients"}
              >
                <Archive size={12} />
                {showClosed ? 'Hide Closed' : `Show Closed (${closedClientIds.size})`}
              </button>
            )}

            <span className="text-sm font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg shrink-0">
              {displayedInvoices.length} Invoices
            </span>
          </div>
        </div>

        {displayedInvoices.length === 0 ? (
          <div className="py-12 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-500 dark:text-slate-400 space-y-3 max-w-md mx-auto my-4 bg-white dark:bg-slate-800 shadow-xs">
            <Receipt className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No invoices generated yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {clients.length === 0
                  ? "Add a client first, then create invoices with payment QR codes and breakdown."
                  : "Choose a client in the generator above and click 'Download PDF Invoice'."}
              </p>
            </div>
            {clients.length === 0 && onNavigateToClients && (
              <button
                type="button"
                onClick={onNavigateToClients}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Users size={13} /> Add First Client
              </button>
            )}
          </div>
        ) : (
          <>
            {totalDuplicateCount > 0 && (
              <div className="mb-4 p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{totalDuplicateCount} duplicate scheduled invoice(s)</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    detected for {Array.from(new Set(duplicateGroups.map(g => g.clientName))).join(', ')}
                  </span>
                </div>
                <button
                  onClick={handleCleanUpDuplicates}
                  disabled={isCleaningDuplicates}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors cursor-pointer border-none disabled:opacity-50 self-start sm:self-auto shrink-0"
                  title="Keep the original first invoice and safely remove duplicates"
                >
                  {isCleaningDuplicates ? 'Cleaning up...' : `Clean Up ${totalDuplicateCount} Duplicate(s)`}
                </button>
              </div>
            )}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Invoice No / Date</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Items / Summary</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Email Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                {displayedInvoices
                  .filter(inv => {
                    if (!invoiceSearchQuery.trim()) return true;
                    const q = invoiceSearchQuery.toLowerCase().trim();
                    const invNo = formatInvoiceNumber(inv, invoices).toLowerCase();
                    const itemsText = inv.reels ? inv.reels.map(r => r.title).join(' ').toLowerCase() : '';
                    return inv.clientName.toLowerCase().includes(q) ||
                      invNo.includes(q) ||
                      itemsText.includes(q);
                  })
                  .slice()
                  .sort((a, b) => b.date - a.date)
                  .map((inv) => {
                    const clientObj = clients.find(c => c.id === inv.clientId) || {
                      id: inv.clientId,
                      name: inv.clientName,
                      email: '',
                      phone: '',
                      defaultRate: 0,
                      createdAt: 0
                    };

                    const emailDetails = generateInvoiceEmailDetails(clientObj, inv, profile);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-4 font-mono text-sm text-slate-700 dark:text-slate-300">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span>{formatInvoiceNumber(inv, invoices)}</span>
                            {inv.isAutoGenerated && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                title="Auto-generated on scheduled date at 6:00 AM"
                              >
                                <Sparkles size={10} className="text-indigo-500" />
                                Auto 6 AM
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-900 dark:text-slate-100 text-sm">
                          <div>{inv.clientName}</div>
                          {clientObj.email && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{clientObj.email}</div>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                              {inv.invoiceType === 'monthly_retainer' ? '1 Retainer' : `${inv.reels.length} item(s)`}
                            </span>
                            {inv.invoiceType === 'monthly_retainer' && (
                              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                                Monthly Retainer
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                            {inv.reels.map(r => r.title).join(', ')}
                          </div>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100 text-base">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-center">
                          <StatusBadge
                            status={inv.status}
                            onClick={() => toggleInvoiceStatus(inv.id)}
                            title={`Click to mark as ${inv.status === 'Paid' ? 'Pending' : 'Paid & update last payment date'}`}
                          />
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditInvoice(inv)}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-slate-500 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Load invoice into generator to edit"
                            >
                              <Pencil size={13} /> Edit
                            </button>

                            <button
                              onClick={() => handleRedownloadPdf(inv)}
                              disabled={downloadingPdfId === inv.id}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Re-download PDF Invoice file"
                            >
                              {downloadingPdfId === inv.id ? (
                                <Loader2 size={13} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Download size={13} className="text-slate-600 dark:text-slate-300" />
                              )}
                              PDF
                            </button>

                            <button
                              onClick={() => handlePrintDocument(inv, clientObj, false)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Print official invoice statement"
                            >
                              <Printer size={13} className="text-slate-600 dark:text-slate-300" />
                              Print
                            </button>

                            <button
                              onClick={async () => {
                                const pdfFilename = `Invoice_${clientObj.name.replace(/\s+/g, '_')}_${inv.id.substring(0, 8)}.pdf`;
                                let pdfBlob: Blob | undefined = undefined;
                                try {
                                  pdfBlob = await generateOffscreenPdfBlob({
                                    invoice: inv,
                                    client: clientObj,
                                    profile,
                                    deliverables: inv.deliverables
                                  });
                                } catch (e) {
                                  console.warn("Could not pre-generate PDF blob for history invoice:", e);
                                }

                                setEmailModalData({
                                  isOpen: true,
                                  clientName: inv.clientName,
                                  clientEmail: clientObj.email || '',
                                  subject: emailDetails.subject,
                                  body: emailDetails.body,
                                  mailtoLink: emailDetails.mailtoLink,
                                  monthCycleStr: emailDetails.monthCycleStr,
                                  invoiceNo: inv.id.substring(0, 8).toUpperCase(),
                                  totalAmount: inv.totalAmount,
                                  pdfFilename: pdfFilename,
                                  pdfBlob: pdfBlob,
                                  invoiceObj: inv,
                                  clientObj: clientObj,
                                  gmailStatus: { sending: false }
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                              title="Send Invoice PDF via Gmail"
                            >
                              <Mail size={13} /> Send via Gmail
                            </button>

                            <a
                              href={emailDetails.mailtoLink}
                              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                              title="Open Default Mail App"
                            >
                              <Send size={13} />
                            </a>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`Subject: ${emailDetails.subject}\n\n${emailDetails.body}`);
                                alert(`Invoice email details for ${inv.clientName} copied to clipboard!`);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Copy Email Text to Clipboard"
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs transition-colors cursor-pointer border-none bg-transparent"
                              title="Delete Invoice"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              {invoices.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-800 dark:text-slate-200">
                  <tr>
                    <td colSpan={3} className="p-3.5 text-right font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Earned (Paid Invoices):
                    </td>
                    <td className="p-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      ₹{totalEarnedTillToday.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} className="p-3.5 text-slate-500 dark:text-slate-400 text-xs">
                      {paidInvoicesCount} Paid ({invoices.length} total)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

        {/* Last Bar: Total Earned Till Today */}
        <div className="mt-6 bg-slate-900 text-white rounded-xl p-5 md:p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
              <IndianRupee size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-md">
                  Lifetime Revenue
                </span>
                <span className="text-xs text-slate-400">Paid Invoices Till Today</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-white">
                Total Earned Till Today:{' '}
                <span className="text-indigo-400">₹{totalEarnedTillToday.toLocaleString('en-IN')}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 relative z-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Paid Invoices</span>
              <span className="text-base font-bold text-white">
                {paidInvoicesCount} <span className="text-xs font-normal text-slate-400">of {invoices.length}</span>
              </span>
            </div>
            {pendingAmount > 0 && (
              <div className="text-left md:text-right border-l border-slate-800 pl-4 sm:pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pending Clearance</span>
                <span className="text-base font-bold text-white">
                  ₹{pendingAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className="text-left md:text-right border-l border-slate-800 pl-4 sm:pl-6">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Invoiced</span>
              <span className="text-base font-bold text-white">
                ₹{totalInvoicedAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Email Sent / Prepared Modal */}
      {emailModalData && emailModalData.isOpen && (
        <div
          onClick={() => setEmailModalData(null)}
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                  <MailCheck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Invoice Email & Gmail Delivery for {emailModalData.clientName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cycle: <span className="font-semibold text-slate-700">{emailModalData.monthCycleStr}</span> • Amount: <span className="font-bold text-slate-900">₹{emailModalData.totalAmount.toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEmailModalData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Gmail Live Status Banner */}
            {emailModalData.gmailStatus?.sending ? (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2.5 font-medium">
                <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" />
                <span>Sending Invoice PDF directly to <strong>{emailModalData.clientEmail || 'client'}</strong> via Gmail API...</span>
              </div>
            ) : emailModalData.gmailStatus?.success ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="text-indigo-600 w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold">Invoice PDF successfully sent via Gmail!</p>
                    <p className="text-[11px] text-slate-600">Delivered to <strong>{emailModalData.clientEmail}</strong> with PDF attached.</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-medium px-2 py-0.5 rounded">Gmail API</span>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" /> Gmail Automatic Delivery Status:
                  </p>
                  {emailModalData.gmailStatus?.error && (
                    <span className="text-[10px] text-red-600 font-mono font-semibold max-w-xs truncate" title={emailModalData.gmailStatus.error}>
                      {emailModalData.gmailStatus.error}
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {emailModalData.clientEmail
                    ? "Click 'Send Invoice PDF via Gmail' below to authorize Gmail and send the attached PDF directly to your client."
                    : "Please enter your client's email address below, then click 'Send Invoice PDF via Gmail'."}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Client Email Address *</label>
                  <input
                    type="email"
                    value={emailModalData.clientEmail}
                    onChange={e => setEmailModalData({ ...emailModalData, clientEmail: e.target.value })}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                {emailModalData.pdfFilename && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Attached Document</span>
                      <span className="text-[11px] text-slate-500 font-medium">Included in Gmail Send</span>
                    </label>
                    <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono text-slate-700 h-[38px]">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <FileText size={14} className="text-rose-500 shrink-0" />
                        <span className="truncate">{emailModalData.pdfFilename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {emailModalData.pdfBlob && (
                          <button
                            type="button"
                            onClick={() => {
                              if (emailModalData.pdfBlob) {
                                const url = URL.createObjectURL(emailModalData.pdfBlob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = emailModalData.pdfFilename || 'Invoice.pdf';
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                            className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-sans text-[11px] font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer"
                            title="Download Invoice PDF file"
                          >
                            <Download size={12} className="text-indigo-600" /> Save PDF
                          </button>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded">
                          PDF
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Subject</label>
                <input
                  type="text"
                  value={emailModalData.subject}
                  onChange={e => setEmailModalData({ ...emailModalData, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Email Message Body</label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Subject: ${emailModalData.subject}\n\n${emailModalData.body}`);
                      alert("Invoice email content copied to clipboard!");
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Copy size={12} /> Copy Text
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={emailModalData.body}
                  onChange={e => setEmailModalData({ ...emailModalData, body: e.target.value })}
                  className="w-full p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Target: <strong className="text-slate-700">{emailModalData.clientEmail || 'No email entered'}</strong>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setEmailModalData(null)}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>

                <a
                  href={emailModalData.mailtoLink}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Open Default Mail App"
                >
                  <Send size={15} />
                </a>

                <button
                  type="button"
                  onClick={handleSendGmailManual}
                  disabled={isSendingGmail || emailModalData.gmailStatus?.sending}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  {isSendingGmail || emailModalData.gmailStatus?.sending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending via Gmail...
                    </>
                  ) : (
                    <>
                      <Mail size={14} />
                      Send Invoice PDF via Gmail
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const modalInv = invoices.find(i => i.id === paymentModalState.invoiceId);
        return (
          <PaymentDateModal
            isOpen={paymentModalState.isOpen}
            onClose={() => setPaymentModalState({ invoiceId: null, isOpen: false })}
            onConfirm={(timestamp) => handleConfirmPaymentDate(paymentModalState.invoiceId!, timestamp)}
            onUnmark={() => handleConfirmPaymentDate(paymentModalState.invoiceId!, null)}
            defaultDate={modalInv?.lastPaymentDate}
            isAlreadyPaid={modalInv?.status === 'Paid'}
            invoiceNumber={formatInvoiceNumber(invoices.find(i => i.id === paymentModalState.invoiceId) || { id: paymentModalState.invoiceId || "" }, invoices)}
          />
        );
      })()}

      <ScheduleInvoiceModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        clients={clients}
        workItems={workItems}
        invoices={invoices}
        initialClientId={selectedClientId || undefined}
        onUpdateClient={updateClient}
        onAddInvoice={addInvoice}
        onUpdateWorkItem={updateWorkItem}
      />
    </div>
  );
}
