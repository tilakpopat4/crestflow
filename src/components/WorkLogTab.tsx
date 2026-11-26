import React from 'react';
import { User } from 'firebase/auth';
import { WorkLogSkeleton } from './skeletons';
import GoogleDriveUploadModal from './GoogleDriveUploadModal';
import MediaEmbedModal from './MediaEmbedModal';
import BulkEditWorkModal from './BulkEditWorkModal';
import { useWorkLog } from '../hooks/useWorkLog';
import { useAccess } from '../hooks/useAccess';
import WorkLogToolbar from './work-log/WorkLogToolbar';
import WorkLogFormCard from './work-log/WorkLogFormCard';
import WorkLogEmptyState from './work-log/WorkLogEmptyState';
import WorkLogTable from './work-log/WorkLogTable';
import WorkLogBulkToolbar from './work-log/WorkLogBulkToolbar';

interface WorkLogTabProps {
  user: User;
  initialSearchQuery?: string;
  onNavigateToClients?: () => void;
}

/**
 * Work Log tab view.
 * Header title scaling: text-2xl sm:text-3xl
 * Empty state primary action: Log First Work Item
 * Track deliverables, manage video embeds, bulk edit line items, and aggregate billable services.
 */
export function WorkLogTab({ user, initialSearchQuery = '', onNavigateToClients }: WorkLogTabProps) {
  const access = useAccess();
  const isExploring = access.state === 'none';
  const {
    clients,
    workItems,
    invoices,
    clientsLoading,
    workLoading,
    invoicesLoading,
    isFormOpen,
    setIsFormOpen,
    isDriveModalOpen,
    setIsDriveModalOpen,
    embedModalData,
    setEmbedModalData,
    editingWorkId,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    selectedWorkIds,
    setSelectedWorkIds,
    isBulkEditModalOpen,
    setIsBulkEditModalOpen,
    showClosed,
    setShowClosed,
    formData,
    setFormData,
    closedClientIds,
    handleEditWork,
    handleCancel,
    handleSubmit,
    deleteWork,
    toggleSelectItem,
    handleSelectAll,
    handleBulkDelete,
    handleBulkSave,
    sortedWork,
    allVisibleSelected,
    someVisibleSelected,
    selectedCount,
    selectedItems,
    selectedInvoicedCount,
    addOrUpdateItem,
  } = useWorkLog(user, initialSearchQuery);

  if (clientsLoading || workLoading || invoicesLoading) {
    return <WorkLogSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0">
      <WorkLogToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        closedCount={closedClientIds.size}
        showClosed={showClosed}
        setShowClosed={setShowClosed}
        isFormOpen={isFormOpen}
        canWrite={access.canWrite}
        isExploring={isExploring}
        onOpenDrive={() => {
          if (!access.requireAccess('log_work', 'Upload video previews to Google Drive.')) return;
          setIsDriveModalOpen(true);
        }}
        onOpenForm={() => {
          if (!access.requireAccess('log_work', 'Log deliverables and billable client tasks.')) return;
          setIsFormOpen(true);
        }}
      />

      {isFormOpen && (
        <WorkLogFormCard
          editingWorkId={editingWorkId}
          formData={formData}
          setFormData={setFormData}
          clients={clients}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onOpenDrive={() => setIsDriveModalOpen(true)}
        />
      )}

      {sortedWork.length === 0 ? (
        <WorkLogEmptyState
          hasClients={clients.length > 0}
          hasWorkItems={workItems.length > 0}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
          onOpenForm={() => {
            if (!access.requireAccess('log_work', 'Log your first deliverable or client task.')) return;
            setIsFormOpen(true);
          }}
          onNavigateToClients={onNavigateToClients}
        />
      ) : (
        <WorkLogTable
          sortedWork={sortedWork}
          clients={clients}
          selectedWorkIds={selectedWorkIds}
          allVisibleSelected={allVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          selectedCount={selectedCount}
          onSelectAll={handleSelectAll}
          onToggleSelect={toggleSelectItem}
          onEditWork={handleEditWork}
          onDeleteWork={deleteWork}
          onOpenEmbed={setEmbedModalData}
        />
      )}

      <WorkLogBulkToolbar
        selectedCount={selectedCount}
        selectedInvoicedCount={selectedInvoicedCount}
        onOpenBulkEdit={() => {
          if (!access.requireAccess('log_work', 'Bulk edit work items across clients.')) return;
          setIsBulkEditModalOpen(true);
        }}
        onBulkDelete={handleBulkDelete}
        onDeselectAll={() => setSelectedWorkIds(new Set())}
      />

      {isBulkEditModalOpen && (
        <BulkEditWorkModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          selectedItems={selectedItems}
          clients={clients}
          invoices={invoices}
          onSave={handleBulkSave}
        />
      )}

      <GoogleDriveUploadModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        clients={clients}
        defaultClientId={formData.clientId}
        onWorkItemCreated={async (newWork) => {
          await addOrUpdateItem(newWork);
          setIsDriveModalOpen(false);
        }}
        onLinkGenerated={(result) => {
          setFormData((prev) => ({
            ...prev,
            videoUrl: result.webViewLink,
            description: prev.description.trim() ? prev.description : result.name,
          }));
        }}
      />

      {embedModalData && (
        <MediaEmbedModal
          isOpen={embedModalData.isOpen}
          onClose={() => setEmbedModalData(null)}
          url={embedModalData.url}
          title={embedModalData.title}
          clientName={embedModalData.clientName}
        />
      )}
    </div>
  );
}

export default WorkLogTab;
