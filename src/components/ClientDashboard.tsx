import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Client, Invoice, WorkItem, SubClient, UserProfile } from '../types';
import { 
  ArrowLeft, Calendar, Phone, Mail, Edit3, CheckCircle2, Clock, 
  IndianRupee, Plus, AlertTriangle, Send, FileText, ClipboardList,
  Sparkles, ShieldAlert, DollarSign, Copy, ExternalLink, Play, Download,
  Users, Tag, Trash2, Edit2, Filter, MessageSquare, Archive, UploadCloud, X
} from 'lucide-react';
import { User } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import { exportClientCSV } from '../lib/csvExport';
import { 
  getPaymentStatusInfo, 
  calculateClientFinancials, 
  generateWhatsAppReminder,
  generateEmailReminder,
  generateInvoiceEmailDetails,
  triggerBrowserOverdueAlert
} from '../lib/paymentUtils';
import { generateUUID, extractVideoUrl, getDriveDirectImageUrl } from '../lib/utils';
import GoogleDriveUploadModal from './GoogleDriveUploadModal';
import MediaEmbedModal from './MediaEmbedModal';
import { DateInput } from './DateInput';
import { formatLocalDateToYMD, parseYMDToTimestamp } from '../lib/dateUtils';
import ScheduleInvoiceModal from './ScheduleInvoiceModal';
import { getAutoInvoiceScheduleInfo } from '../lib/autoInvoiceService';
import StatusBadge from './StatusBadge';

interface ClientDashboardProps {
  client: Client;
  user: User | null;
  onBack: () => void;
  onEditClient: (client: Client) => void;
}

