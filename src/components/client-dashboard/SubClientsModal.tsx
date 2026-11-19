import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Client, SubClient, WorkItem } from '../../types';
import { generateUUID } from '../../lib/utils';
import SubClientItem from './SubClientItem';

interface SubClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  clientWorkItems: WorkItem[];
  onUpdateClient: (updatedClient: Client) => Promise<void>;
}

const initialForm = {
  name: '',
  code: '',
  notes: '',
  logoUrl: '',
  instagram: '',
  email: '',
  phone: '',
  clientFrom: '',
  workExperience: '',
};

/**
 * Manage sub-clients and child branches for a parent client.
 */
export function SubClientsModal({
  isOpen,
  onClose,
  client,
  clientWorkItems,
  onUpdateClient,
}: SubClientsModalProps) {
  const [editingSubClientId, setEditingSubClientId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    setEditingSubClientId(null);
    setForm(initialForm);
    onClose();
  };

  const handleEditClick = (sc: SubClient) => {
    setEditingSubClientId(sc.id);
    setForm({
      name: sc.name,
      code: sc.code || '',
      notes: sc.notes || '',
      logoUrl: sc.logoUrl || '',
      instagram: sc.instagram || '',
      email: sc.email || '',
      phone: sc.phone || '',
      clientFrom: sc.clientFrom || '',
      workExperience: sc.workExperience || '',
    });
  };

  const handleDeleteClick = async (subId: string, subName: string) => {
    if (window.confirm(`Delete sub-client "${subName}"? Work items assigned to this sub-client will remain recorded.`)) {
      const updatedSubs = (client.subClients || []).filter((sc) => sc.id !== subId);
      await onUpdateClient({ ...client, subClients: updatedSubs });
      if (editingSubClientId === subId) {
        setEditingSubClientId(null);
        setForm(initialForm);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter a sub-client name.');
      return;
    }

    setIsSaving(true);
    const existingSubs = client.subClients || [];
    let updatedSubs: SubClient[];

    if (editingSubClientId) {
      updatedSubs = existingSubs.map((sc) =>
        sc.id === editingSubClientId
          ? {
              ...sc,
              name: form.name.trim(),
              code: form.code.trim() || undefined,
              notes: form.notes.trim() || undefined,
              logoUrl: form.logoUrl.trim() || undefined,
              instagram: form.instagram.trim() || undefined,
              email: form.email.trim() || undefined,
              phone: form.phone.trim() || undefined,
              clientFrom: form.clientFrom.trim() || undefined,
              workExperience: form.workExperience.trim() || undefined,
            }
          : sc
      );
    } else {
      const newSub: SubClient = {
        id: generateUUID(),
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        notes: form.notes.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        clientFrom: form.clientFrom.trim() || undefined,
        workExperience: form.workExperience.trim() || undefined,
        createdAt: Date.now(),
      };
      updatedSubs = [...existingSubs, newSub];
    }

    try {
      await onUpdateClient({ ...client, subClients: updatedSubs });
      setForm(initialForm);
      setEditingSubClientId(null);
    } catch (err: any) {
      console.error(err);
      alert('Error saving sub-client: ' + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <Users className="w-5 h-5 text-text-secondary" />
          <span>Manage Sub-Clients</span>
        </span>
      }
      description={
        <span>
          Assign sub-clients or branches to <strong className="text-text-primary">{client.name}</strong>.
        </span>
      }
      maxWidth="xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Form to Add / Edit Sub-Client */}
        <form onSubmit={handleSubmit} className="bg-surface-800 p-4 rounded-xl border border-surface-400 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {editingSubClientId ? 'Edit Sub-Client' : '+ Create New Sub-Client'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Sub-Client Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Branch Alpha, Brand X"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Code / Tag (Optional)</label>
              <input
                type="text"
                placeholder="e.g. BR-01, NYC"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="subclient@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Logo URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Instagram (Optional)</label>
              <input
                type="text"
                placeholder="@username or link"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className="w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Work Experience / Notes (Optional)</label>
              <textarea
                placeholder="Details about past projects, notes, etc."
                value={form.workExperience}
                onChange={(e) => setForm({ ...form, workExperience: e.target.value })}
                className="w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300 resize-none h-14"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-400/40">
            {editingSubClientId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingSubClientId(null);
                  setForm(initialForm);
                }}
              >
                Cancel Edit
              </Button>
            )}
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isSaving}
              className="gap-1"
            >
              <Plus size={13} />
              <span>{editingSubClientId ? 'Update Sub-Client' : 'Add Sub-Client'}</span>
            </Button>
          </div>
        </form>

        {/* List of Sub-Clients */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Registered Sub-Clients ({client.subClients?.length || 0})
          </h4>

          {(!client.subClients || client.subClients.length === 0) ? (
            <div className="p-6 text-center bg-surface-800 rounded-xl border border-surface-400 text-xs text-text-muted">
              No sub-clients added yet for {client.name}. Add sub-clients above to issue work logs specifically for them.
            </div>
          ) : (
            <div className="space-y-2">
              {client.subClients.map((sc) => (
                <SubClientItem
                  key={sc.id}
                  subClient={sc}
                  currency={client.currency}
                  clientWorkItems={clientWorkItems}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-surface-400/60">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SubClientsModal;
