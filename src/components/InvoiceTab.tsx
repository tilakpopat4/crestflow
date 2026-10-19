import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Client, Reel, Invoice, WorkItem, UserProfile, InvoiceDeliverable } from '../types';
import { Plus, Trash2, Download, Receipt, FileCheck, Mail, Send, Copy, X, Check, MailCheck, CheckCircle2, AlertCircle, Loader2, FileText, Search, Calculator, Divide, Coins, History, Pencil, Printer, ListChecks, IndianRupee, Archive, Clock, Sparkles, Calendar, Users } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { User } from 'firebase/auth';
import { generateUUID } from '../lib/utils';
import { generateInvoiceEmailDetails } from '../lib/paymentUtils';
import Logo from './Logo';
import { QRCodeSVG } from 'qrcode.react';
import { sendEmailWithPdfAttachment, acquireGmailAccessToken } from '../lib/gmailService';
import PaymentDateModal from './PaymentDateModal';
import ScheduleInvoiceModal from './ScheduleInvoiceModal';
import { executeAutoInvoiceCheck, findDuplicateAutoInvoices } from '../lib/autoInvoiceService';
import { formatLocalDateToYMD } from '../lib/dateUtils';
import StatusBadge from './StatusBadge';
import { buildUpiPaymentUri, generateUpiQrCodeSvg, generateUpiQrCodeDataUrl } from '../lib/upiQr';
import { renderDocumentHtml, printDocumentHtml, generateOffscreenPdfBlob } from '../lib/invoiceRenderer';

export { buildUpiPaymentUri, generateUpiQrCodeSvg, generateUpiQrCodeDataUrl };
export { renderDocumentHtml, printDocumentHtml, generateOffscreenPdfBlob };

interface InvoiceTabProps {
  user: User | null;
  profile: UserProfile | null;
  initialSearchQuery?: string;
  onNavigateToClients?: () => void;
}

