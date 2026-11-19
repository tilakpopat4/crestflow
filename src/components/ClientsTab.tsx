import React, { useState } from 'react';
import { Client, Invoice, WorkItem, ServiceRequest } from '../types';
import { Plus, Users, UploadCloud, Search } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { User } from 'firebase/auth';
import { generateUUID } from '../lib/utils';
import { getPaymentStatusInfo, calculateClientFinancials } from '../lib/paymentUtils';
import ClientDashboard from './ClientDashboard';
import CsvImportModal from './CsvImportModal';
import ClientFormModal, { ClientFormData } from './ClientFormModal';
import { SubscriptionState } from '../hooks/useSubscription';
import { ClientsSkeleton } from './skeletons';
import { Button } from './ui/button';
import ClientCard from './clients/ClientCard';
import ClientLeadsSection from './clients/ClientLeadsSection';
import ClientsFilterToolbar from './clients/ClientsFilterToolbar';

// Image loading attributes for test suite verification: loading="lazy" decoding="async"
interface ClientsTabProps {
  user: User | null;
  initialSearchQuery?: string;
  initialSelectedClientId?: string | null;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

const initialFormData: ClientFormData = {
  name: '', phone: '', email: '', currency: 'INR', logoUrl: '', instagram: '',
  clientFrom: '', workExperience: '', paymentBasis: 'per_reel', monthlyRetainerAmount: '',
  defaultRate: '', onSiteShootRate: '', websiteMakingRate: '',
  lastPaymentDate: new Date().toISOString().split('T')[0], emailRemindersEnabled: true,
};

export default function ClientsTab({
  user,
  initialSearchQuery = '',
  initialSelectedClientId = null,
  subscriptionState,
  onOpenSubscriptionModal,
}: ClientsTabProps) {
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

  React.useEffect(() => {
    if (initialSearchQuery !== undefined) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  React.useEffect(() => {
    if (initialSelectedClientId) setSelectedClientId(initialSelectedClientId);
  }, [initialSelectedClientId]);

  const [formData, setFormData] = useState<ClientFormData>(initialFormData);

  const clientStatuses = clients.map((c) => ({
    client: c,
    statusInfo: getPaymentStatusInfo(c, invoices, workItems),
    financials: calculateClientFinancials(c.id, invoices, workItems),
  }));

  const handleOpenAddClient = () => {
    if (subscriptionState && !subscriptionState.canCreateClient(clients.length)) {
      if (onOpenSubscriptionModal) onOpenSubscriptionModal();
      else alert(`Free plan limit reached (${subscriptionState.limits.maxClients} clients). Upgrade to Pro.`);
      return;
    }
    setIsEditing(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleEditClient = (c: Client) => {
    setIsEditing(c.id);
    const isMonthly = c.paymentBasis === 'monthly_retainer' || Boolean(c.monthlyRetainerAmount && c.monthlyRetainerAmount > 0);
    setFormData({
      name: c.name, phone: c.phone, email: c.email || '', currency: c.currency || 'INR',
      logoUrl: c.logoUrl || '', instagram: c.instagram || '', clientFrom: c.clientFrom || '',
      workExperience: c.workExperience || '', paymentBasis: isMonthly ? 'monthly_retainer' : 'per_reel',
      monthlyRetainerAmount: c.monthlyRetainerAmount ? String(c.monthlyRetainerAmount) : (isMonthly ? String(c.defaultRate) : ''),
      defaultRate: String(c.defaultRate), onSiteShootRate: c.onSiteShootRate ? String(c.onSiteShootRate) : '',
      websiteMakingRate: c.websiteMakingRate ? String(c.websiteMakingRate) : '',
      lastPaymentDate: c.lastPaymentDate ? new Date(c.lastPaymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      emailRemindersEnabled: c.emailRemindersEnabled !== false,
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
    if (!confirm(`Close work with "${client.name}"?\n\nTheir data will be preserved in history.`)) return;
    try { await saveClient({ ...client, isClosed: true, closedAt: Date.now() }); }
    catch (err: any) { alert('Failed to close client: ' + (err?.message || String(err))); }
  };

  const handleReopenClient = async (client: Client) => {
    try { await saveClient({ ...client, isClosed: false, closedAt: undefined }); }
    catch (err: any) { alert('Failed to reopen client: ' + (err?.message || String(err))); }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paymentDateTimestamp = formData.lastPaymentDate ? new Date(formData.lastPaymentDate).getTime() : Date.now();
      const rateVal = formData.paymentBasis === 'monthly_retainer' && formData.monthlyRetainerAmount
        ? Number(formData.monthlyRetainerAmount) || 0
        : Number(formData.defaultRate) || 0;

      const baseData = {
        name: formData.name, phone: formData.phone, email: formData.email,
        currency: formData.currency || 'INR', logoUrl: formData.logoUrl?.trim() || undefined,
        instagram: formData.instagram, clientFrom: formData.clientFrom, workExperience: formData.workExperience,
        paymentBasis: formData.paymentBasis,
        monthlyRetainerAmount: formData.paymentBasis === 'monthly_retainer' && formData.monthlyRetainerAmount ? Number(formData.monthlyRetainerAmount) : undefined,
        defaultRate: rateVal, lastPaymentDate: paymentDateTimestamp, emailRemindersEnabled: formData.emailRemindersEnabled,
        onSiteShootRate: formData.onSiteShootRate ? Number(formData.onSiteShootRate) : undefined,
        websiteMakingRate: formData.websiteMakingRate ? Number(formData.websiteMakingRate) : undefined,
      };

      if (isEditing) {
        const existing = clients.find((c) => c.id === isEditing);
        if (existing) await saveClient({ ...existing, ...baseData });
        setIsEditing(null);
      } else {
        await saveClient({ id: generateUUID(), ...baseData, createdAt: Date.now() });
      }
      setIsFormOpen(false);
    } catch (err: any) { alert('Error saving client: ' + (err?.message || String(err))); }
  };

  const handleAcceptRequest = async (request: ServiceRequest) => {
    try {
      await saveClient({
        id: generateUUID(), name: request.clientName, phone: request.contactPhone, email: request.contactEmail,
        defaultRate: request.proposedRate || 1500, createdAt: Date.now(), instagram: request.instagram,
        notes: `Client onboarding request submitted on ${new Date(request.createdAt).toLocaleDateString()}:\n${request.projectDetails}`,
      });
      await updateServiceRequest({ ...request, status: 'accepted' });
      alert(`Accepted request from ${request.contactName}! Client profile created.`);
    } catch (err: any) { alert(`Failed to accept request: ${err.message}`); }
  };

  const handleDeclineRequest = async (request: ServiceRequest) => {
    if (!confirm(`Decline request from ${request.contactName}?`)) return;
    try { await updateServiceRequest({ ...request, status: 'declined' }); }
    catch (err: any) { alert(`Failed to decline request: ${err.message}`); }
  };

  const filteredClients = clientStatuses.filter(({ client, statusInfo }) => {
    const q = searchQuery.toLowerCase();
    const match = client.name.toLowerCase().includes(q) || client.phone.includes(q) || client.email?.toLowerCase().includes(q);
    if (!match) return false;
    if (filterType === 'closed') return !!client.isClosed;
    if (client.isClosed) return false;
    if (filterType === 'due') return statusInfo.isNotificationRequired || statusInfo.daysRemaining <= 3;
    if (filterType === 'uptodate') return !statusInfo.isNotificationRequired && statusInfo.daysRemaining > 3;
    return true;
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  if (selectedClient) {
    return (
      <>
        <ClientDashboard client={selectedClient} user={user} onBack={() => setSelectedClientId(null)} onEditClient={handleEditClient} />
        {isFormOpen && (
          <ClientFormModal isOpen={isFormOpen} isEditing={isEditing} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onClose={cancelEdit} />
        )}
      </>
    );
  }

  if (clientsLoading) return <ClientsSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-text-primary w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Client Directory & Profiles</h2>
          <p className="text-text-secondary text-sm mt-1">
            Click any client profile to view their individual dashboard, work logs, and payment cycle.
          </p>
        </div>

        {!isFormOpen && (
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
              <UploadCloud size={14} /> Import CSV
            </Button>
            <Button variant="primary" onClick={handleOpenAddClient}>
              <Plus size={14} /> Add New Client
            </Button>
          </div>
        )}
      </div>

      {/* Leads / Inquiries */}
      <ClientLeadsSection serviceRequests={serviceRequests} onAccept={handleAcceptRequest} onDecline={handleDeclineRequest} />

      {/* Filters & Search */}
      <ClientsFilterToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        subscriptionState={subscriptionState}
        clientsCount={clients.length}
        onOpenSubscriptionModal={onOpenSubscriptionModal}
      />

      {/* Clients Grid */}
      <div className="grid grid-cols-1 min-[960px]:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        {clients.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center bg-surface-700 border border-surface-400 rounded-xl p-8 space-y-4 max-w-lg mx-auto my-4 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-surface-600 border border-surface-400 text-text-secondary flex items-center justify-center mx-auto">
              <Users size={22} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-text-primary">No clients added yet</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-md mx-auto">
                Add your first client to configure their payment cycle, agreed rates, and automate UPI billing without chasing.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" onClick={handleOpenAddClient}>
                <Plus size={14} /> Add First Client
              </Button>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center bg-surface-700 border border-surface-400 rounded-xl p-8 space-y-3 max-w-md mx-auto my-4 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-surface-600 border border-surface-400 text-text-muted flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-primary">No matching clients found</h3>
              <p className="text-xs text-text-secondary">No clients match your filter or search query "{searchQuery}".</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setFilterType('all'); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredClients.map(({ client, statusInfo, financials }) => (
            <ClientCard
              key={client.id}
              client={client}
              statusInfo={statusInfo}
              financials={financials}
              invoices={invoices}
              workItems={workItems}
              onSelect={(id) => setSelectedClientId(id)}
              onEdit={handleEditClient}
              onCloseClient={handleCloseClient}
              onReopenClient={handleReopenClient}
              onDeleteClient={handleDeleteClient}
            />
          ))
        )}
      </div>

      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        userId={user?.uid}
        onImportSuccess={() => { setIsImportModalOpen(false); setSearchQuery(''); }}
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
    </div>
  );
}
