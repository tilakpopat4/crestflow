import React, { useState } from 'react';
import { X, Plus, Trash2, Video, ListPlus } from 'lucide-react';
import { SampleWorkItem, WorkItem } from '../../types';
import AddSampleVideoForm from './AddSampleVideoForm';
import WorkLogVideoPicker from './WorkLogVideoPicker';
import { Button } from '../ui/Button';

interface ManageSampleVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleWorkItem[];
  workItems?: WorkItem[];
  onSaveSamples: (newSamples: SampleWorkItem[]) => Promise<void>;
}

/**
 * ManageSampleVideosModal Component
 * Modal dialog for curating public sample video deliverables from Drive.
 * Designed with blurred backdrop and surface-700 container (no white background).
 */
export default function ManageSampleVideosModal({
  isOpen,
  onClose,
  samples,
  workItems = [],
  onSaveSamples,
}: ManageSampleVideosModalProps) {
  const [items, setItems] = useState<SampleWorkItem[]>(samples || []);
  const [isAdding, setIsAdding] = useState(false);
  const [showWorkLogPicker, setShowWorkLogPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSample = (newItem: SampleWorkItem) => {
    setItems((prev) => [newItem, ...prev]);
    setIsAdding(false);
  };

  const handlePickFromWorkLog = (newItem: SampleWorkItem) => {
    setItems((prev) => [newItem, ...prev]);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveSamples(items);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save sample library.');
    } finally {
      setIsSaving(false);
    }
  };

  const candidateWorkItems = workItems.filter((w) => w.videoUrl && w.videoUrl.trim().length > 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-700 border border-surface-400 text-text-primary rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden cursor-default flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface-400/80 flex items-center justify-between gap-3 bg-surface-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-800 border border-surface-400 text-accent flex items-center justify-center shrink-0">
              <Video size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Manage Sample Videos Library
              </h2>
              <p className="text-xs text-text-secondary">
                Connected to Google Drive for your public onboarding page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-600 rounded-md cursor-pointer border-0 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-surface-800 text-accent border border-accent/40 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-secondary">
              Selected Samples ({items.length})
            </span>
            <div className="flex items-center gap-2">
              {candidateWorkItems.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowWorkLogPicker(!showWorkLogPicker)}
                  className="text-xs h-8"
                >
                  <ListPlus size={13} />
                  {showWorkLogPicker ? 'Hide Work Log' : 'Pick from Work Log'}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAdding(!isAdding)}
                className="text-xs h-8"
              >
                <Plus size={13} />
                Add Google Drive Link
              </Button>
            </div>
          </div>

          {showWorkLogPicker && (
            <WorkLogVideoPicker
              workItems={candidateWorkItems}
              currentSamples={items}
              onSelect={handlePickFromWorkLog}
            />
          )}

          {isAdding && (
            <AddSampleVideoForm
              onAdd={handleAddSample}
              onCancel={() => setIsAdding(false)}
            />
          )}

          {/* Current Samples List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-xs text-text-muted italic text-center py-4">
                No sample videos added yet. Click &quot;Add Google Drive Link&quot; or pick from completed work items.
              </p>
            ) : (
              items.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-surface-400 bg-surface-800"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {sample.title}
                      </span>
                      {sample.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 border border-surface-400 text-text-secondary">
                          {sample.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted font-mono truncate">
                      {sample.videoUrl}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(sample.id)}
                    className="p-1.5 text-text-muted hover:text-accent rounded cursor-pointer border-0 transition-colors"
                    title="Remove sample"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-400/80 flex items-center justify-end gap-2 bg-surface-700">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSaving}
            onClick={handleSave}
            className="text-xs font-semibold"
          >
            {isSaving ? 'Saving...' : 'Save Sample Library'}
          </Button>
        </div>
      </div>
    </div>
  );
}
