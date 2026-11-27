import React from 'react';
import { UploadCloud } from 'lucide-react';
import { DriveFileList } from './DriveFileList';

interface DriveDropZoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFiles: File[];
  isDragging: boolean;
  isUploading: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFilesAdded: (files: FileList) => void;
  onRemoveFile: (idx: number) => void;
}

export const DriveDropZone: React.FC<DriveDropZoneProps> = ({
  fileInputRef,
  selectedFiles,
  isDragging,
  isUploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onFilesAdded,
  onRemoveFile,
}) => (
  <div
    onClick={() => fileInputRef.current?.click()}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
      isDragging
        ? 'border-[#E0002B] bg-[#1B1B22]'
        : selectedFiles.length
        ? 'border-[#2A2A33] bg-[#1B1B22]/50'
        : 'border-[#2A2A33] hover:border-[#A1A1AA] bg-[#1B1B22]'
    }`}
  >
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept="video/*,image/*,.pdf,.zip,.rar"
      className="hidden"
      onChange={(e) => {
        if (e.target.files) onFilesAdded(e.target.files);
        if (e.target) e.target.value = '';
      }}
    />
    {selectedFiles.length > 0 ? (
      <DriveFileList
        files={selectedFiles}
        onRemoveFile={onRemoveFile}
        onAddMoreClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      />
    ) : (
      <div className="space-y-2">
        <div className="w-10 h-10 rounded-xl bg-[#131318] border border-[#2A2A33] text-[#F7F7F8] flex items-center justify-center mx-auto">
          <UploadCloud size={20} />
        </div>
        <div>
          <span className="text-xs font-bold text-[#F7F7F8]">Click to select files</span>{' '}
          <span className="text-xs text-[#A1A1AA]">or drag and drop multiple files</span>
        </div>
        <p className="text-[11px] text-[#A1A1AA]">Supports multiple videos, images, PDFs, ZIP archives</p>
      </div>
    )}
  </div>
);
