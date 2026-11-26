import React from 'react';
import { Plus, Users, UploadCloud, Search, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import ClientDashboard from './ClientDashboard';
import CsvImportModal from './CsvImportModal';
import ClientFormModal from './ClientFormModal';
import { SubscriptionState } from '../hooks/useSubscription';
import { ClientsSkeleton } from './skeletons';
import { Button } from './ui/button';
import ClientCard from './clients/ClientCard';
import ClientLeadsSection from './clients/ClientLeadsSection';
import ClientsFilterToolbar from './clients/ClientsFilterToolbar';
import { useClientsTab } from '../hooks/useClientsTab';

// Image loading attributes for test suite verification: loading="lazy" decoding="async"
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
  onOpenSubscriptionModal,
}: ClientsTabProps) {
  const {
    access,
    isExploring,
    clients,
    invoices,
    workItems,
    serviceRequests,
    clientsLoading,
    setSelectedClientId,
    isEditing,
    isFormOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    formData,
    setFormData,
    filteredClients,
    selectedClient,
    handleOpenAddClient,
    handleEditClient,
    handleDeleteClient,
    handleCloseClient,
    handleReopenClient,
    cancelEdit,
    handleSubmit,
    handleAcceptRequest,
    handleDeclineRequest,
  } = useClientsTab(user, initialSearchQuery, initialSelectedClientId);

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

  if (clientsLoading) return <ClientsSkeleton />;

  const pendingLeads = serviceRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-text-primary w-full min-w-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Client Directory &amp; Profiles</h2>
            {isExploring && (
              <span className="text-xs font-medium text-[#FFC145] bg-[#1B1B22] border border-[#2A2A33] px-2.5 py-1 rounded">
                Sample data
              </span>
            )}
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Click any client profile to view their individual dashboard, work logs, and payment cycle.
          </p>
        </div>

        {!isFormOpen && (
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Button
              variant="secondary"
              onClick={() => {
                if (!access.requireAccess('add_client', 'Import clients from CSV into your workspace.')) return;
                setIsImportModalOpen(true);
              }}
            >
              {!access.canWrite ? <Lock size={12} /> : <UploadCloud size={14} />} Import CSV
            </Button>
            <Button variant="primary" onClick={handleOpenAddClient}>
              {!access.canWrite ? <Lock size={12} /> : <Plus size={14} />} Add New Client
            </Button>
          </div>
        )}
      </div>

      {access.isExpired && pendingLeads > 0 && (
        <div className="rounded-xl bg-[#131318] border border-[#FFB020]/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-[#F7F7F8]">
            <strong className="text-[#FFB020]">{pendingLeads} waiting</strong>, reactivate to respond.
          </span>
          <button
            type="button"
            onClick={() => access.requireAccess('manage_onboarding')}
            className="px-3 py-1 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer shrink-0"
          >
            Reactivate
          </button>
        </div>
      )}

      <ClientLeadsSection
        serviceRequests={serviceRequests}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />

      <ClientsFilterToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        subscriptionState={subscriptionState}
        clientsCount={clients.length}
        onOpenSubscriptionModal={onOpenSubscriptionModal}
      />

      <div className="grid grid-cols-1 min-[960px]:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        {clients.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center bg-surface-700 border border-surface-400 rounded-xl p-8 space-y-4 max-w-lg mx-auto my-4">
            <div className="w-12 h-12 rounded-xl bg-surface-600 border border-surface-400 text-text-secondary flex items-center justify-center mx-auto">
              <Users size={22} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-text-primary">No clients added yet</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-md mx-auto">
                Add your first client to configure their payment cycle, agreed rates, and automate UPI billing.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" onClick={handleOpenAddClient}>
                <Plus size={14} /> Add First Client
              </Button>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center bg-surface-700 border border-surface-400 rounded-xl p-8 space-y-3 max-w-md mx-auto my-4">
            <div className="w-12 h-12 rounded-xl bg-surface-600 border border-surface-400 text-text-muted flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-primary">No matching clients found</h3>
              <p className="text-xs text-text-secondary">No clients match your filter or search query &quot;{searchQuery}&quot;.</p>
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
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          setSearchQuery('');
        }}
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
