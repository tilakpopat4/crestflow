import React, { useState } from 'react';
import { X, Plus, Trash2, Video, ListPlus } from 'lucide-react';
import { SampleWorkItem, WorkItem } from '../../types';
import AddSampleVideoForm from './AddSampleVideoForm';
import WorkLogVideoPicker from './WorkLogVideoPicker';

interface ManageSampleVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleWorkItem[];
  workItems?: WorkItem[];
  onSaveSamples: (newSamples: SampleWorkItem[]) => Promise<void>;
}

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
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl max-w-2xl w-full overflow-hidden cursor-default flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Video size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Manage Sample Videos Library
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected to Google Drive for your public onboarding page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer border-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-[#181818] text-red-400 border border-red-600/40 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Selected Samples ({items.length})
            </span>
            <div className="flex items-center gap-2">
              {candidateWorkItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWorkLogPicker(!showWorkLogPicker)}
                  className="px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md border-0 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ListPlus size={13} />
                  {showWorkLogPicker ? 'Hide Work Log' : 'Pick from Work Log'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="px-2.5 py-1 text-xs text-white bg-[#282828] hover:bg-[#1a1a1a] rounded-md border-0 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                Add Google Drive Link
              </button>
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
              <p className="text-xs text-slate-400 italic text-center py-4">
                No sample videos added yet. Click &quot;Add Google Drive Link&quot; or pick from completed work items.
              </p>
            ) : (
              items.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {sample.title}
                      </span>
                      {sample.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {sample.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {sample.videoUrl}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(sample.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded cursor-pointer border-0"
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border-0 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg border-0 cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save Sample Library'}
          </button>
        </div>
      </div>
    </div>
  );
}
