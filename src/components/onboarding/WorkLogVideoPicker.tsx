import React from 'react';
import { WorkItem, SampleWorkItem } from '../../types';
import { generateUUID } from '../../lib/utils';
import { Button } from '../ui/Button';

interface WorkLogVideoPickerProps {
  workItems: WorkItem[];
  currentSamples: SampleWorkItem[];
  onSelect: (item: SampleWorkItem) => void;
}

/**
 * WorkLogVideoPicker Component
 * Allows selecting completed work items that already have Google Drive links.
 */
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

    const sampleItem: SampleWorkItem = {
      id: generateUUID(),
      title: workItem.description || 'Edited Deliverable',
      videoUrl: workItem.videoUrl,
      category: workItem.subClientName || 'Reels',
      description: `Client deliverable • ${new Date(workItem.date).toLocaleDateString()}`,
      createdAt: Date.now(),
    };
    if (workItem.clientEmail) sampleItem.clientName = workItem.clientEmail;
    onSelect(sampleItem);
  };

  return (
    <div className="p-3.5 bg-surface-800 border border-surface-400 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-text-primary">
        Completed Work Items with Drive Links
      </p>
      <div className="max-h-40 overflow-y-auto space-y-1.5">
        {candidateWorkItems.map((w) => {
          const alreadyAdded = currentSamples.some((i) => i.videoUrl === w.videoUrl);
          return (
            <div
              key={w.id}
              className="flex items-center justify-between gap-2 p-2 rounded bg-surface-700 border border-surface-400 text-xs"
            >
              <div className="truncate min-w-0">
                <span className="font-semibold text-text-primary truncate block">
                  {w.description}
                </span>
                <span className="text-[10px] text-text-muted block truncate font-mono">
                  {w.videoUrl}
                </span>
              </div>
              <Button
                size="sm"
                variant={alreadyAdded ? 'ghost' : 'secondary'}
                disabled={alreadyAdded}
                onClick={() => handlePick(w)}
                className="text-[11px] h-7 px-2.5 shrink-0"
              >
                {alreadyAdded ? 'Added' : 'Select'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkLogVideoPicker;