export default function InvoiceTab({ user, profile, initialSearchQuery = '', onNavigateToClients }: InvoiceTabProps) {
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

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>(initialSearchQuery);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setInvoiceSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
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
      date: w.date
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
    updateClient
  });
  autoInvoiceRef.current = {
    clients,
    workItems,
    invoices,
    addInvoice,
    updateWorkItem,
    updateClient
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

    if (!window.confirm(`Delete Invoice #${inv.id.substring(0, 8).toUpperCase()} for ${inv.clientName}?`)) {
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

  // Dynamic preview scaling to fit any screen perfectly with zero overlapping & no content truncation
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const invoiceCaptureRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.75);
  const [actualCaptureHeight, setActualCaptureHeight] = useState<number>(1123);
  const [isZoomMode, setIsZoomMode] = useState<boolean>(false);

  useEffect(() => {
    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const containerWidth = previewContainerRef.current.clientWidth;
      // Responsive padding: 24px on mobile phones, 48px on tablets and desktop
      const padding = window.innerWidth < 640 ? 24 : 48;
      const availableWidth = Math.max(160, containerWidth - padding);
      const a4Width = 794; // 210mm in px at 96 DPI
      const computedScale = Math.min(1, Math.max(0.2, availableWidth / a4Width));
      setPreviewScale(computedScale);

      if (invoiceCaptureRef.current) {
        setActualCaptureHeight(Math.max(1123, invoiceCaptureRef.current.offsetHeight));
      }
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      ro.observe(previewContainerRef.current);
    }
    if (invoiceCaptureRef.current) {
      ro.observe(invoiceCaptureRef.current);
    }
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

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

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedClientId(newId);
    const clientObj = clients.find(c => c.id === newId);
    if (clientObj) {
      if (clientObj.paymentBasis === 'monthly_retainer' || (clientObj.monthlyRetainerAmount && clientObj.monthlyRetainerAmount > 0)) {
        setInvoiceBillingMode('monthly_retainer');
        setMonthlyRetainerInput(String(clientObj.monthlyRetainerAmount || clientObj.defaultRate || ''));
        const monthStr = dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
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
      const invNo = inv.id.length > 8 ? `INV-${inv.id.substring(0, 8).toUpperCase()}` : inv.id;
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
    const isWorkSummary = hideFinanceOverride !== undefined ? hideFinanceOverride : previewMode === 'work-only';
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
        const invShortId = targetInvoice.id ? targetInvoice.id.substring(0, 8) : 'INV';
        const res = await generateUpiQrCodeDataUrl(upiId, senderName, targetInvoice.totalAmount, `Payment for Invoice #${invShortId}`);
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
        date: d.date
      }));

      const newInvoice: Invoice = {
        id: generateUUID(),
        date: Date.now(),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
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
    return <div className="p-8 max-w-[1600px] mx-auto text-center py-20"><div className="animate-pulse flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div></div></div>;
  }

  const effectiveScale = isZoomMode ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.9 : 1) : previewScale;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Column - Form */}
        <div className="xl:col-span-5 space-y-6">
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
            {/* Billing Mode Switcher */}
            {selectedClient?.paymentBasis === 'monthly_retainer' ? (
              <div className="mb-6 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Monthly Retainer Client
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Single flat retainer fee per billing cycle.
                    </span>
                  </div>
                </div>
                {selectedClient?.monthlyRetainerAmount && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 shrink-0">
                    ₹{selectedClient.monthlyRetainerAmount.toLocaleString('en-IN')}/mo
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-6 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setInvoiceBillingMode('per_reel')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    invoiceBillingMode === 'per_reel'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Per Reel / Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceBillingMode('monthly_retainer');
                    if (!monthlyRetainerInput && selectedClient?.monthlyRetainerAmount) {
                      setMonthlyRetainerInput(String(selectedClient.monthlyRetainerAmount));
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    invoiceBillingMode === 'monthly_retainer'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Monthly Retainer</span>
                </button>
              </div>
            )}

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

        {/* Right Column - A4 Preview Wrapper */}
        <div 
          ref={previewContainerRef}
          className="xl:col-span-7 bg-slate-200 dark:bg-slate-900/80 p-3 sm:p-5 md:p-6 rounded-xl flex flex-col items-center shadow-inner min-h-[400px] border border-slate-300 dark:border-slate-800 relative w-full overflow-x-auto touch-pan-x touch-pan-y scrollbar-thin"
        >
          
          {/* Preview Mode Switcher & Quick Print Header */}
          <div className="w-full max-w-[210mm] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Preview:</span>
              <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewMode('standard')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'standard'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Receipt size={13} /> Full Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('work-only')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'work-only'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ListChecks size={13} /> Deliverables
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsZoomMode(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    !isZoomMode
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Fit to screen width"
                >
                  Fit ({Math.round(previewScale * 100)}%)
                </button>
                <button
                  type="button"
                  onClick={() => setIsZoomMode(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isZoomMode
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Actual size with horizontal and vertical scroll"
                >
                  100% Zoom
                </button>
              </div>

              <button
                type="button"
                onClick={() => handlePrintDocument()}
                disabled={!selectedClient || effectiveReels.length === 0}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                title={previewMode === 'work-only' ? 'Print Work Summary' : 'Print Invoice'}
              >
                <Printer size={13} className="text-slate-400" /> {previewMode === 'work-only' ? 'Print Summary' : 'Print Invoice'}
              </button>
            </div>
          </div>

          {/* Scaled A4 Preview Box that takes dynamic measured dimensions and prevents truncation */}
          <div 
            className="w-full flex justify-center items-start transition-all duration-200 ease-out py-1"
            style={{
              height: `${Math.round(actualCaptureHeight * effectiveScale)}px`,
              minHeight: `${Math.round(actualCaptureHeight * effectiveScale)}px`
            }}
          >
            <div
              style={{
                width: `${Math.round(794 * effectiveScale)}px`,
                height: `${Math.round(actualCaptureHeight * effectiveScale)}px`,
                position: 'relative',
                overflow: 'visible'
              }}
              className="shadow-2xl rounded-sm shrink-0"
            >
              {/* The actual A4 element captured for live preview */}
              <div
                ref={invoiceCaptureRef}
                id="invoice-preview-capture"
                className="bg-white relative flex flex-col justify-between"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '16mm 18mm',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
              <div>
                {/* Top Accent Strip & Header */}
                <div className="flex justify-between items-start border-b-1.5 border-slate-900 pb-5 mb-6">
                  {/* Left Branding */}
                  <div className="w-2/3 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Logo className="w-9 h-9 rounded-lg shrink-0 shadow-2xs" />
                      <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                          {profile?.name || user?.displayName || 'Video Production Studio'}
                        </h1>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                          {profile?.professionalTitle || profile?.servicesDescription || 'Professional Video Editing & Content Creation'}
                        </p>
                      </div>
                    </div>
                    {profile?.phone && (
                      <p className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Direct:</span>
                        <span className="text-slate-700 font-medium">{profile.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Right Invoice / Work Summary Title */}
                  <div className="w-1/3 text-right flex flex-col items-end">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-wider uppercase">
                      {previewMode === 'work-only' ? 'WORK SUMMARY' : 'INVOICE'}
                    </h2>
                    <div className="inline-block bg-slate-100 rounded px-2.5 py-0.5 mt-1.5">
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        #{previewMode === 'work-only' ? 'WRK' : 'INV'}-{String(invoices.length + 1).padStart(4, '0')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5">
                      Issue Date: <span className="font-semibold text-slate-800">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Billed To / Prepared For & Summary Overview */}
                <div className="grid grid-cols-2 gap-6 p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-6">
                  {/* Client Info */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                      {previewMode === 'work-only' ? 'Prepared For' : 'Billed To'}
                    </span>
                    {selectedClient ? (
                      <div>
                        <p className="font-bold text-sm text-slate-900">{selectedClient.name}</p>
                        {selectedClient.phone && (
                          <p className="text-xs text-slate-600 font-medium mt-0.5">Ph: {selectedClient.phone}</p>
                        )}
                        {selectedClient.email && (
                          <p className="text-xs text-slate-600 font-medium truncate mt-0.5">Email: {selectedClient.email}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Select a client to preview {previewMode === 'work-only' ? 'work details' : 'invoice details'}
                      </div>
                    )}
                  </div>

                  {/* Overview */}
                  <div className="text-right flex flex-col justify-center">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-end gap-3 items-center">
                        <span className="text-slate-500 font-medium">{previewMode === 'work-only' ? 'Work Period:' : 'Billing Period:'}</span>
                        <span className="font-semibold text-slate-900">
                          {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {previewMode === 'work-only' ? (
                        <div className="flex justify-end gap-3 items-center">
                          <span className="text-slate-500 font-medium">Total Deliverables:</span>
                          <span className="font-bold text-slate-900">
                            {effectiveReels.reduce((s, r) => s + (r.quantity || 1), 0)} Item(s)
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end gap-3 items-center">
                            <span className="text-slate-500 font-medium">Payment Terms:</span>
                            <span className="font-semibold text-slate-900">Due on Receipt</span>
                          </div>
                          <div className="flex justify-end gap-3 items-center">
                            <span className="text-slate-500 font-medium">Settlement:</span>
                            <span className="font-medium text-slate-700">UPI / Bank Transfer</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-t-1.5 border-b border-slate-900 bg-slate-50/70 text-slate-700">
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 w-10 text-center">#</th>
                        {invoiceBillingMode === 'monthly_retainer' && (
                          <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 w-20 text-left">Date</th>
                        )}
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500">
                          {previewMode === 'work-only' || invoiceBillingMode === 'monthly_retainer' ? 'Deliverable Description' : 'Item Description / Service'}
                        </th>
                        <th className={`py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-center ${previewMode === 'work-only' || invoiceBillingMode === 'monthly_retainer' ? 'w-16' : 'w-14'}`}>
                          Qty
                        </th>
                        {previewMode !== 'work-only' && invoiceBillingMode !== 'monthly_retainer' && (
                          <>
                            <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right w-24">Rate</th>
                            <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right w-28">Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceBillingMode === 'monthly_retainer' ? (
                        currentBillingDeliverables.length > 0 ? (
                          currentBillingDeliverables.map((d, idx) => (
                            <tr key={d.id || idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-3 text-xs font-mono font-medium text-slate-400 text-center">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                                {d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">
                                <div>{d.title || <span className="text-slate-400 italic font-normal">Deliverable...</span>}</div>
                                {d.videoUrl && (
                                  <div className="mt-0.5">
                                    <a
                                      href={d.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                                      title={d.videoUrl}
                                    >
                                      <span>View Deliverable</span>
                                      <span className="text-[10px]">↗</span>
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-center font-medium text-slate-700">
                                {d.quantity || 1}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-xs font-mono font-medium text-slate-400 text-center">01</td>
                            <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">
                              <div>{monthlyServiceDescription || 'Monthly Video Editing & Creative Retainer'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-center font-medium text-slate-700">
                              1 Month
                            </td>
                          </tr>
                        )
                      ) : (
                        effectiveReels.map((reel, idx) => (
                          <tr key={reel.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-xs font-mono font-medium text-slate-400 text-center">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">
                              <div>
                                {reel.title || <span className="text-slate-400 italic font-normal">Item description...</span>}
                                {reel.subClientName && (
                                  <span className="text-[11px] font-normal text-slate-500 ml-1.5">({reel.subClientName})</span>
                                )}
                              </div>
                              {reel.videoUrl && (
                                <div className="mt-0.5">
                                  <a
                                    href={reel.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                                    title={reel.videoUrl}
                                  >
                                    <span>View Deliverable</span>
                                    <span className="text-[10px]">↗</span>
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-center font-medium text-slate-700">
                              {reel.quantity}
                            </td>
                            {previewMode !== 'work-only' && (
                              <>
                                <td className="py-2.5 px-3 text-xs text-right font-normal text-slate-600 tabular-nums">
                                  ₹{reel.rate.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-right font-semibold text-slate-900 tabular-nums">
                                  ₹{(reel.quantity * reel.rate).toLocaleString('en-IN')}
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {invoiceBillingMode === 'monthly_retainer' && previewMode !== 'work-only' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 flex justify-between items-center text-xs avoid-break">
                    <div>
                      <span className="font-semibold text-slate-900 block">Monthly Retainer Package</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Fixed monthly fee covering all creative deliverables across this billing cycle.
                      </p>
                    </div>
                    <span className="text-slate-600 font-medium">
                      {currentBillingDeliverables.length} Deliverable(s) Included
                    </span>
                  </div>
                )}

                {/* Totals Section (For Full Invoice) OR Deliverables Summary (For Work Summary) */}
                {previewMode === 'work-only' ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-6 flex justify-between items-center text-xs avoid-break">
                    <div>
                      <span className="font-semibold text-slate-900 block">Deliverables Summary</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Completed for <strong className="text-slate-800">{selectedClient?.name || 'Client'}</strong> ({dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Current Cycle'})
                      </p>
                    </div>
                    <span className="text-slate-700 font-semibold">
                      Completed ({invoiceBillingMode === 'monthly_retainer' ? currentBillingDeliverables.length : effectiveReels.reduce((s, r) => s + (r.quantity || 1), 0)} items)
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-end mb-6 avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="w-72 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center py-1 text-slate-600">
                        <span className="font-medium text-slate-500">
                          {invoiceBillingMode === 'monthly_retainer' ? 'Monthly Retainer Fee' : 'Subtotal'}
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums">₹{total.toLocaleString('en-IN')}</span>
                      </div>

                      {extraCost > 0 && (
                        <div className="flex justify-between items-center py-1 text-slate-700">
                          <span className="font-medium text-slate-600">
                            Extra Cost {extraCostDescription ? `(${extraCostDescription})` : ''}
                          </span>
                          <span className="font-semibold tabular-nums">+₹{extraCost.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between items-center py-1 text-red-600">
                          <span className="font-medium">
                            Deduction {discountDescription ? `(${discountDescription})` : ''}
                          </span>
                          <span className="font-semibold tabular-nums">-₹{discount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-baseline pt-2.5 border-t-1.5 border-slate-900 mt-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 block">Total Due</span>
                          <span className="text-[10px] text-slate-500 font-normal">Due on Receipt</span>
                        </div>
                        <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">₹{grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Details & QR Code (Full Invoice) OR Verification Statement (Work Summary) */}
              <div className="border-t-1.5 border-slate-900 pt-5 mt-6 avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {previewMode === 'work-only' ? (
                  <div className="flex justify-between items-start gap-6">
                    <div className="w-2/3 space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                        Verification & Delivery Confirmation
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        This statement confirms completion and official delivery of the listed creative deliverables for the specified date period.
                      </p>
                    </div>
                    <div className="w-1/3 text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prepared By</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.name || user?.displayName || 'Video Editor'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-5 items-start">
                    <div className="col-span-8">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                        Payment Settlement Details
                      </span>
                      <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs text-slate-800">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Method</span>
                            <span className="font-medium text-slate-900">UPI / Instant Bank Transfer</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">UPI ID</span>
                            <span className="font-mono font-semibold text-slate-900">{activeUpi}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Payee Beneficiary</span>
                            <span className="font-medium text-slate-900">{profile?.name || user?.displayName || 'Video Editor'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Terms</span>
                            <span className="font-medium text-slate-800">Due Upon Receipt (Net 7)</span>
                          </div>
                          {profile?.accountNumber && (
                            <>
                              <div>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Bank Account No</span>
                                <span className="font-mono font-semibold text-slate-900">{profile.accountNumber}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase block">IFSC / Bank</span>
                                <span className="font-semibold text-slate-900">{profile.ifscCode || ''} {profile.bankName ? `(${profile.bankName})` : ''}</span>
                              </div>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/60 mt-2">
                          Please process payment within 7 days of receiving this invoice.
                        </p>
                      </div>
                    </div>

                    {/* Right Column: QR Code */}
                    <div className="col-span-4 flex flex-col items-center justify-center">
                      <div className="bg-white p-2.5 border border-slate-200 rounded-lg flex flex-col items-center shadow-2xs">
                        {activeUpiUri ? (
                          <div className="p-0.5 bg-white rounded flex items-center justify-center">
                            <QRCodeSVG
                              value={activeUpiUri}
                              size={88}
                              level="M"
                              includeMargin={false}
                              bgColor="#ffffff"
                              fgColor="#0f172a"
                              className="w-[88px] h-[88px] block"
                            />
                          </div>
                        ) : (
                          <div className="w-[88px] h-[88px] bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 font-medium">
                            Scan to Pay
                          </div>
                        )}
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1.5">
                          Scan via UPI
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Signature & Verification Note */}
                <div className="mt-5 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>{previewMode === 'work-only' ? 'Official Work Delivery Summary • CrestFlow' : 'Official Electronic Invoice Statement • CrestFlow'}</span>
                  <span>Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
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
                className="w-full bg-slate-50 dark:bg-slate-900 text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
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

            <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded shrink-0">
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
                  <th className="p-3.5">Invoice No / Date</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Items / Summary</th>
                  <th className="p-3.5 text-right">Total Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Email Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                {displayedInvoices
                  .filter(inv => {
                    if (!invoiceSearchQuery.trim()) return true;
                    const q = invoiceSearchQuery.toLowerCase().trim();
                    const invNo = inv.id.substring(0, 8).toLowerCase();
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
                        <td className="p-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span>#{inv.id.substring(0, 8).toUpperCase()}</span>
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
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-900 dark:text-slate-100">
                          <div>{inv.clientName}</div>
                          {clientObj.email && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">{clientObj.email}</div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
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
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                            {inv.reels.map(r => r.title).join(', ')}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 text-center">
                          <StatusBadge
                            status={inv.status}
                            onClick={() => toggleInvoiceStatus(inv.id)}
                            title={`Click to mark as ${inv.status === 'Paid' ? 'Pending' : 'Paid & update last payment date'}`}
                          />
                        </td>
                        <td className="p-3.5 text-right">
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
            invoiceNumber={paymentModalState.invoiceId?.substring(0, 8).toUpperCase()}
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
