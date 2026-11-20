import React, { useRef } from 'react';
import { Upload, Trash2, Camera, AlertCircle, Check, RefreshCw, Smartphone } from 'lucide-react';
import { HeroConfig } from '../../lib/heroConfig';
import { useAdminLandingMedia } from '../../hooks/useAdminLandingMedia';

interface AdminHeroVideoManagerProps {
  draft: HeroConfig;
  setDraft: React.Dispatch<React.SetStateAction<HeroConfig>>;
}

/**
 * Admin component for managing the landing page custom background video:
 * - Direct upload to Cloudflare R2 (MP4 / WebM <= 25MB)
 * - Live preview and first-frame poster generation / upload
 * - On/off toggle and mobile screen visibility control
 * - Server authenticated and rate limited
 */
export const AdminHeroVideoManager: React.FC<AdminHeroVideoManagerProps> = ({
  draft,
  setDraft,
}) => {
  const {
    uploading,
    progress,
    statusMessage,
    errorMessage,
    lastFailedFile,
    isCapturingPoster,
    handleUploadVideo,
    handleUploadPoster,
    handleExtractFirstFrame,
    handleRemoveMedia,
  } = useAdminLandingMedia({ draft, setDraft });

  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const posterFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasVideo = Boolean(draft.backgroundVideoUrl);

  return (
    <div className="space-y-4 pt-3 border-t border-[#333333]">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-white uppercase tracking-wider">Video Background Storage</span>
          <p className="text-[11px] text-[#aaaaaa]">Accepts MP4 (H.264) and WebM only • Max 25 MB</p>
        </div>
        {hasVideo && (
          <button
            type="button"
            onClick={handleRemoveMedia}
            className="px-2.5 py-1 text-xs text-[#e1002d] hover:bg-[#e1002d]/10 rounded-md transition-colors cursor-pointer border-0 inline-flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Toggles: Video Enabled & Show on Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#181818] p-3 rounded-lg border border-[#333333]">
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-white">Enable Video</span>
          <input
            type="checkbox"
            checked={draft.videoEnabled !== false}
            onChange={(e) => setDraft((prev) => ({ ...prev, videoEnabled: e.target.checked }))}
            className="w-4 h-4 accent-accent cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-white inline-flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-[#aaaaaa]" />
            <span>Show on Mobile</span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(draft.showOnMobile)}
            onChange={(e) => setDraft((prev) => ({ ...prev, showOnMobile: e.target.checked }))}
            className="w-4 h-4 accent-accent cursor-pointer"
          />
        </label>
      </div>

      {/* Upload & Action Buttons */}
      <div>
        <input
          ref={videoFileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadVideo(file);
          }}
        />
        <input
          ref={posterFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadPoster(file);
          }}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => videoFileInputRef.current?.click()}
            className="px-3.5 py-2 bg-[#282828] hover:bg-[#333333] text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            <Upload className="w-3.5 h-3.5 text-accent" />
            <span>{hasVideo ? 'Replace Video (Upload)' : 'Upload Video to R2'}</span>
          </button>

          {hasVideo && (
            <>
              <button
                type="button"
                disabled={isCapturingPoster}
                onClick={handleExtractFirstFrame}
                className="px-3 py-2 bg-[#282828] hover:bg-[#333333] text-[#aaaaaa] hover:text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
                title="Capture video frame as poster"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isCapturingPoster ? 'Capturing Frame...' : 'Capture Frame as Poster'}</span>
              </button>

              <button
                type="button"
                onClick={() => posterFileInputRef.current?.click()}
                className="px-3 py-2 bg-[#282828] hover:bg-[#333333] text-[#aaaaaa] hover:text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                <span>Upload Custom Poster</span>
              </button>
            </>
          )}
        </div>

        {uploading && (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-[#aaaaaa]">
              <span>Uploading video to storage...</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#181818] rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="mt-2.5 p-2.5 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-2.5 p-2.5 bg-red-950/40 border border-red-800 text-red-300 rounded-lg text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
            {lastFailedFile && (
              <button
                type="button"
                onClick={() => handleUploadVideo(lastFailedFile)}
                className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer border-0 shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live Preview Player */}
      {hasVideo && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#aaaaaa]">Live Video Preview</label>
          <div className="relative rounded-lg overflow-hidden bg-black border border-[#333333] aspect-video">
            <video
              src={draft.backgroundVideoUrl}
              poster={draft.posterUrl || undefined}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          {draft.posterUrl && (
            <p className="text-[11px] text-[#aaaaaa]">
              Poster configured: <span className="font-mono text-white">{draft.posterUrl}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHeroVideoManager;
