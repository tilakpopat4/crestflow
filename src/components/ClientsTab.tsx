import React, { useState } from 'react';
import { Client, Invoice, WorkItem, ServiceRequest } from '../types';
import {
  Plus, Edit2, Trash2, CheckCircle2, X, Search, Calendar,
  Clock, Phone, Mail, ArrowRight, AlertTriangle, Send, ShieldAlert,
  ChevronRight, Filter, Download, Users, UploadCloud, Briefcase, Instagram, Archive, ArchiveRestore
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { User } from 'firebase/auth';
import { generateUUID, getDriveDirectImageUrl } from '../lib/utils';
import { exportClientCSV } from '../lib/csvExport';
import {
  getPaymentStatusInfo,
  calculateClientFinancials,
  generateWhatsAppReminder,
  generateEmailReminder,
  triggerBrowserOverdueAlert
} from '../lib/paymentUtils';
import ClientDashboard from './ClientDashboard';
import CsvImportModal from './CsvImportModal';

interface ClientsTabProps {
  user: User | null;
  initialSearchQuery?: string;
  initialSelectedClientId?: string | null;
}

export default function ClientsTab({ user, initialSearchQuery = '', initialSelectedClientId = null }: ClientsTabProps) {
  const { data: clients, loading: clientsLoading, addOrUpdateItem: saveClient, removeItem: deleteClientFromDb } = useFirestore<Client>('clients', user?.uid);
  const { data: invoices } = useFirestore<Invoice>('invoices', user?.uid);
  const { data: workItems } = useFirestore<WorkItem>('workItems', user?.uid);
  const { data: serviceRequests, addOrUpdateItem: updateServiceRequest } = useFirestore<ServiceRequest>('serviceRequests', user?.uid);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialSelectedClientId);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filterType, setFilterType] = useState<'all' | 'due' | 'uptodate' | 'closed'>('all');
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);

  React.useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  React.useEffect(() => {
    if (initialSelectedClientId) {
      setSelectedClientId(initialSelectedClientId);
    }
  }, [initialSelectedClientId]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    logoUrl: '',
    instagram: '',
    clientFrom: '',
    workExperience: '',
    defaultRate: '',
    onSiteShootRate: '',
    websiteMakingRate: '',
    lastPaymentDate: new Date().toISOString().split('T')[0],
    emailRemindersEnabled: true
  });

  // Calculate notification alerts across all clients
  const clientStatuses = clients.map(c => ({
    client: c,
    statusInfo: getPaymentStatusInfo(c, invoices, workItems),
    financials: calculateClientFinancials(c.id, invoices, workItems)
  }));

  // Exclude closed clients from payment notifications
  const notificationClients = clientStatuses.filter(cs => !cs.client.isClosed && cs.statusInfo.isNotificationRequired);
  const closedClientsCount = clients.filter(c => c.isClosed).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paymentDateTimestamp = formData.lastPaymentDate
        ? new Date(formData.lastPaymentDate).getTime()
        : Date.now();

      if (isEditing) {
        const existing = clients.find(c => c.id === isEditing);
        if (existing) {
          const updatedClient: Client = {
            ...existing,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            logoUrl: formData.logoUrl?.trim() || undefined,
            instagram: formData.instagram,
            clientFrom: formData.clientFrom,
            workExperience: formData.workExperience,
            defaultRate: Number(formData.defaultRate),
            lastPaymentDate: paymentDateTimestamp,
            emailRemindersEnabled: formData.emailRemindersEnabled
          };

          if (formData.onSiteShootRate) updatedClient.onSiteShootRate = Number(formData.onSiteShootRate);
          else delete updatedClient.onSiteShootRate;

          if (formData.websiteMakingRate) updatedClient.websiteMakingRate = Number(formData.websiteMakingRate);
          else delete updatedClient.websiteMakingRate;

          await saveClient(updatedClient);
        }
        setIsEditing(null);
      } else {
        const newClient: Client = {
          id: generateUUID(),
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          logoUrl: formData.logoUrl?.trim() || undefined,
          instagram: formData.instagram,
          clientFrom: formData.clientFrom,
          workExperience: formData.workExperience,
          defaultRate: Number(formData.defaultRate),
          lastPaymentDate: paymentDateTimestamp,
          emailRemindersEnabled: formData.emailRemindersEnabled,
          createdAt: Date.now()
        };
        if (formData.onSiteShootRate) newClient.onSiteShootRate = Number(formData.onSiteShootRate);
        if (formData.websiteMakingRate) newClient.websiteMakingRate = Number(formData.websiteMakingRate);

        await saveClient(newClient);
      }

      setFormData({
        name: '',
        phone: '',
        email: '',
        logoUrl: '',
        instagram: '',
        clientFrom: '',
        workExperience: '',
        defaultRate: '',
        onSiteShootRate: '',
        websiteMakingRate: '',
        lastPaymentDate: new Date().toISOString().split('T')[0],
        emailRemindersEnabled: true
      });
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      alert("Error saving client: " + (err?.message || String(err)));
    }
  };

  const handleEditClient = (c: Client) => {
    setIsEditing(c.id);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      logoUrl: c.logoUrl || '',
      instagram: c.instagram || '',
      clientFrom: c.clientFrom || '',
      workExperience: c.workExperience || '',
      defaultRate: String(c.defaultRate),
      onSiteShootRate: c.onSiteShootRate ? String(c.onSiteShootRate) : '',
      websiteMakingRate: c.websiteMakingRate ? String(c.websiteMakingRate) : '',
      lastPaymentDate: c.lastPaymentDate ? new Date(c.lastPaymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      emailRemindersEnabled: c.emailRemindersEnabled !== false
    });
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete client "${name}"?`)) {
      await deleteClientFromDb(id);
      if (selectedClientId === id) setSelectedClientId(null);
    }
  };

  const handleCloseClient = async (client: Client) => {
    if (!confirm(`Close work with "${client.name}"?\n\nTheir data, invoices, and work history will be preserved — but they'll be marked as closed and excluded from active tracking.`)) return;
    try {
      await saveClient({ ...client, isClosed: true, closedAt: Date.now() });
    } catch (err: any) {
      alert('Failed to close client: ' + (err?.message || String(err)));
    }
  };

  const handleReopenClient = async (client: Client) => {
    try {
      await saveClient({ ...client, isClosed: false, closedAt: undefined });
    } catch (err: any) {
      alert('Failed to reopen client: ' + (err?.message || String(err)));
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      logoUrl: '',
      instagram: '',
      workExperience: '',
      defaultRate: '',
      onSiteShootRate: '',
      websiteMakingRate: '',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      emailRemindersEnabled: true
    });
    setIsFormOpen(false);
  };

  // If a client is selected, render that client's dedicated dashboard!
  const selectedClient = clients.find(c => c.id === selectedClientId);
  if (selectedClient) {
    return (
      <ClientDashboard
        client={selectedClient}
        user={user}
        onBack={() => setSelectedClientId(null)}
        onEditClient={handleEditClient}
      />
    );
  }

  // Filter clients for list/grid view
  const filteredClients = clientStatuses.filter(({ client, statusInfo }) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'closed') return !!client.isClosed;
    // Active-only filters — exclude closed clients
    if (client.isClosed) return false;
    if (filterType === 'due') return statusInfo.isNotificationRequired || statusInfo.daysRemaining <= 3;
    if (filterType === 'uptodate') return !statusInfo.isNotificationRequired && statusInfo.daysRemaining > 3;
    return true; // 'all' = all active clients
  });

  const handleAcceptRequest = async (request: ServiceRequest) => {
    try {
      const newClientId = generateUUID();
      const newClient: Client = {
        id: newClientId,
        name: request.clientName,
        phone: request.contactPhone,
        email: request.contactEmail,
        defaultRate: request.proposedRate || 1500,
        createdAt: Date.now(),
        notes: `Referral service claim submitted on ${new Date(request.createdAt).toLocaleDateString()}:\n${request.projectDetails}`
      };

      if (request.instagram) {
        newClient.instagram = request.instagram;
      }

      await saveClient(newClient);
      await updateServiceRequest({
        ...request,
        status: 'accepted'
      });
      alert(`Accepted request from ${request.contactName}! Client profile created successfully.`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to accept request: ${err.message}`);
    }
  };

  const handleDeclineRequest = async (request: ServiceRequest) => {
    if (!window.confirm(`Are you sure you want to decline the request from ${request.contactName}?`)) return;
    try {
      await updateServiceRequest({
        ...request,
        status: 'declined'
      });
    } catch (err: any) {
      console.error(err);
      alert(`Failed to decline request: ${err.message}`);
    }
  };

  if (clientsLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-20">
        <div className="animate-pulse flex items-center justify-center space-x-2">
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Client Directory & Profiles</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Click any client profile to view their individual dashboard, work logs, and 30-day payment cycle.
          </p>
        </div>

        {!isFormOpen && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm flex-1 md:flex-none cursor-pointer"
            >
              <UploadCloud size={16} />
              Import CSV
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm flex-1 md:flex-none cursor-pointer"
            >
              <Plus size={16} />
              Add New Client
            </button>
          </div>
        )}
      </div>

      {/* Service Claims / Inquiries (Leads) */}
      {(() => {
        const pendingRequests = serviceRequests.filter(req => req.status === 'pending');
        if (pendingRequests.length === 0) return null;
        return (
          <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
              <Briefcase className="text-indigo-600 dark:text-indigo-400 animate-pulse" size={20} />
              <span>Incoming Service Inquiries / Leads ({pendingRequests.length})</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{req.clientName}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Contact: {req.contactName}</p>
                      </div>
                      {req.proposedRate && (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60 rounded text-[11px] font-bold">
                          ₹{req.proposedRate}/reel
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      {req.projectDetails}
                    </p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1"><Phone size={12} /> {req.contactPhone}</span>
                      <span className="flex items-center gap-1"><Mail size={12} /> {req.contactEmail}</span>
                      {req.instagram && (
                        <a href={req.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                          <Instagram size={12} /> Instagram
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => handleDeclineRequest(req)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Accept & Create Client
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Global Payment Reminders Bar across clients (if any client has payment due or delayed) */}
      {!isNotificationDismissed && notificationClients.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 shadow-sm space-y-3 relative">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-bold text-sm">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 animate-bounce" size={20} />
              <span>Payment Cycle Reminders ({notificationClients.length} Action Required)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">30-Day Recurring Cycle Alerts</span>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationDismissed(true)}
            className="absolute top-4 right-4 text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/40 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Dismiss notification"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {notificationClients.map(({ client, statusInfo, financials }) => (
              <div
                key={client.id}
                className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-amber-200 dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{client.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Due Date: {new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN')}
                    {financials.totalPendingAmount > 0 && (
                      <span className="font-semibold text-rose-600 ml-2">
                        ₹{financials.totalPendingAmount.toLocaleString('en-IN')} due
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                  <button
                    onClick={() => setSelectedClientId(client.id)}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded text-xs font-semibold transition-colors"
                  >
                    Dashboard
                  </button>
                  <a
                    href={generateWhatsAppReminder(client, statusInfo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                    title="Send WhatsApp Reminder"
                  >
                    <Send size={12} />
                  </a>
                  {client.emailRemindersEnabled !== false && (
                    <a
                      href={generateEmailReminder(client, statusInfo).mailtoLink}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors"
                      title="Send Email Reminder"
                    >
                      <Mail size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => triggerBrowserOverdueAlert(client.name, statusInfo.label, statusInfo.notificationMessage, user?.uid)}
                    className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                    title="Trigger FCM Device Push Notification"
                  >
                    <AlertTriangle size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Client Form Modal */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{isEditing ? 'Edit Client Profile' : 'Add New Client Profile'}</h3>
            <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="e.g. Acme Media Studio"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="client@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Logo URL (Optional)</label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Instagram Handle / URL (Optional)</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="@username or link"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client Acquisition Source</label>
              <input
                type="text"
                value={formData.clientFrom}
                onChange={e => setFormData({ ...formData, clientFrom: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="e.g. LinkedIn, Referral, Cold Outreach"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Previous Work Experience (Optional)</label>
              <input
                type="text"
                value={formData.workExperience}
                onChange={e => setFormData({ ...formData, workExperience: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="e.g. 6 months, 20+ videos completed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Last Payment Received Date *</label>
              <input
                required
                type="date"
                value={formData.lastPaymentDate}
                onChange={e => setFormData({ ...formData, lastPaymentDate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Rate per Reel/Video (₹) *</label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={formData.defaultRate}
                onChange={e => setFormData({ ...formData, defaultRate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="e.g. 1500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">On Site Shoot Rate (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.onSiteShootRate}
                onChange={e => setFormData({ ...formData, onSiteShootRate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="e.g. 5000"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Website Making Rate (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.websiteMakingRate}
                onChange={e => setFormData({ ...formData, websiteMakingRate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-600 dark:focus:border-indigo-400"
                placeholder="e.g. 15000"
              />
            </div>

            <div className="md:col-span-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <label htmlFor="emailRemindersToggle" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                    Enable Overdue Payment Email Reminders
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically draft email reminders and trigger browser alerts when payment due dates are reached or overdue.
                  </p>
                </div>
              </div>
              <input
                id="emailRemindersToggle"
                type="checkbox"
                checked={formData.emailRemindersEnabled}
                onChange={e => setFormData({ ...formData, emailRemindersEnabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                <CheckCircle2 size={16} />
                {isEditing ? 'Save Changes' : 'Save Client Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search clients by name, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'all'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
          >
            Active ({clients.length - closedClientsCount})
          </button>

          <button
            onClick={() => setFilterType('due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${filterType === 'due'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
          >
            <Clock size={12} /> Due / Action ({notificationClients.length})
          </button>

          <button
            onClick={() => setFilterType('uptodate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'uptodate'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
          >
            Up to Date
          </button>

          {closedClientsCount > 0 && (
            <button
              onClick={() => setFilterType('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${filterType === 'closed'
                  ? 'bg-slate-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
            >
              <Archive size={12} /> Closed ({closedClientsCount})
            </button>
          )}
        </div>
      </div>

      {/* Client Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <Search size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No client profiles found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {clients.length === 0
                ? "Get started by adding your first client profile."
                : "Try adjusting your search query or filter selection."}
            </p>
          </div>
        ) : (
          filteredClients.map(({ client, statusInfo, financials }) => {
            const formattedPrevDate = client.lastPaymentDate
              ? new Date(client.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : 'Not set';

            const formattedNextDate = new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

            return (
              <div
                key={client.id}
                className={`rounded-2xl border p-6 shadow-xs transition-all group flex flex-col justify-between space-y-5 ${
                  client.isClosed
                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 opacity-75 hover:opacity-100'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  {/* Top row: Avatar & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {client.logoUrl ? (
                        <img
                          src={getDriveDirectImageUrl(client.logoUrl)}
                          alt={client.name}
                          className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0 bg-indigo-50 dark:bg-indigo-950"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=e0e7ff&color=4338ca&size=128&rounded=true&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                          {client.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID: {client.id.split('-')[0]}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const cWorkItems = workItems.filter(item => item.clientId === client.id);
                          const cInvoices = invoices.filter(inv => inv.clientId === client.id);
                          exportClientCSV(client, cWorkItems, cInvoices);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Export Work History & Invoices to CSV"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Client Profile"
                      >
                        <Edit2 size={15} />
                      </button>
                      {client.isClosed ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReopenClient(client); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Reopen Client"
                        >
                          <ArchiveRestore size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCloseClient(client); }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Close Work with Client"
                        >
                          <Archive size={15} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.name); }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Client"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Payment Status Pill & Sub-Clients Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {client.isClosed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                        <Archive size={12} /> Closed
                        {client.closedAt && (
                          <span className="font-normal opacity-70">&nbsp;· {new Date(client.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        )}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}>
                        <Clock size={12} /> {statusInfo.label}
                      </span>
                    )}
                    {client.subClients && client.subClients.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                        <Users size={12} /> {client.subClients.length} Sub-Clients
                      </span>
                    )}
                  </div>

                  {/* 30-Day Cycle Dates Row */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Prev Payment</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formattedPrevDate}</span>
                    </div>

                    <div className="border-l border-slate-200 dark:border-slate-700 pl-2.5">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Next Due</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formattedNextDate}</span>
                    </div>
                  </div>

                  {/* Financials & Rates */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Default Rate</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">₹{client.defaultRate.toLocaleString('en-IN')} / reel</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 dark:text-slate-500 block">Pending Balance</span>
                      <span className={`font-bold ${financials.totalPendingAmount > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        ₹{financials.totalPendingAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setSelectedClientId(client.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                      client.isClosed
                        ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                        : 'bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {client.isClosed ? 'View History' : 'Open Dashboard'}
                    <ChevronRight size={14} />
                  </button>
                  {client.isClosed ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReopenClient(client); }}
                      className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      title="Reopen Client"
                    >
                      <ArchiveRestore size={14} /> Reopen
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const cWorkItems = workItems.filter(item => item.clientId === client.id);
                        const cInvoices = invoices.filter(inv => inv.clientId === client.id);
                        exportClientCSV(client, cWorkItems, cInvoices);
                      }}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-200 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      title="Export Work History & Invoice Summary to CSV"
                    >
                      <Download size={14} className="text-emerald-600 dark:text-emerald-400" /> CSV
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        userId={user?.uid}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          setSearchQuery('');
        }}
      />
    </div>
  );
}
