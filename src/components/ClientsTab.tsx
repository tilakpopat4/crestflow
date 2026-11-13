import React, { useState } from 'react';
import { Client, Invoice, WorkItem, ServiceRequest } from '../types';
import {
  Plus, Edit2, Trash2, CheckCircle2, X, Search, Calendar,
  Clock, Phone, Mail, ArrowRight, AlertTriangle, Send, ShieldAlert,
  ChevronRight, Filter, Download, Users, UploadCloud, Briefcase, Instagram, Archive, ArchiveRestore, Film
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { User } from 'firebase/auth';
import { generateUUID, getDriveDirectImageUrl } from '../lib/utils';
import { exportClientCSV } from '../lib/csvExport';
import {
  getPaymentStatusInfo,
  calculateClientFinancials
} from '../lib/paymentUtils';
import ClientDashboard from './ClientDashboard';
import CsvImportModal from './CsvImportModal';
import StatusBadge from './StatusBadge';
import ClientFormModal, { ClientFormData } from './ClientFormModal';
import { SubscriptionState } from '../hooks/useSubscription';
import { getCurrencySymbol, formatCurrencyAmount } from '../lib/currencyUtils';

interface ClientsTabProps {
  user: User | null;
  initialSearchQuery?: string;
  initialSelectedClientId?: string | null;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

export default function ClientsTab({
  user,
  initialSearchQuery = '',
  initialSelectedClientId = null,
  subscriptionState,
  onOpenSubscriptionModal
}: ClientsTabProps) {
  const { data: clients, loading: clientsLoading, addOrUpdateItem: saveClient, removeItem: deleteClientFromDb } = useFirestore<Client>('clients', user?.uid);
  const { data: invoices } = useFirestore<Invoice>('invoices', user?.uid);
  const { data: workItems } = useFirestore<WorkItem>('workItems', user?.uid);
  const { data: serviceRequests, addOrUpdateItem: updateServiceRequest } = useFirestore<ServiceRequest>('serviceRequests', user?.uid);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialSelectedClientId);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleOpenAddClient = () => {
    if (subscriptionState && !subscriptionState.canCreateClient(clients.length)) {
      if (onOpenSubscriptionModal) {
        onOpenSubscriptionModal();
      } else {
        alert(`Free plan limit reached (${subscriptionState.limits.maxClients} clients). Upgrade to Pro for unlimited clients.`);
      }
      return;
    }
    setIsEditing(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      currency: 'INR',
      logoUrl: '',
      instagram: '',
      clientFrom: '',
      workExperience: '',
      paymentBasis: 'per_reel',
      monthlyRetainerAmount: '',
      defaultRate: '',
      onSiteShootRate: '',
      websiteMakingRate: '',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      emailRemindersEnabled: true
    });
    setIsFormOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filterType, setFilterType] = useState<'all' | 'due' | 'uptodate' | 'closed'>('all');

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

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    phone: '',
    email: '',
    currency: 'INR',
    logoUrl: '',
    instagram: '',
    clientFrom: '',
    workExperience: '',
    paymentBasis: 'per_reel' as 'per_reel' | 'monthly_retainer',
    monthlyRetainerAmount: '',
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
      let paymentDateTimestamp = Date.now();
      if (formData.lastPaymentDate) {
        const parsed = new Date(formData.lastPaymentDate).getTime();
        if (!isNaN(parsed)) {
          paymentDateTimestamp = parsed;
        }
      }

      const rateVal = formData.paymentBasis === 'monthly_retainer' && formData.monthlyRetainerAmount
        ? Number(formData.monthlyRetainerAmount) || 0
        : Number(formData.defaultRate) || 0;

      if (isEditing) {
        const existing = clients.find(c => c.id === isEditing);
        if (existing) {
          const updatedClient: Client = {
            ...existing,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            currency: formData.currency || 'INR',
            logoUrl: formData.logoUrl?.trim() || undefined,
            instagram: formData.instagram,
            clientFrom: formData.clientFrom,
            workExperience: formData.workExperience,
            paymentBasis: formData.paymentBasis,
            monthlyRetainerAmount: formData.paymentBasis === 'monthly_retainer' && formData.monthlyRetainerAmount ? Number(formData.monthlyRetainerAmount) : undefined,
            defaultRate: rateVal,
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
        if (subscriptionState && !subscriptionState.canCreateClient(clients.length)) {
          if (onOpenSubscriptionModal) {
            onOpenSubscriptionModal();
          } else {
            alert(`Free plan limit reached (${subscriptionState.limits.maxClients} clients). Upgrade to Pro for unlimited clients.`);
          }
          return;
        }

        const newClient: Client = {
          id: generateUUID(),
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          currency: formData.currency || 'INR',
          logoUrl: formData.logoUrl?.trim() || undefined,
          instagram: formData.instagram,
          clientFrom: formData.clientFrom,
          workExperience: formData.workExperience,
          paymentBasis: formData.paymentBasis,
          monthlyRetainerAmount: formData.paymentBasis === 'monthly_retainer' && formData.monthlyRetainerAmount ? Number(formData.monthlyRetainerAmount) : undefined,
          defaultRate: rateVal,
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
        paymentBasis: 'per_reel',
        monthlyRetainerAmount: '',
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
    const isMonthly = c.paymentBasis === 'monthly_retainer' || Boolean(c.monthlyRetainerAmount && c.monthlyRetainerAmount > 0);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      currency: c.currency || 'INR',
      logoUrl: c.logoUrl || '',
      instagram: c.instagram || '',
      clientFrom: c.clientFrom || '',
      workExperience: c.workExperience || '',
      paymentBasis: isMonthly ? 'monthly_retainer' : 'per_reel',
      monthlyRetainerAmount: c.monthlyRetainerAmount ? String(c.monthlyRetainerAmount) : (isMonthly ? String(c.defaultRate) : ''),
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
      clientFrom: '',
      workExperience: '',
      paymentBasis: 'per_reel',
      monthlyRetainerAmount: '',
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
      <>
        <ClientDashboard
          client={selectedClient}
          user={user}
          onBack={() => setSelectedClientId(null)}
          onEditClient={handleEditClient}
        />
        {isFormOpen && (
          <ClientFormModal
            isOpen={isFormOpen}
            isEditing={isEditing}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onClose={cancelEdit}
          />
        )}
      </>
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
        notes: `Client onboarding request submitted on ${new Date(request.createdAt).toLocaleDateString()}:\n${request.projectDetails}`
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
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[360px] select-none">
        <div className="relative flex items-center justify-center mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800" />
          <div className="absolute w-8 h-8 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
        </div>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Loading clients...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Client Directory & Profiles</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Click any client profile to view their individual dashboard, work logs, and 30-day payment cycle.
          </p>
        </div>

        {!isFormOpen && (
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs flex-1 md:flex-none cursor-pointer"
            >
              <UploadCloud size={15} />
              <span>Import CSV</span>
            </button>
            <button
              onClick={handleOpenAddClient}
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-[#282828] hover:bg-[#383838] text-white border border-[#3a3a3a] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs flex-1 md:flex-none cursor-pointer"
            >
              <Plus size={15} />
              <span>Add New Client</span>
            </button>
          </div>
        )}
      </div>

      {/* Service Claims / Inquiries (Leads) */}
      {(() => {
        const pendingRequests = serviceRequests.filter(req => req.status === 'pending');
        if (pendingRequests.length === 0) return null;
        return (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <Briefcase className="text-indigo-600 dark:text-indigo-400" size={20} />
              <span>Incoming Client Onboardings / Inquiries ({pendingRequests.length})</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{req.clientName}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Contact: {req.contactName}</p>
                      </div>
                      {req.proposedRate && (
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          ₹{req.proposedRate}/reel
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg">
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

      {/* Add / Edit Client Form Modal */}
      {isFormOpen && (
        <ClientFormModal
          isOpen={isFormOpen}
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={cancelEdit}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs w-full min-w-0">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Search clients by name, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0 max-w-full">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${filterType === 'all'
                ? 'bg-[#383838] text-white shadow-xs'
                : 'bg-[#242424] text-slate-300 hover:bg-[#303030] hover:text-white active:bg-[#383838]'
              }`}
          >
            Active ({clients.length - closedClientsCount})
          </button>

          <button
            onClick={() => setFilterType('due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
              filterType === 'due'
                ? 'bg-[#383838] text-white shadow-xs'
                : 'bg-[#242424] text-slate-300 hover:bg-[#303030] hover:text-white active:bg-[#383838]'
            }`}
          >
            <Clock size={12} className="shrink-0" /> Due ({notificationClients.length})
          </button>

          <button
            onClick={() => setFilterType('uptodate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filterType === 'uptodate'
                ? 'bg-[#383838] text-white shadow-xs'
                : 'bg-[#242424] text-slate-300 hover:bg-[#303030] hover:text-white active:bg-[#383838]'
            }`}
          >
            Up to Date
          </button>

          {closedClientsCount > 0 && (
            <button
              onClick={() => setFilterType('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${filterType === 'closed'
                  ? 'bg-[#383838] text-white shadow-xs'
                  : 'bg-[#242424] text-slate-300 hover:bg-[#303030] hover:text-white active:bg-[#383838]'
                }`}
            >
              <Archive size={12} className="shrink-0" /> Closed ({closedClientsCount})
            </button>
          )}
        </div>
      </div>

      {/* Free Tier Usage Notice */}
      {subscriptionState && !subscriptionState.isPro && subscriptionState.isSubscriptionFeatureEnabled && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300">
          <span>Free Plan: <strong className="font-semibold text-slate-900 dark:text-slate-100">{clients.length} / {subscriptionState.limits.maxClients}</strong> clients used.</span>
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

      {/* Client Profiles Grid */}
      <div className="grid grid-cols-1 min-[960px]:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {clients.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center bg-[#282828] rounded-xl p-8 space-y-4 max-w-lg mx-auto my-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#333333] text-slate-300 flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">No clients added yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Add your first client to configure their payment cycle, agreed rates, and automate UPI billing without chasing.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenAddClient}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add First Client
              </button>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center bg-white dark:bg-slate-800 rounded-2xl p-8 space-y-4 max-w-xl mx-auto my-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 flex items-center justify-center mx-auto">
              <Search size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No matching clients found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No clients match your filter or search query "{searchQuery}".
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredClients.map(({ client, statusInfo, financials }) => {
            const formattedPrevDate = client.lastPaymentDate && !isNaN(new Date(client.lastPaymentDate).getTime())
              ? new Date(client.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : 'Not set';

            const nextDueTime = new Date(statusInfo.nextDueDate).getTime();
            const formattedNextDate = !isNaN(nextDueTime)
              ? new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : '—';

            return (
              <div
                key={client.id}
                className={`rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xs transition-all group flex flex-col justify-between space-y-3.5 sm:space-y-4 md:space-y-5 overflow-hidden w-full min-w-0 ${
                  client.isClosed
                    ? 'bg-slate-50 dark:bg-slate-900/50 opacity-75 hover:opacity-100'
                    : 'bg-white dark:bg-slate-800 hover:shadow-md'
                }`}
              >
                <div className="space-y-3 sm:space-y-4 min-w-0 w-full">
                  {/* Top row: Avatar & Client Name & Action Buttons */}
                  <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {client.logoUrl ? (
                        <img
                          src={getDriveDirectImageUrl(client.logoUrl)}
                          alt={client.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shadow-xs shrink-0 bg-indigo-50 dark:bg-indigo-950"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=e0e7ff&color=4338ca&size=128&rounded=true&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-base sm:text-lg shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug truncate" title={client.name}>
                          {client.name}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">ID: {client.id.split('-')[0]}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const cWorkItems = workItems.filter(item => item.clientId === client.id);
                          const cInvoices = invoices.filter(inv => inv.clientId === client.id);
                          exportClientCSV(client, cWorkItems, cInvoices);
                        }}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Export Work History & Invoices to CSV"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Client Profile"
                      >
                        <Edit2 size={14} />
                      </button>
                      {client.isClosed ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReopenClient(client); }}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Reopen Client"
                        >
                          <ArchiveRestore size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCloseClient(client); }}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Close Work with Client"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.name); }}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Client"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Payment Status Pill & Sub-Clients Badge */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                    {client.isClosed && (
                      <StatusBadge 
                        status="Closed" 
                        label={`Closed${client.closedAt ? ` · ${new Date(client.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}`} 
                      />
                    )}
                    {client.subClients && client.subClients.length > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal inline-flex items-center gap-1">
                        <Users size={12} className="shrink-0 text-slate-400" /> {client.subClients.length} Subs
                      </span>
                    )}
                    {client.paymentBasis === 'monthly_retainer' && (
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Monthly Retainer
                      </span>
                    )}
                  </div>

                  {/* 30-Day Cycle Dates Row */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 sm:p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs w-full min-w-0">
                    <div className="min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">Prev Payment</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate block mt-0.5">{formattedPrevDate}</span>
                    </div>

                    <div className="border-l border-slate-200 dark:border-slate-700 pl-2 sm:pl-2.5 min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">Next Due</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate block mt-0.5">{formattedNextDate}</span>
                    </div>
                  </div>

                  {/* Financials & Rates */}
                  <div className="flex items-center justify-between text-xs pt-0.5 sm:pt-1 gap-2 w-full min-w-0">
                    <div className="min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px] sm:text-xs truncate">
                        {client.paymentBasis === 'monthly_retainer' ? 'Retainer' : 'Default Rate'}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm truncate block mt-0.5">
                        {formatCurrencyAmount(client.paymentBasis === 'monthly_retainer' ? (client.monthlyRetainerAmount || client.defaultRate) : client.defaultRate, client.currency)}
                        {client.paymentBasis === 'monthly_retainer' ? ' / mo' : ' / reel'}
                      </span>
                    </div>

                    <div className="text-right min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px] sm:text-xs truncate">Pending</span>
                      <span className={`font-bold text-xs sm:text-sm truncate block mt-0.5 ${financials.totalPendingAmount > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatCurrencyAmount(financials.totalPendingAmount, client.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-1 w-full min-w-0">
                  <button
                    onClick={() => setSelectedClientId(client.id)}
                    className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                      client.isClosed
                        ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                        : 'bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <span className="truncate">{client.isClosed ? 'View History' : 'Open Dashboard'}</span>
                    <ChevronRight size={14} className="shrink-0" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClient(client);
                    }}
                    className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    title="Edit Client Profile"
                  >
                    <Edit2 size={14} />
                  </button>
                  {client.isClosed ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReopenClient(client); }}
                      className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
                      title="Reopen Client"
                    >
                      <ArchiveRestore size={14} /> <span className="hidden min-[380px]:inline">Reopen</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const cWorkItems = workItems.filter(item => item.clientId === client.id);
                        const cInvoices = invoices.filter(inv => inv.clientId === client.id);
                        exportClientCSV(client, cWorkItems, cInvoices);
                      }}
                      className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
                      title="Export Work History & Invoice Summary to CSV"
                    >
                      <Download size={14} className="text-slate-500 dark:text-slate-400 shrink-0" /> <span>CSV</span>
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
