import React, { useState } from 'react';
import { Client, Invoice, WorkItem, SubClient, UserProfile } from '../types';
import { 
  ArrowLeft, Calendar, Phone, Mail, Edit3, CheckCircle2, Clock, 
  IndianRupee, Plus, AlertTriangle, Send, FileText, ClipboardList,
  Sparkles, ShieldAlert, DollarSign, Copy, ExternalLink, Play, Download,
  Users, Tag, Trash2, Edit2, Filter, MessageSquare, Archive, UploadCloud
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
  
  // Payment Date update state
  const [isUpdatingPaymentDate, setIsUpdatingPaymentDate] = useState(false);
  const [newPaymentDate, setNewPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [markPendingAsPaid, setMarkPendingAsPaid] = useState(true);

  const openPaymentModal = () => {
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
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
    date: new Date().toISOString().split('T')[0]
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
      const selectedTimestamp = new Date(newPaymentDate).getTime();
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
      date: new Date(item.date).toISOString().split('T')[0]
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
      date: new Date().toISOString().split('T')[0]
    });
    setIsWorkFormOpen(false);
  };

  // Add or update work log for this specific client
  const handleSaveWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedRate = Number(workFormData.rate) || client.defaultRate;
      const selectedQty = Number(workFormData.quantity);
      const selectedDate = new Date(workFormData.date).getTime();
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

  const formattedLastPaymentDate = client.lastPaymentDate
    ? new Date(client.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not Recorded';

  const formattedNextDueDate = new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Action Bar with Back button and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 w-fit cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Client Directory
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyReviewLink}
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer ${
              copiedReviewLink 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300' 
                : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50'
            }`}
            title="Copy feedback request link for this client"
          >
            {copiedReviewLink ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> Link Copied!
              </>
            ) : (
              <>
                <MessageSquare size={14} /> Request Review
              </>
            )}
          </button>

          <button
            onClick={() => setIsSubClientsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Add or edit sub-clients for this client"
          >
            <Users size={14} /> Sub-Clients {client.subClients && client.subClients.length > 0 ? `(${client.subClients.length})` : ''}
          </button>

          <button
            onClick={() => onEditClient(client)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Edit3 size={14} /> Edit Client Info
          </button>
          
          <button
            onClick={openPaymentModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Calendar size={14} /> Update Payment Date
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{client.name}</h1>
                {client.isClosed ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600">
                    <Archive size={12} /> Closed
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}>
                    <Clock size={12} /> {statusInfo.label}
                  </span>
                )}
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Quick Email Reminders Toggle */}
            <button
              onClick={async () => {
                try {
                  const updated = { ...client, emailRemindersEnabled: client.emailRemindersEnabled === false ? true : false };
                  await updateClient(updated);
                } catch (err) {
                  console.error(err);
                }
              }}
              className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                client.emailRemindersEnabled !== false 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Toggle email reminders for overdue payments"
            >
              <div className="flex items-center gap-1.5">
                <Mail size={14} className={client.emailRemindersEnabled !== false ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                <span>Email Reminders: {client.emailRemindersEnabled !== false ? 'ON' : 'OFF'}</span>
              </div>
            </button>

            <button
              onClick={() => exportClientCSV(client, clientWorkItems, clientInvoices)}
              className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Export Client Work History & Invoice Summary as CSV file"
            >
              <Download size={14} className="text-emerald-600 dark:text-emerald-400" /> Export CSV Report
            </button>

            <a
              href={generateWhatsAppReminder(client, statusInfo)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <Send size={14} /> Send WhatsApp Reminder
            </a>
          </div>
        </div>
      </div>

      {/* Payment Reminder / Alert Notification Banner (when notification is required) */}
      {statusInfo.isNotificationRequired && (
        <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          statusInfo.severity === 'critical' 
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200' 
            : statusInfo.severity === 'urgent' 
            ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50 text-orange-900 dark:text-orange-200' 
            : statusInfo.severity === 'delayed'
            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-200'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${
              statusInfo.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400' :
              statusInfo.severity === 'urgent' ? 'bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400' :
              statusInfo.severity === 'delayed' ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">{statusInfo.notificationTitle}</h4>
                {client.emailRemindersEnabled !== false && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
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
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-current rounded-lg text-xs font-bold hover:opacity-90 shadow-sm cursor-pointer"
            >
              Record Payment
            </button>
            <a
              href={generateWhatsAppReminder(client, statusInfo)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1"
            >
              <Send size={12} /> WhatsApp
            </a>
            {client.emailRemindersEnabled !== false && (
              <a
                href={generateEmailReminder(client, statusInfo).mailtoLink}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1"
              >
                <Mail size={12} /> Send Email
              </a>
            )}
            <button
              onClick={() => triggerBrowserOverdueAlert(client.name, statusInfo.label, statusInfo.notificationMessage, user?.uid)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shadow-sm flex items-center gap-1 cursor-pointer"
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
            <Clock size={16} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formattedNextDueDate}</div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {statusInfo.daysRemaining === 0 ? 'Due Today!' : statusInfo.daysRemaining > 0 ? `In ${statusInfo.daysRemaining} days` : `${Math.abs(statusInfo.daysRemaining)} days overdue`}
          </div>
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
            <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{financials.paidTotal.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">From paid invoices</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 pt-4 flex gap-4 md:gap-6 overflow-x-auto scrollbar-none -mb-px">
          <button
            onClick={() => setActiveTab('work')}
            className={`pb-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'work'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList size={16} /> Work Logs ({clientWorkItems.length})
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={16} /> Invoices ({clientInvoices.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <DollarSign size={16} /> Client Rates & Info
          </button>
        </div>

        {/* Tab 1: Work Logs */}
        {activeTab === 'work' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Work Logs for {client.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Track all completed video edits and services specifically for this client.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDriveModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  title="Directly upload video to Google Drive with embeddable link"
                >
                  <UploadCloud size={14} /> Upload to Drive
                </button>
                <button
                  onClick={() => setIsWorkFormOpen(true)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={14} /> Log Work for {client.name.split(' ')[0]}
                </button>
              </div>
            </div>

            {/* Quick Add / Edit Work Modal inside Client Dashboard */}
            {isWorkFormOpen && (
              <div className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{editingWorkId ? 'Edit Work Entry' : 'Add New Work Entry'}</h4>
                  <button onClick={handleCancelWorkForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                </div>

                <form onSubmit={handleSaveWorkLog} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {client.subClients && client.subClients.length > 0 && (
                    <div className="md:col-span-4 bg-purple-50/70 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200 dark:border-purple-800/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                          <Users size={14} className="text-purple-600 dark:text-purple-400" /> Issued Sub-Client (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsSubClientsModalOpen(true)}
                          className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 underline flex items-center gap-1 w-fit cursor-pointer"
                        >
                          + Manage Sub-Clients
                        </button>
                      </div>
                      <select
                        value={workFormData.subClientId}
                        onChange={e => setWorkFormData({ ...workFormData, subClientId: e.target.value })}
                        className="mt-1.5 w-full bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
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
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
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

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Completion Date *</label>
                    <input
                      type="date"
                      required
                      value={workFormData.date}
                      onChange={e => setWorkFormData({ ...workFormData, date: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    subClientFilter === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({clientWorkItems.length})
                </button>
                <button
                  onClick={() => setSubClientFilter('direct')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    subClientFilter === 'direct'
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs'
                      : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  Direct / Parent ({clientWorkItems.filter(i => !i.subClientId).length})
                </button>
                {client.subClients.map(sc => {
                  const count = clientWorkItems.filter(i => i.subClientId === sc.id).length;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => setSubClientFilter(sc.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        subClientFilter === sc.id
                          ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-xs'
                          : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      Sub: {sc.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Work Items Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Description / Sub-Client / Link</th>
                    <th className="p-3.5 text-right">Quantity & Rate</th>
                    <th className="p-3.5 text-right">Total</th>
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
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                    <Users size={10} /> Sub: {item.subClientName}
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
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 transition-all cursor-pointer shrink-0 w-fit"
                                    title="Watch embedded video preview"
                                  >
                                    <Play size={10} className="fill-indigo-700 dark:fill-indigo-300" /> Watch Video
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
                            {item.quantity} × ₹{item.rate.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₹{(item.quantity * item.rate).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5 text-center">
                            {item.status === 'Invoiced' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={12} /> Invoiced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock size={12} /> Uninvoiced
                              </span>
                            )}
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
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Invoices for {client.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">History of generated PDF invoices and payment statuses.</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left border-collapse">
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
                            <div className="font-semibold text-slate-900 dark:text-slate-100">#{inv.id.substring(0, 8).toUpperCase()}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          </td>
                          <td className="p-3.5 text-slate-900 dark:text-slate-100">
                            <div className="font-medium">{inv.reels.length} item(s)</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {inv.reels.map(r => r.title).join(', ')}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₹{inv.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={async () => {
                                const newStatus = inv.status === 'Paid' ? 'Pending' : 'Paid';
                                await updateInvoice({ ...inv, status: newStatus });
                                if (newStatus === 'Paid') {
                                  const pDate = inv.date || Date.now();
                                  await updateClient({ ...client, lastPaymentDate: pDate });
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-transform hover:scale-105 ${
                                inv.status === 'Paid' 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60' 
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                              }`}
                              title={`Click to mark as ${inv.status === 'Paid' ? 'Pending' : 'Paid & update last payment date'}`}
                            >
                              {inv.status}
                            </button>
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
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Rates & Contact Info</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configured pricing rates for video services for this client.</p>
              </div>

              <button
                onClick={() => onEditClient(client)}
                className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Edit3 size={14} /> Modify Rates
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Update Payment Date Modal */}
      {isUpdatingPaymentDate && (
        <div 
          onClick={() => setIsUpdatingPaymentDate(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
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
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Recording the date when this client last paid updates the 30-day payment cycle. The next due date will automatically shift 30 days after this date.
            </p>

            <form onSubmit={handleSavePaymentDate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Received Date *</label>
                <input
                  type="date"
                  required
                  value={newPaymentDate}
                  onChange={e => setNewPaymentDate(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              {financials.pendingInvoices.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-300">
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 cursor-default max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Manage Sub-Clients
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
                ✕
              </button>
            </div>

            {/* Form to Add / Edit Sub-Client */}
            <form onSubmit={handleSaveSubClient} className="bg-purple-50/60 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
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
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Code / Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BR-01, NYC, DEPT-A"
                    value={subClientForm.code}
                    onChange={e => setSubClientForm({ ...subClientForm, code: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={subClientForm.phone}
                    onChange={e => setSubClientForm({ ...subClientForm, phone: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="subclient@example.com"
                    value={subClientForm.email}
                    onChange={e => setSubClientForm({ ...subClientForm, email: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={subClientForm.logoUrl}
                    onChange={e => setSubClientForm({ ...subClientForm, logoUrl: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Instagram (Optional)</label>
                  <input
                    type="text"
                    placeholder="@username or link"
                    value={subClientForm.instagram}
                    onChange={e => setSubClientForm({ ...subClientForm, instagram: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Client From (Optional)</label>
                  <input
                    type="month"
                    value={subClientForm.clientFrom}
                    onChange={e => setSubClientForm({ ...subClientForm, clientFrom: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Experience / Notes (Optional)</label>
                  <textarea
                    placeholder="Details about past projects, years of experience, etc."
                    value={subClientForm.workExperience}
                    onChange={e => setSubClientForm({ ...subClientForm, workExperience: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500 resize-none h-16"
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
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
                        className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors"
                      >
                        <div className="flex gap-3 min-w-0">
                          {sc.logoUrl ? (
                            <img 
                              src={getDriveDirectImageUrl(sc.logoUrl)} 
                              alt={sc.name} 
                              className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0 bg-purple-50 dark:bg-purple-950" 
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sc.name)}&background=f3e8ff&color=7e22ce&size=128&rounded=true&bold=true`;
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold shadow-sm shrink-0">
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
                                <a href={sc.instagram.startsWith('http') ? sc.instagram : `https://instagram.com/${sc.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 dark:text-pink-400 hover:underline text-[10px] ml-1">
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
                              <span className="text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-[11px]">
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
    </div>
  );
}