export default function ClientDashboard({ client, user, onBack, onEditClient }: ClientDashboardProps) {
  const { data: invoices, addOrUpdateItem: updateInvoice } = useFirestore<Invoice>('invoices', user?.uid);
  const { data: workItems, addOrUpdateItem: updateWorkItem, removeItem: removeWorkItem } = useFirestore<WorkItem>('workItems', user?.uid);
  const { addOrUpdateItem: updateClient } = useFirestore<Client>('clients', user?.uid);
  const { data: profiles } = useFirestore<UserProfile>('profiles', user?.uid);

  const profile = profiles[0] || null;
  const [copiedReviewLink, setCopiedReviewLink] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [embedModalData, setEmbedModalData] = useState<{ isOpen: boolean; url: string; title: string; clientName?: string } | null>(null);

  const handleCopyReviewLink = () => {
    if (!user) return;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const nameParam = encodeURIComponent(profile?.name || user.displayName || 'Video Editor');
    const clientNameParam = encodeURIComponent(client.name);
    const link = `${baseUrl}?feedback=true&uid=${user.uid}&name=${nameParam}&clientId=${client.id}&clientName=${clientNameParam}`;
    
    navigator.clipboard.writeText(link).then(() => {
      setCopiedReviewLink(true);
      setTimeout(() => setCopiedReviewLink(false), 2000);
    });
  };

  const [activeTab, setActiveTab] = useState<'work' | 'invoices' | 'settings'>('work');
  const shouldReduceMotion = useReducedMotion();
  
  // Payment Date update state
  const [isUpdatingPaymentDate, setIsUpdatingPaymentDate] = useState(false);
  const [newPaymentDate, setNewPaymentDate] = useState<string>(
    formatLocalDateToYMD(new Date())
  );
  const [markPendingAsPaid, setMarkPendingAsPaid] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const scheduleInfo = getAutoInvoiceScheduleInfo(client);

  const openPaymentModal = () => {
    setNewPaymentDate(formatLocalDateToYMD(new Date()));
    setIsUpdatingPaymentDate(true);
  };

  // Sub-Client management state
  const [isSubClientsModalOpen, setIsSubClientsModalOpen] = useState(false);
  const [editingSubClientId, setEditingSubClientId] = useState<string | null>(null);
  const [subClientForm, setSubClientForm] = useState({ name: '', code: '', notes: '', logoUrl: '', instagram: '', email: '', phone: '', clientFrom: '', workExperience: '' });
  const [subClientFilter, setSubClientFilter] = useState<'all' | 'direct' | string>('all');

  const handleSaveSubClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subClientForm.name.trim()) return alert("Please enter a sub-client name.");

    const existingSubs = client.subClients || [];
    let updatedSubs: SubClient[];

    if (editingSubClientId) {
      updatedSubs = existingSubs.map(sc => 
        sc.id === editingSubClientId 
          ? { 
              ...sc, 
              name: subClientForm.name.trim(), 
              code: subClientForm.code.trim() || undefined, 
              notes: subClientForm.notes.trim() || undefined,
              logoUrl: subClientForm.logoUrl.trim() || undefined,
              instagram: subClientForm.instagram.trim() || undefined,
              email: subClientForm.email.trim() || undefined,
              phone: subClientForm.phone.trim() || undefined,
              clientFrom: subClientForm.clientFrom.trim() || undefined,
              workExperience: subClientForm.workExperience.trim() || undefined
            }
          : sc
      );
    } else {
      const newSub: SubClient = {
        id: generateUUID(),
        name: subClientForm.name.trim(),
        code: subClientForm.code.trim() || undefined,
        notes: subClientForm.notes.trim() || undefined,
        logoUrl: subClientForm.logoUrl.trim() || undefined,
        instagram: subClientForm.instagram.trim() || undefined,
        email: subClientForm.email.trim() || undefined,
        phone: subClientForm.phone.trim() || undefined,
        clientFrom: subClientForm.clientFrom.trim() || undefined,
        workExperience: subClientForm.workExperience.trim() || undefined,
        createdAt: Date.now()
      };
      updatedSubs = [...existingSubs, newSub];
    }

    try {
      await updateClient({ ...client, subClients: updatedSubs });
      setSubClientForm({ name: '', code: '', notes: '', logoUrl: '', instagram: '', email: '', phone: '', clientFrom: '', workExperience: '' });
      setEditingSubClientId(null);
    } catch (err: any) {
      console.error(err);
      alert("Error saving sub-client: " + (err?.message || String(err)));
    }
  };

  const handleEditSubClientClick = (sc: SubClient) => {
    setEditingSubClientId(sc.id);
    setSubClientForm({
      name: sc.name,
      code: sc.code || '',
      notes: sc.notes || '',
      logoUrl: sc.logoUrl || '',
      instagram: sc.instagram || '',
      email: sc.email || '',
      phone: sc.phone || '',
      clientFrom: sc.clientFrom || '',
      workExperience: sc.workExperience || ''
    });
  };

  const handleDeleteSubClientClick = async (subId: string, subName: string) => {
    if (confirm(`Are you sure you want to delete sub-client "${subName}"? Work items assigned to this sub-client will remain recorded.`)) {
      const updatedSubs = (client.subClients || []).filter(sc => sc.id !== subId);
      await updateClient({ ...client, subClients: updatedSubs });
      if (editingSubClientId === subId) {
        setEditingSubClientId(null);
        setSubClientForm({ name: '', code: '', notes: '', logoUrl: '', instagram: '', email: '', phone: '', clientFrom: '', workExperience: '' });
      }
    }
  };

  // New Work Log modal state inside client dashboard
  const [isWorkFormOpen, setIsWorkFormOpen] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workFormData, setWorkFormData] = useState({
    subClientId: '',
    description: '',
    videoUrl: '',
    quantity: '1',
    rate: String(client.defaultRate),
    date: formatLocalDateToYMD(new Date())
  });

  // Calculate financials & payment status
  const clientInvoices = invoices.filter(inv => inv.clientId === client.id);
  const clientWorkItems = workItems.filter(item => item.clientId === client.id);
  
  const financials = calculateClientFinancials(client.id, invoices, workItems);
  const statusInfo = getPaymentStatusInfo(client, invoices, workItems);

  // Filter work items based on selected subclient tab/filter
  const filteredClientWorkItems = clientWorkItems.filter(item => {
    if (subClientFilter === 'all') return true;
    if (subClientFilter === 'direct') return !item.subClientId;
    return item.subClientId === subClientFilter;
  });

  // Save new payment date
  const handleSavePaymentDate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedTimestamp = parseYMDToTimestamp(newPaymentDate);
      const updatedClient: Client = {
        ...client,
        lastPaymentDate: selectedTimestamp
      };

      await updateClient(updatedClient);

      // Optionally mark pending invoices for this client as Paid
      if (markPendingAsPaid) {
        for (const inv of financials.pendingInvoices) {
          await updateInvoice({ ...inv, status: 'Paid' });
        }
      }

      setIsUpdatingPaymentDate(false);
      alert("Payment date updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update payment date: " + (err?.message || String(err)));
    }
  };

  const handleStartEditWork = (item: WorkItem) => {
    setEditingWorkId(item.id);
    setWorkFormData({
      subClientId: item.subClientId || '',
      description: item.description,
      videoUrl: item.videoUrl || '',
      quantity: String(item.quantity),
      rate: String(item.rate),
      date: formatLocalDateToYMD(item.date)
    });
    setIsWorkFormOpen(true);
  };

  const handleCancelWorkForm = () => {
    setEditingWorkId(null);
    setWorkFormData({
      subClientId: '',
      description: '',
      videoUrl: '',
      quantity: '1',
      rate: String(client.defaultRate),
      date: formatLocalDateToYMD(new Date())
    });
    setIsWorkFormOpen(false);
  };

  // Add or update work log for this specific client
  const handleSaveWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isMonthlyClient = client.paymentBasis === 'monthly_retainer';
      const selectedRate = isMonthlyClient ? 0 : (Number(workFormData.rate) || client.defaultRate);
      const selectedQty = Number(workFormData.quantity);
      const selectedDate = parseYMDToTimestamp(workFormData.date);
      const trimmedVideoUrl = workFormData.videoUrl.trim() || undefined;

      // Find subclient details if selected
      const selectedSub = (client.subClients || []).find(sc => sc.id === workFormData.subClientId);
      const subClientId = selectedSub ? selectedSub.id : undefined;
      const subClientName = selectedSub ? selectedSub.name : undefined;

      if (editingWorkId) {
        const existing = workItems.find(w => w.id === editingWorkId);
        if (existing) {
          const updatedWork: WorkItem = {
            ...existing,
            subClientId,
            subClientName,
            description: workFormData.description,
            videoUrl: trimmedVideoUrl,
            quantity: selectedQty,
            rate: selectedRate,
            date: selectedDate
          };

          // If item is invoiced, update the corresponding invoice reel details as well
          if (existing.status === 'Invoiced' && existing.invoiceId) {
            const invoice = invoices.find(inv => inv.id === existing.invoiceId);
            if (invoice && invoice.reels) {
              let replaced = false;
              const updatedReels = invoice.reels.map((reel: any) => {
                if (!replaced && reel.title === existing.description && reel.quantity === existing.quantity && reel.rate === existing.rate) {
                  replaced = true;
                  return {
                    ...reel,
                    title: workFormData.description,
                    quantity: selectedQty,
                    rate: selectedRate,
                    subClientId,
                    subClientName,
                    videoUrl: trimmedVideoUrl
                  };
                }
                return reel;
              });

              const newSubtotal = updatedReels.reduce((sum: number, r: any) => sum + (r.quantity * r.rate), 0);
              const discount = invoice.discountAmount || 0;
              const newTotal = Math.max(0, newSubtotal - discount);

              await updateInvoice({
                ...invoice,
                reels: updatedReels,
                totalAmount: newTotal
              });
            }
          }

          await updateWorkItem(updatedWork);
        }
      } else {
        const newWork: WorkItem = {
          id: generateUUID(),
          clientId: client.id,
          subClientId,
          subClientName,
          description: workFormData.description,
          videoUrl: trimmedVideoUrl,
          quantity: selectedQty,
          rate: selectedRate,
          date: selectedDate,
          status: 'Uninvoiced',
          createdAt: Date.now()
        };

        await updateWorkItem(newWork);
      }

      handleCancelWorkForm();
    } catch (err: any) {
      console.error(err);
      alert("Error saving work item: " + (err?.message || String(err)));
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (confirm("Are you sure you want to delete this work item?")) {
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Action Bar with Back button and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all hover:bg-slate-50 dark:hover:bg-slate-700 w-fit cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyReviewLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              copiedReviewLink 
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400' 
                : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50'
            }`}
            title="Copy feedback request link for this client"
          >
            {copiedReviewLink ? (
              <>
                <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" /> Link Copied!
              </>
            ) : (
              <>
                <MessageSquare size={13} /> Request Review
              </>
            )}
          </button>

          <button
            onClick={() => setIsSubClientsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title="Add or edit sub-clients for this client"
          >
            <Users size={13} /> Sub-Clients {client.subClients && client.subClients.length > 0 ? `(${client.subClients.length})` : ''}
          </button>

          <button
            onClick={() => onEditClient(client)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Edit3 size={13} /> Edit Client
          </button>
          
          <button
            onClick={openPaymentModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Calendar size={13} /> Record Payment
          </button>
        </div>
      </div>

      {/* Closed Client Banner */}
      {client.isClosed && (
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-2xl px-5 py-3.5">
          <Archive size={18} className="text-slate-500 dark:text-slate-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">This client is closed</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Work is no longer active. All history, invoices, and data are preserved in read-only view.
              {client.closedAt && ` Closed on ${new Date(client.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`}
            </p>
          </div>
        </div>
      )}

      {/* Main Client Profile Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {client.logoUrl ? (
              <img 
                src={getDriveDirectImageUrl(client.logoUrl)} 
                alt={client.name} 
                className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0 bg-indigo-50 dark:bg-indigo-950" 
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=6366f1&color=ffffff&size=128&rounded=true&bold=true`;
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{client.name}</h1>
                <StatusBadge 
                  status={client.isClosed ? 'Closed' : statusInfo.code} 
                  label={client.isClosed ? 'Closed' : statusInfo.label} 
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400 dark:text-slate-500" /> {client.phone}
                </span>
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400 dark:text-slate-500" /> {client.email}
                  </span>
                )}
                <span className="text-slate-400 dark:text-slate-500">
                  Client since: {client.clientFrom ? new Date(client.clientFrom + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : new Date(client.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
                {client.instagram && (
                  <a href={client.instagram.startsWith('http') ? client.instagram : `https://instagram.com/${client.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400 hover:underline">
                    Instagram
                  </a>
                )}
              </div>
              {client.workExperience && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 max-w-lg">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Experience/Notes:</span> {client.workExperience}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!client.isClosed && (
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  client.autoInvoiceEnabled
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title="Configure automatic morning 6:00 AM invoice generation schedule"
              >
                <Clock size={13} className={client.autoInvoiceEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                <span>{client.autoInvoiceEnabled ? 'Auto 6 AM Active' : 'Auto-Invoice'}</span>
              </button>
            )}

            <button
              onClick={async () => {
                try {
                  const updated = { ...client, emailRemindersEnabled: client.emailRemindersEnabled === false ? true : false };
                  await updateClient(updated);
                } catch (err) {
                  console.error(err);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                client.emailRemindersEnabled !== false 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-300' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Toggle email reminders for overdue payments"
            >
              <Mail size={13} className={client.emailRemindersEnabled !== false ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              <span>Email: {client.emailRemindersEnabled !== false ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => exportClientCSV(client, clientWorkItems, clientInvoices)}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Export client history as CSV"
            >
              <Download size={13} className="text-slate-500" /> Export CSV
            </button>

            <a
              href={generateWhatsAppReminder(client, statusInfo)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs"
            >
              <Send size={13} /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Payment Reminder / Alert Notification Banner (when notification is required) */}
      {!client.isClosed && statusInfo.isNotificationRequired && (
        <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          statusInfo.severity === 'critical' || statusInfo.severity === 'urgent'
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200' 
            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${
              statusInfo.severity === 'critical' || statusInfo.severity === 'urgent'
                ? 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">{statusInfo.notificationTitle}</h4>
                {client.emailRemindersEnabled !== false && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Email Reminders Active
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 opacity-90">{statusInfo.notificationMessage}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={openPaymentModal}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm cursor-pointer"
            >
              Record Payment
            </button>
            <a
              href={generateWhatsAppReminder(client, statusInfo)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-700 shadow-sm flex items-center gap-1"
            >
              <Send size={12} /> WhatsApp
            </a>
            {client.emailRemindersEnabled !== false && (
              <a
                href={generateEmailReminder(client, statusInfo).mailtoLink}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm flex items-center gap-1"
              >
                <Mail size={12} /> Send Email
              </a>
            )}
            <button
              onClick={() => triggerBrowserOverdueAlert(client.name, statusInfo.label, statusInfo.notificationMessage, user?.uid)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 shadow-sm flex items-center gap-1 cursor-pointer"
              title="Trigger FCM Device Notification"
            >
              <AlertTriangle size={12} /> FCM Device Push
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Previous Payment Date */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>Previous Payment Date</span>
            <Calendar size={16} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formattedLastPaymentDate}</div>
          <button 
            onClick={openPaymentModal}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
          >
            Change date
          </button>
        </div>

        {/* Next Payment Due Date */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>Next Payment Due</span>
            <Clock size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formattedNextDueDate}</div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {statusInfo.daysRemaining === 0 ? 'Due Today!' : statusInfo.daysRemaining > 0 ? `In ${statusInfo.daysRemaining} days` : `${Math.abs(statusInfo.daysRemaining)} days overdue`}
          </div>
          {client.autoInvoiceEnabled && (
            <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400">
              <span className="flex items-center gap-1 font-medium">
                <Calendar size={11} /> Auto-invoice: 6 AM
              </span>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="font-bold underline cursor-pointer"
              >
                {scheduleInfo.nextRunDateFormatted}
              </button>
            </div>
          )}
        </div>

        {/* Pending Due Balance */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>Pending Balance</span>
            <IndianRupee size={16} className="text-rose-500 dark:text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">₹{financials.totalPendingAmount.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {financials.pendingInvoices.length} pending inv, {financials.uninvoicedWork.length} un-invoiced
          </div>
        </div>

        {/* Lifetime Paid Billed */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>Total Lifetime Billed</span>
            <CheckCircle2 size={16} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">₹{financials.paidTotal.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">From paid invoices</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 pt-4 flex gap-4 md:gap-6 overflow-x-auto scrollbar-none -mb-px">
          <motion.button
            onClick={() => setActiveTab('work')}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={`relative pb-4 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 outline-none cursor-pointer select-none ${
              activeTab === 'work'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList size={16} /> Work Logs ({clientWorkItems.length})
            {activeTab === 'work' && (
              <motion.div
                layoutId="clientDashboardTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 450, damping: 35 }
                }
              />
            )}
          </motion.button>

          <motion.button
            onClick={() => setActiveTab('invoices')}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={`relative pb-4 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 outline-none cursor-pointer select-none ${
              activeTab === 'invoices'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={16} /> Invoices ({clientInvoices.length})
            {activeTab === 'invoices' && (
              <motion.div
                layoutId="clientDashboardTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 450, damping: 35 }
                }
              />
            )}
          </motion.button>

          <motion.button
            onClick={() => setActiveTab('settings')}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={`relative pb-4 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 outline-none cursor-pointer select-none ${
              activeTab === 'settings'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <DollarSign size={16} /> Client Rates & Info
            {activeTab === 'settings' && (
              <motion.div
                layoutId="clientDashboardTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 450, damping: 35 }
                }
              />
            )}
          </motion.button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{
              duration: shouldReduceMotion ? 0.01 : 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full"
          >
            {/* Tab 1: Work Logs */}
            {activeTab === 'work' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Work Logs</h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDriveModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  title="Directly upload video to Google Drive with embeddable link"
                >
                  <UploadCloud size={13} /> Upload Drive
                </button>
                <button
                  onClick={() => setIsWorkFormOpen(true)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                >
                  <Plus size={13} /> Log Work
                </button>
              </div>
            </div>

            {/* Quick Add / Edit Work Modal inside Client Dashboard */}
            {isWorkFormOpen && (
              <div className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{editingWorkId ? 'Edit Work Entry' : 'Add New Work Entry'}</h4>
                  <button onClick={handleCancelWorkForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveWorkLog} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {client.subClients && client.subClients.length > 0 && (
                    <div className="md:col-span-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Users size={14} className="text-slate-500 dark:text-slate-400" /> Issued Sub-Client (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsSubClientsModalOpen(true)}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 w-fit cursor-pointer"
                        >
                          + Manage Sub-Clients
                        </button>
                      </div>
                      <select
                        value={workFormData.subClientId}
                        onChange={e => setWorkFormData({ ...workFormData, subClientId: e.target.value })}
                        className="mt-1.5 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Direct Parent Client ({client.name}) --</option>
                        {client.subClients.map(sc => (
                          <option key={sc.id} value={sc.id}>
                            Sub-Client: {sc.name} {sc.code ? `(${sc.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Work Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wedding Highlight Reel Edit"
                      value={workFormData.description}
                      onChange={e => setWorkFormData({ ...workFormData, description: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Video / Post Link (Optional)</label>
                      <button
                        type="button"
                        onClick={() => setIsDriveModalOpen(true)}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UploadCloud size={12} /> Upload to Drive
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="https://instagram.com/reel/... or YouTube / Drive link"
                      value={workFormData.videoUrl}
                      onChange={e => setWorkFormData({ ...workFormData, videoUrl: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Quantity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={workFormData.quantity}
                      onChange={e => setWorkFormData({ ...workFormData, quantity: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {client.paymentBasis === 'monthly_retainer' ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Billing Basis</label>
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center h-[38px]">
                        <span>Monthly Retainer</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Rate (₹) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={workFormData.rate}
                        onChange={e => setWorkFormData({ ...workFormData, rate: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Completion Date *</label>
                    <DateInput
                      required
                      value={workFormData.date}
                      onChange={val => setWorkFormData({ ...workFormData, date: val })}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelWorkForm}
                      className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-all shadow-sm cursor-pointer"
                    >
                      {editingWorkId ? 'Save Changes' : 'Save Work Log'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-Client Filter Tabs if sub-clients exist */}
            {client.subClients && client.subClients.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                  <Filter size={12} /> Filter Work:
                </span>
                <button
                  onClick={() => setSubClientFilter('all')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    subClientFilter === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({clientWorkItems.length})
                </button>
                <button
                  onClick={() => setSubClientFilter('direct')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    subClientFilter === 'direct'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Direct / Parent ({clientWorkItems.filter(i => !i.subClientId).length})
                </button>
                {client.subClients.map(sc => {
                  const count = clientWorkItems.filter(i => i.subClientId === sc.id).length;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => setSubClientFilter(subClientFilter === sc.id ? 'all' : sc.id)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                        subClientFilter === sc.id
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sc.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Work Items Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full min-w-[680px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Description / Sub-Client / Link</th>
                    <th className="p-3.5 text-right">{client.paymentBasis === 'monthly_retainer' ? 'Quantity' : 'Quantity & Rate'}</th>
                    <th className="p-3.5 text-right">{client.paymentBasis === 'monthly_retainer' ? 'Billing' : 'Total'}</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                  {filteredClientWorkItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        {subClientFilter !== 'all' 
                          ? 'No work items logged under this selected filter.' 
                          : 'No work items logged for this client yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredClientWorkItems.map(item => {
                      const videoUrl = extractVideoUrl(item);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900 dark:text-slate-100">{item.description}</span>
                                {item.subClientName && (
                                  <span className="text-[12px] text-slate-500 dark:text-slate-400 font-normal">
                                    {item.subClientName}
                                  </span>
                                )}
                              </div>
                              {videoUrl && (
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEmbedModalData({
                                      isOpen: true,
                                      url: videoUrl,
                                      title: item.description,
                                      clientName: client.name
                                    })}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                    title="Watch embedded video preview"
                                  >
                                    <Play size={14} /> Watch Preview
                                  </button>
                                  <a
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-0.5"
                                    title={`Open external link: ${videoUrl}`}
                                  >
                                    <ExternalLink size={10} /> Link
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right text-slate-600 dark:text-slate-300">
                            {client.paymentBasis === 'monthly_retainer' 
                              ? `${item.quantity} item${item.quantity === 1 ? '' : 's'}`
                              : `${item.quantity} × ₹${item.rate.toLocaleString('en-IN')}`}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            {client.paymentBasis === 'monthly_retainer' ? (
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                Covered in Retainer
                              </span>
                            ) : (
                              `₹${(item.quantity * item.rate).toLocaleString('en-IN')}`
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <StatusBadge 
                              status={item.status === 'Invoiced' ? 'Invoiced' : 'Pending'} 
                              label={item.status === 'Invoiced' ? 'Invoiced' : 'Uninvoiced'} 
                            />
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            {videoUrl && (
                              <a
                                href={videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5 mr-2"
                                title="Open video/post in new tab"
                              >
                                <ExternalLink size={12} /> Open
                              </a>
                            )}
                            <button
                              onClick={() => handleStartEditWork(item)}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteWork(item.id)}
                              className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Invoices */}
        {activeTab === 'invoices' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Invoices</h3>
              {!client.isClosed && (
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all cursor-pointer"
                >
                  <Clock size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{client.autoInvoiceEnabled ? 'Schedule: Active (6:00 AM)' : 'Schedule Auto-Invoice'}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full min-w-[680px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5">Invoice Date</th>
                    <th className="p-3.5">Reels / Line Items</th>
                    <th className="p-3.5 text-right">Total Amount</th>
                    <th className="p-3.5 text-center">Payment Status</th>
                    <th className="p-3.5 text-right">Email Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                  {clientInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        No invoices generated for this client yet.
                      </td>
                    </tr>
                  ) : (
                    clientInvoices.map(inv => {
                      const emailData = generateInvoiceEmailDetails(client, inv, null);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span>#{inv.id.substring(0, 8).toUpperCase()}</span>
                              {inv.isAutoGenerated && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" title="Auto-generated on scheduled date at 6:00 AM">
                                  <Sparkles size={10} className="text-indigo-500" />
                                  Auto 6 AM
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          </td>
                          <td className="p-3.5 text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium">
                                {inv.invoiceType === 'monthly_retainer' ? '1 Retainer' : `${inv.reels.length} item(s)`}
                              </span>
                              {inv.invoiceType === 'monthly_retainer' && (
                                <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                                  Monthly Retainer
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {inv.reels.map(r => r.title).join(', ')}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₹{inv.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5 text-center">
                            <StatusBadge
                              status={inv.status}
                              onClick={async () => {
                                const newStatus = inv.status === 'Paid' ? 'Pending' : 'Paid';
                                await updateInvoice({ ...inv, status: newStatus });
                                if (newStatus === 'Paid') {
                                  const pDate = inv.date || Date.now();
                                  await updateClient({ ...client, lastPaymentDate: pDate });
                                }
                              }}
                              title={`Click to mark as ${inv.status === 'Paid' ? 'Pending' : 'Paid & update last payment date'}`}
                            />
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={emailData.mailtoLink}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                                title="Send Email for this Invoice"
                              >
                                <Mail size={13} /> Send Email
                              </a>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`Subject: ${emailData.subject}\n\n${emailData.body}`);
                                  alert(`Invoice email details for ${client.name} copied to clipboard!`);
                                }}
                                className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                title="Copy Email Text to Clipboard"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Client Settings & Rates */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Rates & Pricing</h3>

              <button
                onClick={() => onEditClient(client)}
                className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Edit3 size={14} /> Modify Rates
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                  Payment Basis
                </span>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {client.paymentBasis === 'monthly_retainer' ? 'Monthly Retainer' : 'Per Reel'}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {client.paymentBasis === 'monthly_retainer'
                    ? `Fixed ₹${(client.monthlyRetainerAmount || client.defaultRate || 0).toLocaleString('en-IN')}/mo`
                    : 'Billed per deliverable'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Default Reel Rate</span>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">₹{client.defaultRate.toLocaleString('en-IN')}</div>
                <span className="text-xs text-slate-400 dark:text-slate-500">Per video edit</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">On Site Shoot Rate</span>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {client.onSiteShootRate ? `₹${client.onSiteShootRate.toLocaleString('en-IN')}` : 'Not Set'}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">Per shoot day</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Website Making Rate</span>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {client.websiteMakingRate ? `₹${client.websiteMakingRate.toLocaleString('en-IN')}` : 'Not Set'}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">Per website project</span>
              </div>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Update Payment Date Modal */}
      {isUpdatingPaymentDate && (
        <div 
          onClick={() => setIsUpdatingPaymentDate(false)}
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Update Previous Payment Date</h3>
              <button 
                onClick={() => setIsUpdatingPaymentDate(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Recording the date when this client last paid updates the 30-day payment cycle. The next due date will automatically shift 30 days after this date.
            </p>

            <form onSubmit={handleSavePaymentDate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Received Date *</label>
                <DateInput
                  required
                  value={newPaymentDate}
                  onChange={val => setNewPaymentDate(val)}
                  className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              {financials.pendingInvoices.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    id="markPaidCheckbox"
                    checked={markPendingAsPaid}
                    onChange={e => setMarkPendingAsPaid(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600"
                  />
                  <label htmlFor="markPaidCheckbox" className="cursor-pointer font-medium">
                    Also mark all {financials.pendingInvoices.length} pending invoice(s) (₹{financials.pendingInvoiceTotal.toLocaleString('en-IN')}) as Paid
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpdatingPaymentDate(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Save & Update Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage Sub-Clients Modal */}
      {isSubClientsModalOpen && (
        <div 
          onClick={() => {
            setIsSubClientsModalOpen(false);
            setEditingSubClientId(null);
            setSubClientForm({ name: '', code: '', notes: '' });
          }}
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 cursor-default max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-700 dark:text-slate-300" /> Manage Sub-Clients
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign sub-clients or branches to <strong className="text-slate-700 dark:text-slate-200">{client.name}</strong>.
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsSubClientsModalOpen(false);
                  setEditingSubClientId(null);
                  setSubClientForm({ name: '', code: '', notes: '' });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form to Add / Edit Sub-Client */}
            <form onSubmit={handleSaveSubClient} className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {editingSubClientId ? 'Edit Sub-Client' : '+ Create New Sub-Client'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sub-Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Branch Alpha, Brand X, Project B"
                    value={subClientForm.name}
                    onChange={e => setSubClientForm({ ...subClientForm, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Code / Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BR-01, NYC, DEPT-A"
                    value={subClientForm.code}
                    onChange={e => setSubClientForm({ ...subClientForm, code: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={subClientForm.phone}
                    onChange={e => setSubClientForm({ ...subClientForm, phone: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="subclient@example.com"
                    value={subClientForm.email}
                    onChange={e => setSubClientForm({ ...subClientForm, email: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={subClientForm.logoUrl}
                    onChange={e => setSubClientForm({ ...subClientForm, logoUrl: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Instagram (Optional)</label>
                  <input
                    type="text"
                    placeholder="@username or link"
                    value={subClientForm.instagram}
                    onChange={e => setSubClientForm({ ...subClientForm, instagram: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Client From (Optional)</label>
                  <input
                    type="month"
                    value={subClientForm.clientFrom}
                    onChange={e => setSubClientForm({ ...subClientForm, clientFrom: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Experience / Notes (Optional)</label>
                  <textarea
                    placeholder="Details about past projects, years of experience, etc."
                    value={subClientForm.workExperience}
                    onChange={e => setSubClientForm({ ...subClientForm, workExperience: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-16"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingSubClientId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubClientId(null);
                      setSubClientForm({ name: '', code: '', notes: '' });
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> {editingSubClientId ? 'Update Sub-Client' : 'Add Sub-Client'}
                </button>
              </div>
            </form>

            {/* List of Sub-Clients */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Registered Sub-Clients ({client.subClients?.length || 0})
              </h4>

              {(!client.subClients || client.subClients.length === 0) ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                  No sub-clients added yet for {client.name}. Add sub-clients above to issue work logs specifically for them.
                </div>
              ) : (
                <div className="space-y-2">
                  {client.subClients.map(sc => {
                    const scWorkLogs = clientWorkItems.filter(item => item.subClientId === sc.id);
                    const totalVal = scWorkLogs.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
                    const uninvoicedVal = scWorkLogs.filter(item => item.status !== 'Invoiced').reduce((sum, item) => sum + (item.quantity * item.rate), 0);

                    return (
                      <div 
                        key={sc.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex gap-3 min-w-0">
                          {sc.logoUrl ? (
                            <img 
                              src={getDriveDirectImageUrl(sc.logoUrl)} 
                              alt={sc.name} 
                              className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0 bg-slate-100 dark:bg-slate-800" 
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sc.name)}&background=f1f5f9&color=475569&size=128&rounded=true&bold=true`;
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold shadow-sm shrink-0">
                              {sc.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{sc.name}</span>
                              {sc.code && (
                                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono text-[11px] font-semibold">
                                  {sc.code}
                                </span>
                              )}
                              {sc.instagram && (
                                <a href={sc.instagram.startsWith('http') ? sc.instagram : `https://instagram.com/${sc.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:underline text-[10px] ml-1">
                                  IG
                                </a>
                              )}
                            </div>
                            {(sc.phone || sc.email) && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                {sc.phone && <span>{sc.phone}</span>}
                                {sc.phone && sc.email && <span>•</span>}
                                {sc.email && <span>{sc.email}</span>}
                              </div>
                            )}
                            {sc.workExperience && (
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-xs">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Exp:</span> {sc.workExperience}
                              </div>
                            )}
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>{scWorkLogs.length} work log(s)</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Total: ₹{totalVal.toLocaleString('en-IN')}</span>
                            {uninvoicedVal > 0 && (
                              <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                                ₹{uninvoicedVal.toLocaleString('en-IN')} pending invoice
                              </span>
                            )}
                          </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditSubClientClick(sc)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Sub-Client"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubClientClick(sc.id, sc.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Sub-Client"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 dark:border-slate-700 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsSubClientsModalOpen(false);
                  setEditingSubClientId(null);
                  setSubClientForm({ name: '', code: '', notes: '' });
                }}
                className="px-5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Direct Upload Modal */}
      <GoogleDriveUploadModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        clients={[client]}
        defaultClientId={client.id}
        onWorkItemCreated={async (newWork) => {
          await updateWorkItem(newWork);
          setIsDriveModalOpen(false);
        }}
        onLinkGenerated={(result) => {
          setWorkFormData(prev => ({
            ...prev,
            videoUrl: result.webViewLink,
            description: prev.description.trim() ? prev.description : result.name
          }));
          setIsWorkFormOpen(true);
        }}
      />

      {/* Embedded Media Player Modal */}
      <MediaEmbedModal
        isOpen={!!embedModalData?.isOpen}
        onClose={() => setEmbedModalData(null)}
        url={embedModalData?.url || ''}
        title={embedModalData?.title || 'Video Deliverable'}
        clientName={embedModalData?.clientName}
      />

      {/* 6:00 AM Auto-Invoice Schedule Modal */}
      <ScheduleInvoiceModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        clients={[client]}
        workItems={workItems}
        invoices={invoices}
        initialClientId={client.id}
        onUpdateClient={updateClient}
        onAddInvoice={updateInvoice}
        onUpdateWorkItem={updateWorkItem}
      />
    </div>
  );
}
