import React from 'react';
import { Video, File, X, Plus } from 'lucide-react';

interface DriveFileListProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onAddMoreClick: () => void;
  disabled?: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const DriveFileList: React.FC<DriveFileListProps> = ({
  files,
  onRemoveFile,
  onAddMoreClick,
  disabled,
}) => {
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-[#A1A1AA] px-0.5">
        <span>
          {files.length} {files.length === 1 ? 'file' : 'files'} selected ({formatBytes(totalBytes)})
        </span>
        <button
          type="button"
          onClick={onAddMoreClick}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-[#F7F7F8] hover:text-white transition-colors cursor-pointer border-0 bg-transparent text-xs font-semibold disabled:opacity-50"
        >
          <Plus size={13} />
          <span>Add more</span>
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        {files.map((file, idx) => {
          const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(file.name);
          return (
            <div
              key={`${file.name}-${file.size}-${idx}`}
              className="flex items-center justify-between gap-3 p-2.5 bg-[#1B1B22] border border-[#2A2A33] rounded-lg text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-[#131318] border border-[#2A2A33] text-[#A1A1AA] flex items-center justify-center shrink-0">
                  {isVideo ? <Video size={16} /> : <File size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#F7F7F8] truncate max-w-[240px] sm:max-w-xs">
                    {file.name}
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] font-mono">
                    {formatBytes(file.size)}
                  </div>
                </div>
              </div>

              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  title="Remove file"
                  className="p-1 text-[#A1A1AA] hover:text-[#F0607A] hover:bg-[#131318] rounded transition-colors cursor-pointer border-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
