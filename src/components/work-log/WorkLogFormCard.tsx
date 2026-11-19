import React from 'react';
import { X, Users, UploadCloud } from 'lucide-react';
import { Client } from '../../types';
import { Button } from '@/components/ui/button';
import { DateInput } from '../DateInput';
import { WorkLogFormData } from '../../hooks/useWorkLog';

interface WorkLogFormCardProps {
  editingWorkId: string | null;
  formData: WorkLogFormData;
  setFormData: React.Dispatch<React.SetStateAction<WorkLogFormData>>;
  clients: Client[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  onOpenDrive: () => void;
}

/**
 * Form card for logging or editing deliverable work items in WorkLogTab.
 */
export function WorkLogFormCard({
  editingWorkId,
  formData,
  setFormData,
  clients,
  onSubmit,
  onCancel,
  onOpenDrive,
}: WorkLogFormCardProps) {
  const selectedClient = clients.find((c) => c.id === formData.clientId);
  const isMonthly = selectedClient?.paymentBasis === 'monthly_retainer';

  return (
    <div className="bg-surface-700 border border-surface-400 p-5 sm:p-6 rounded-xl shadow-xs space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-surface-400/80">
        <h3 className="text-base font-semibold text-text-primary">
          {editingWorkId ? 'Edit Work Log Entry' : 'Log Completed Work'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted hover:text-text-primary cursor-pointer bg-transparent border-0 p-1"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Client *</label>
            <select
              required
              className="w-full p-2.5 bg-surface-800 text-text-primary border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-medium"
              value={formData.clientId}
              onChange={(e) => {
                const clientId = e.target.value;
                const client = clients.find((c) => c.id === clientId);
                const isClientMonthly = client?.paymentBasis === 'monthly_retainer';
                setFormData({
                  ...formData,
                  clientId,
                  subClientId: '',
                  rate: isClientMonthly ? '0' : client ? String(client.defaultRate) : '',
                });
              }}
            >
              <option value="">Select Client</option>
              {clients
                .filter((c) => !c.isClosed)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            {selectedClient?.subClients && selectedClient.subClients.length > 0 && (
              <div className="mt-2.5 bg-surface-800 p-2.5 rounded-lg border border-surface-400">
                <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                  <Users size={12} className="text-text-muted" /> Assign Sub-Client (Optional)
                </label>
                <select
                  className="w-full p-2 border border-surface-400 rounded-md text-xs bg-surface-900 font-medium text-text-primary outline-none focus:border-surface-300"
                  value={formData.subClientId}
                  onChange={(e) => setFormData({ ...formData, subClientId: e.target.value })}
                >
                  <option value="">Direct Parent Client ({selectedClient.name})</option>
                  {selectedClient.subClients.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      Sub-Client: {sc.name} {sc.code ? `(${sc.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Date Completed *</label>
            <DateInput
              required
              className="p-2.5 bg-surface-800 text-text-primary border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-mono"
              value={formData.date}
              onChange={(val) => setFormData({ ...formData, date: val })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Description (e.g., Real Estate Reel, VLOG Edit) *
          </label>
          <input
            type="text"
            required
            className="w-full p-2.5 bg-surface-800 text-text-primary placeholder:text-text-muted border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description of work"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-text-secondary">Video / Post Link (Optional)</label>
            <button
              type="button"
              onClick={onOpenDrive}
              className="text-xs font-medium text-text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            >
              <UploadCloud size={12} /> Upload to Google Drive
            </button>
          </div>
          <input
            type="text"
            className="w-full p-2.5 bg-surface-800 text-text-primary placeholder:text-text-muted border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-mono"
            value={formData.videoUrl}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            placeholder="https://drive.google.com/file/d/... or YouTube / Instagram link"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              required
              className="w-full p-2.5 bg-surface-800 text-text-primary border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-mono"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
          </div>

          {isMonthly ? (
            <div className="flex items-center">
              <div className="w-full p-2.5 bg-surface-800 border border-surface-400 rounded-lg text-xs text-text-secondary flex items-center h-[38px]">
                <span>Covered by monthly retainer (no per-item rate)</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Rate *</label>
              <input
                type="number"
                required
                className="w-full p-2.5 bg-surface-800 text-text-primary border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-mono"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-400/80">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {editingWorkId ? 'Save Changes' : 'Log Work'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default WorkLogFormCard;
