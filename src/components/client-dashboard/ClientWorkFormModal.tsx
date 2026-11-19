import React from 'react';
import { UploadCloud, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { DateInput } from '../DateInput';
import { Client } from '../../types';

interface ClientWorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWorkId: string | null;
  workFormData: {
    subClientId: string;
    description: string;
    videoUrl: string;
    quantity: string;
    rate: string;
    date: string;
  };
  setWorkFormData: React.Dispatch<React.SetStateAction<{
    subClientId: string;
    description: string;
    videoUrl: string;
    quantity: string;
    rate: string;
    date: string;
  }>>;
  client: Client;
  currencySymbol: string;
  onSave: (e: React.FormEvent) => Promise<void>;
  onOpenDrive: () => void;
  onOpenSubClients: () => void;
}

/**
 * Modal dialog for logging or editing deliverable work items for a client.
 */
export function ClientWorkFormModal({
  isOpen,
  onClose,
  editingWorkId,
  workFormData,
  setWorkFormData,
  client,
  currencySymbol,
  onSave,
  onOpenDrive,
  onOpenSubClients,
}: ClientWorkFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingWorkId ? 'Edit Work Entry' : 'Add New Work Entry'}
      description={`Record completed deliverable for ${client.name}.`}
      maxWidth="lg"
    >
      <form onSubmit={onSave} className="space-y-4">
        {client.subClients && client.subClients.length > 0 && (
          <div className="bg-surface-800 p-3 rounded-lg border border-surface-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Users size={13} className="text-text-muted" /> Issued Sub-Client (Optional)
              </label>
              <button
                type="button"
                onClick={onOpenSubClients}
                className="text-xs font-medium text-text-primary hover:underline flex items-center gap-1 w-fit cursor-pointer bg-transparent border-0"
              >
                + Manage Sub-Clients
              </button>
            </div>
            <select
              value={workFormData.subClientId}
              onChange={(e) => setWorkFormData({ ...workFormData, subClientId: e.target.value })}
              className="mt-2 w-full bg-surface-900 border border-surface-400 rounded-lg px-3 py-2 text-xs font-medium text-text-primary outline-none focus:border-surface-300"
            >
              <option value="">-- Direct Parent Client ({client.name}) --</option>
              {client.subClients.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  Sub-Client: {sc.name} {sc.code ? `(${sc.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Work Description *</label>
          <input
            type="text"
            required
            placeholder="e.g. Wedding Highlight Reel Edit"
            value={workFormData.description}
            onChange={(e) => setWorkFormData({ ...workFormData, description: e.target.value })}
            className="w-full bg-surface-800 border border-surface-400 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Video / Post Link (Optional)</label>
            <button
              type="button"
              onClick={onOpenDrive}
              className="text-xs font-medium text-text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
            >
              <UploadCloud size={12} /> Upload to Drive
            </button>
          </div>
          <input
            type="text"
            placeholder="https://drive.google.com/... or Instagram Reel URL"
            value={workFormData.videoUrl}
            onChange={(e) => setWorkFormData({ ...workFormData, videoUrl: e.target.value })}
            className="w-full bg-surface-800 border border-surface-400 rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Quantity *</label>
            <input
              type="number"
              required
              min="1"
              value={workFormData.quantity}
              onChange={(e) => setWorkFormData({ ...workFormData, quantity: e.target.value })}
              className="w-full bg-surface-800 border border-surface-400 rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-surface-300"
            />
          </div>

          {client.paymentBasis === 'monthly_retainer' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Billing Basis</label>
              <div className="px-3 py-2 bg-surface-800 border border-surface-400 rounded-lg text-xs font-medium text-text-secondary flex items-center h-[38px]">
                <span>Monthly Retainer</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Rate ({currencySymbol}) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={workFormData.rate}
                onChange={(e) => setWorkFormData({ ...workFormData, rate: e.target.value })}
                className="w-full bg-surface-800 border border-surface-400 rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-surface-300"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Completion Date *</label>
          <DateInput
            required
            value={workFormData.date}
            onChange={(val) => setWorkFormData({ ...workFormData, date: val })}
            className="bg-surface-800 border border-surface-400 rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-surface-300"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-400/60">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {editingWorkId ? 'Save Changes' : 'Save Work Log'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ClientWorkFormModal;
