import React from 'react';
import { WorkItem, SampleWorkItem } from '../../types';
import { generateUUID } from '../../lib/utils';

interface WorkLogVideoPickerProps {
  workItems: WorkItem[];
  currentSamples: SampleWorkItem[];
  onSelect: (item: SampleWorkItem) => void;
}

export const WorkLogVideoPicker: React.FC<WorkLogVideoPickerProps> = ({
  workItems,
  currentSamples,
  onSelect,
}) => {
  const candidateWorkItems = workItems.filter((w) => w.videoUrl && w.videoUrl.trim().length > 0);

  const handlePick = (workItem: WorkItem) => {
    if (!workItem.videoUrl) return;
    const exists = currentSamples.some((i) => i.videoUrl === workItem.videoUrl);
    if (exists) {
      alert('This work item is already in your sample library.');
      return;
    }

    onSelect({
      id: generateUUID(),
      title: workItem.description || 'Edited Deliverable',
      videoUrl: workItem.videoUrl,
      category: workItem.subClientName || 'Reels',
      description: `Client deliverable • ${new Date(workItem.date).toLocaleDateString()}`,
      clientName: workItem.clientEmail || undefined,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
        Completed Work Items with Drive Links
      </p>
      <div className="max-h-40 overflow-y-auto space-y-1.5">
        {candidateWorkItems.map((w) => {
          const alreadyAdded = currentSamples.some((i) => i.videoUrl === w.videoUrl);
          return (
            <div
              key={w.id}
              className="flex items-center justify-between gap-2 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
            >
              <div className="truncate min-w-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {w.description}
                </span>
                <span className="text-[10px] text-slate-400 block truncate font-mono">
                  {w.videoUrl}
                </span>
              </div>
              <button
                type="button"
                disabled={alreadyAdded}
                onClick={() => handlePick(w)}
                className={`px-2 py-1 rounded text-[11px] font-medium border-0 cursor-pointer shrink-0 ${
                  alreadyAdded
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {alreadyAdded ? 'Added' : 'Select'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkLogVideoPicker;
