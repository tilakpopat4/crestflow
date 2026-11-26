import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Client, Invoice, WorkItem, ServiceRequest } from '../types';
import { useFirestore } from './useFirestore';
import { useAccess } from './useAccess';
import {
  SAMPLE_CLIENTS,
  SAMPLE_INVOICES,
  SAMPLE_SERVICE_REQUESTS,
  SAMPLE_WORK_ITEMS,
} from '../data/sampleWorkspaceData';
import { generateUUID } from '../lib/utils';
import { getPaymentStatusInfo, calculateClientFinancials } from '../lib/paymentUtils';
import { ClientFormData } from '../components/ClientFormModal';

const initialFormData: ClientFormData = {
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
  emailRemindersEnabled: true,
};

/**
 * Encapsulates state, sample Explorer mode fallback, and gated mutations for ClientsTab.
 */
export function useClientsTab(
  user: User | null,
  initialSearchQuery = '',
  initialSelectedClientId: string | null = null,
) {
  const access = useAccess();
  const isExploring = access.state === 'none';
  const liveUid = !isExploring ? user?.uid : undefined;

  const {
    data: fsClients,
    loading: fsClientsLoading,
    addOrUpdateItem: saveClient,
    removeItem: deleteClientFromDb,
  } = useFirestore<Client>('clients', liveUid);
  const { data: fsInvoices } = useFirestore<Invoice>('invoices', liveUid);
  const { data: fsWorkItems } = useFirestore<WorkItem>('workItems', liveUid);
  const { data: fsRequests, addOrUpdateItem: updateServiceRequest } = useFirestore<ServiceRequest>(
    'serviceRequests',
    liveUid,
  );

  const clients = isExploring ? SAMPLE_CLIENTS : fsClients;
  const invoices = isExploring ? SAMPLE_INVOICES : fsInvoices;
  const workItems = isExploring ? SAMPLE_WORK_ITEMS : fsWorkItems;
  const serviceRequests = isExploring ? SAMPLE_SERVICE_REQUESTS : fsRequests;
  const clientsLoading = isExploring ? false : fsClientsLoading;

  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialSelectedClientId);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filterType, setFilterType] = useState<'all' | 'due' | 'uptodate' | 'closed'>('all');
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);

  useEffect(() => {
    if (initialSearchQuery !== undefined) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialSelectedClientId) setSelectedClientId(initialSelectedClientId);
  }, [initialSelectedClientId]);

  const clientStatuses = clients.map((c) => ({
    client: c,
    statusInfo: getPaymentStatusInfo(c, invoices, workItems),
    financials: calculateClientFinancials(c.id, invoices, workItems),
  }));

  const handleOpenAddClient = () => {
    if (!access.requireAccess('add_client', 'Add unlimited clients with per-reel or monthly retainer billing.')) {
      return;
    }
    setIsEditing(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleEditClient = (c: Client) => {
    if (!access.requireAccess('edit_client', 'Update client billing rates, contacts, and cycles.')) return;
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
      monthlyRetainerAmount: c.monthlyRetainerAmount ? String(c.monthlyRetainerAmount) : isMonthly ? String(c.defaultRate) : '',
      defaultRate: String(c.defaultRate),
      onSiteShootRate: c.onSiteShootRate ? String(c.onSiteShootRate) : '',
      websiteMakingRate: c.websiteMakingRate ? String(c.websiteMakingRate) : '',
      lastPaymentDate: c.lastPaymentDate ? new Date(c.lastPaymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      emailRemindersEnabled: c.emailRemindersEnabled !== false,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!access.requireAccess('edit_client', 'Modify or delete client profiles.')) return;
    if (confirm(`Are you sure you want to delete client "${name}"?`)) {
      await deleteClientFromDb(id);
      if (selectedClientId === id) setSelectedClientId(null);
    }
  };

  const handleCloseClient = async (client: Client) => {
    if (!access.requireAccess('edit_client', 'Archive or reopen client engagements.')) return;
    if (!confirm(`Close work with "${client.name}"?\n\nTheir data will be preserved in history.`)) return;
    try { await saveClient({ ...client, isClosed: true, closedAt: Date.now() }); }
    catch (err: any) { alert('Failed to close client: ' + (err?.message || String(err))); }
  };

  const handleReopenClient = async (client: Client) => {
    if (!access.requireAccess('edit_client', 'Archive or reopen client engagements.')) return;
    try { await saveClient({ ...client, isClosed: false, closedAt: undefined }); }
    catch (err: any) { alert('Failed to reopen client: ' + (err?.message || String(err))); }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access.requireAccess(isEditing ? 'edit_client' : 'add_client')) return;
    try {
      const paymentDateTimestamp = formData.lastPaymentDate ? new Date(formData.lastPaymentDate).getTime() : Date.now();
      const rateVal = formData.paymentBasis === 'monthly_retainer' && formData.monthlyRetainerAmount
        ? Number(formData.monthlyRetainerAmount) || 0
        : Number(formData.defaultRate) || 0;

      const baseData = {
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
    if (!access.requireAccess('manage_onboarding', 'Convert incoming client requests directly into active projects.')) return;
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
    if (!access.requireAccess('manage_onboarding', 'Manage incoming client onboarding requests.')) return;
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

  return {
    access, isExploring, clients, invoices, workItems, serviceRequests, clientsLoading,
    selectedClientId, setSelectedClientId, isEditing, isFormOpen, isImportModalOpen, setIsImportModalOpen,
    searchQuery, setSearchQuery, filterType, setFilterType, formData, setFormData,
    filteredClients, selectedClient: clients.find((c) => c.id === selectedClientId),
    handleOpenAddClient, handleEditClient, handleDeleteClient, handleCloseClient, handleReopenClient,
    cancelEdit, handleSubmit, handleAcceptRequest, handleDeclineRequest,
  };
}
