import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { processProfileImage } from '../../lib/imageUpload';

interface ProfileAvatarUploaderProps {
  currentPhotoUrl?: string | null;
  fallbackInitial: string;
  onPhotoUploaded: (dataUrl: string) => void;
  onPhotoRemoved?: () => void;
  disabled?: boolean;
}

/**
 * Direct file-upload avatar component.
 * Allows users to upload their photo directly from device storage without entering external URLs.
 */
export const ProfileAvatarUploader: React.FC<ProfileAvatarUploaderProps> = ({
  currentPhotoUrl,
  fallbackInitial,
  onPhotoUploaded,
  onPhotoRemoved,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);

    try {
      const result = await processProfileImage(file, 160, 0.82);
      onPhotoUploaded(result.dataUrl);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="relative group shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isProcessing}
        />

        <div
          onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
          className="relative size-16 rounded-full cursor-pointer overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-opacity hover:opacity-90"
          title="Click to upload profile photo directly from device"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin text-slate-500 dark:text-slate-400" />
          ) : currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt="Profile Avatar"
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              decoding="async"
            />
          ) : (
            <span className="text-xl font-bold text-slate-700 dark:text-slate-200 select-none">
              {fallbackInitial}
            </span>
          )}

          {/* Hover overlay hint */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={18} className="text-white" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border-0 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Upload Photo'}
          </button>

          {currentPhotoUrl && onPhotoRemoved && (
            <button
              type="button"
              onClick={onPhotoRemoved}
              disabled={disabled || isProcessing}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors border-0 cursor-pointer"
              title="Remove uploaded photo"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Direct device upload (PNG, JPG, or WEBP). No external link required.
        </p>

        {uploadError && (
          <p className="text-xs text-red-500 font-medium">{uploadError}</p>
        )}
      </div>
    </div>
  );
};

export default ProfileAvatarUploader;
