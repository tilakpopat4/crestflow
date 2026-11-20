import React, { useRef, useState, useMemo } from 'react';
import { Upload, Trash2, Camera, AlertCircle, Check, RefreshCw, Smartphone, Youtube, ChevronDown, ChevronUp } from 'lucide-react';
import { HeroConfig, parseVideoSource } from '../../lib/heroConfig';
import { useAdminLandingMedia } from '../../hooks/useAdminLandingMedia';

interface AdminHeroVideoManagerProps {
  draft: HeroConfig;
  setDraft: React.Dispatch<React.SetStateAction<HeroConfig>>;
}

const YOUTUBE_PRESETS = [
  { label: 'Dark Ambient Wave', id: '4xDzrJKXOOY', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { label: 'Studio Neon Loop', id: 'rE6FjM13a80', url: 'https://www.youtube.com/watch?v=rE6FjM13a80' },
  { label: 'Cyber Tech Grid', id: 'L_LUpnjgPso', url: 'https://www.youtube.com/watch?v=L_LUpnjgPso' },
];

/**
 * Admin component for managing the landing page custom background video:
 * - Primary: Zero-cost YouTube embeds with auto-loop, muted autoplay, and poster extraction
 * - Direct upload: Optional Cloudflare R2 storage (MP4/WebM <= 25MB)
 * - Live preview and first-frame poster generation / upload
 * - Scrim contrast slider and mobile screen visibility control
 */
export const AdminHeroVideoManager: React.FC<AdminHeroVideoManagerProps> = ({ draft, setDraft }) => {
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

  const [showR2Upload, setShowR2Upload] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const posterFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasVideo = Boolean(draft.backgroundVideoUrl?.trim());
  const parsed = useMemo(() => parseVideoSource(draft.backgroundVideoUrl), [draft.backgroundVideoUrl]);

  const handleApplyPreset = (url: string, id: string) => {
    setDraft((prev) => ({
      ...prev,
      backgroundType: 'video',
      backgroundVideoUrl: url,
      videoEnabled: true,
      posterUrl: prev.posterUrl || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    }));
  };

  return (
    <div className="space-y-4 pt-3 border-t border-[#333333]">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Youtube className="w-4 h-4 text-accent" />
            <span>YouTube Video Background</span>
          </span>
          <p className="text-[11px] text-[#aaaaaa]">100% Free • Unlimited Bandwidth • No Payment Required</p>
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

      {/* YouTube URL or Video ID Input */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          YouTube Video URL or Video ID
        </label>
        <div className="relative">
          <input
            type="text"
            value={draft.backgroundVideoUrl}
            onChange={(e) => {
              const val = e.target.value.trim();
              const p = parseVideoSource(val);
              setDraft((prev) => ({
                ...prev,
                backgroundType: 'video',
                backgroundVideoUrl: val,
                ...(p.posterUrl && !prev.posterUrl ? { posterUrl: p.posterUrl } : {}),
              }));
            }}
            placeholder="https://www.youtube.com/watch?v=... or 11-char ID"
            className="w-full bg-[#181818] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:border-accent"
          />
        </div>
        {parsed.type === 'youtube' && parsed.videoId && (
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Detected YouTube video: <strong className="font-mono">{parsed.videoId}</strong></span>
          </p>
        )}
      </div>

      {/* Quick 1-Click Curated Presets */}
      <div>
        <span className="block text-[11px] text-[#aaaaaa] mb-1.5 font-medium">Quick Ambient Presets (1-Click Test)</span>
        <div className="flex flex-wrap gap-2">
          {YOUTUBE_PRESETS.map((p) => {
            const isCurrent = draft.backgroundVideoUrl.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.url, p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  isCurrent
                    ? 'border-accent bg-accent/15 text-white'
                    : 'border-[#383838] bg-[#181818] text-slate-300 hover:text-white hover:bg-[#282828]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles: Video Enabled & Show on Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#181818] p-3 rounded-lg border border-[#333333]">
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-white">Enable Video Background</span>
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

      {/* Scrim Contrast Slider */}
      <div className="bg-[#181818] p-3 rounded-lg border border-[#333333] space-y-1.5">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Dark Scrim Contrast (#1A1A1A)</span>
          <span className="font-mono text-white">{Math.round(draft.backgroundOverlayOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.95"
          step="0.05"
          value={draft.backgroundOverlayOpacity}
          onChange={(e) => setDraft((prev) => ({ ...prev, backgroundOverlayOpacity: parseFloat(e.target.value) }))}
          className="w-full accent-accent cursor-pointer"
        />
        <p className="text-[11px] text-[#aaaaaa]">
          Ensures $\ge 4.5:1$ WCAG contrast ratio so hero headlines and form labels remain crystal clear.
        </p>
      </div>

      {/* Live Preview Player */}
      {hasVideo && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#aaaaaa]">Live Video Preview</label>
          <div className="relative rounded-lg overflow-hidden bg-black border border-[#333333] aspect-video">
            {parsed.type === 'youtube' ? (
              <iframe
                title="Admin Preview"
                src={parsed.embedUrl}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
              />
            ) : (
              <video
                src={draft.backgroundVideoUrl}
                poster={draft.posterUrl || undefined}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      )}

      {/* Optional Cloudflare R2 Upload Section */}
      <div className="pt-2 border-t border-[#333333]">
        <button
          type="button"
          onClick={() => setShowR2Upload((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs text-[#aaaaaa] hover:text-white py-1 cursor-pointer border-0 bg-transparent"
        >
          <span>Direct MP4 Upload to Cloudflare R2 (Optional)</span>
          {showR2Upload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showR2Upload && (
          <div className="mt-2.5 p-3 bg-[#181818] rounded-lg border border-[#333333] space-y-2.5">
            <p className="text-[11px] text-amber-400">
              Note: Cloudflare R2 requires a card on file. For free video without payment, use YouTube above.
            </p>
            <input ref={videoFileInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadVideo(f); }} />
            <input ref={posterFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPoster(f); }} />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => videoFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#282828] hover:bg-[#333333] text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer border-0"
              >
                <Upload className="w-3.5 h-3.5 text-accent" />
                <span>Upload Video to R2</span>
              </button>
              {hasVideo && (
                <>
                  <button type="button" disabled={isCapturingPoster} onClick={handleExtractFirstFrame} className="px-3 py-1.5 bg-[#282828] hover:bg-[#333333] text-[#aaaaaa] hover:text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer border-0">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Frame as Poster</span>
                  </button>
                  <button type="button" onClick={() => posterFileInputRef.current?.click()} className="px-3 py-1.5 bg-[#282828] hover:bg-[#333333] text-[#aaaaaa] hover:text-white rounded-lg text-xs font-medium cursor-pointer border-0">
                    <span>Upload Poster</span>
                  </button>
                </>
              )}
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#aaaaaa]">
                  <span>Uploading to R2...</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {statusMessage && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-2 bg-red-950/40 border border-red-800 text-red-300 rounded text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
                {lastFailedFile && (
                  <button type="button" onClick={() => handleUploadVideo(lastFailedFile)} className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer border-0 shrink-0">
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHeroVideoManager;