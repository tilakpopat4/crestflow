import React from 'react';
import { Loader2 } from 'lucide-react';
import { MultiUploadProgress } from '../../lib/driveService';

interface DriveUploadProgressProps {
  progress: MultiUploadProgress | null;
  singlePercent?: number;
}

export const DriveUploadProgress: React.FC<DriveUploadProgressProps> = ({ progress, singlePercent = 0 }) => {
  const percent = progress ? progress.overallPercent : singlePercent;
  const label = progress && progress.totalFiles > 1
    ? `Uploading file ${progress.currentFileIndex + 1} of ${progress.totalFiles}: ${progress.currentFileName}`
    : 'Uploading to Google Drive...';

  return (
    <div className="space-y-2 text-left bg-[#1B1B22] p-3.5 rounded-xl border border-[#2A2A33]">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#A1A1AA] flex items-center gap-1.5 truncate max-w-[280px]">
          <Loader2 size={14} className="animate-spin text-[#F7F7F8] shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <span className="font-mono font-bold text-[#F7F7F8] shrink-0">{percent}%</span>
      </div>

      <div className="w-full bg-[#131318] rounded-full h-2 overflow-hidden border border-[#2A2A33]">
        <div
          className="h-full rounded-full transition-all duration-200 bg-[#E0002B]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
