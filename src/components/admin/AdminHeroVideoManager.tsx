import React, { useRef, useState } from 'react';
import { Video, Smartphone, Check, ExternalLink, ChevronDown, ChevronUp, Upload, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { HeroConfig } from '../../lib/heroConfig';
import { siteConfig } from '../../config/site';
import { useAdminLandingMedia } from '../../hooks/useAdminLandingMedia';

interface AdminHeroVideoManagerProps {
  draft: HeroConfig;
  setDraft: React.Dispatch<React.SetStateAction<HeroConfig>>;
}

/**
 * Admin portal manager for the landing page background video:
 * - Provides instructions for updating the self-hosted UploadThing / CDN video
 * - Manages visibility, mobile behavior, and dark scrim contrast
 * - Displays active video preview and configuration sources
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
  } = useAdminLandingMedia({ draft, setDraft });

  const [showR2Upload, setShowR2Upload] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const posterFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeVideoUrl =
    draft.backgroundVideoUrl?.trim() ||
    siteConfig.heroVideo.mp4 ||
    siteConfig.heroVideo.webm ||
    '';
  const hasVideo = Boolean(activeVideoUrl && !activeVideoUrl.includes('REPLACE_ME'));

  return (
    <div className="space-y-4 pt-3 border-t border-[#333333]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Video className="w-4 h-4 text-accent" />
            <span>Self-Hosted Hero Video Background</span>
          </span>
          <p className="text-[11px] text-[#aaaaaa]">Zero player controls • Native HTML5 &lt;video&gt; • UploadThing CDN</p>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800">
          UI-Free
        </span>
      </div>

      {/* Instructions Guide */}
      <div className="bg-[#181818] p-3.5 rounded-lg border border-[#333333] space-y-3">
        <span className="block text-xs font-semibold text-white">How to Change the Landing Background Video</span>
        <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            <strong className="text-white">Upload your video:</strong> Upload your compressed <code className="text-accent bg-[#222222] px-1 py-0.5 rounded">.mp4</code> or <code className="text-accent bg-[#222222] px-1 py-0.5 rounded">.webm</code> (under 25 MB) to UploadThing or any CDN.
          </li>
          <li>
            <strong className="text-white">Add URL to Environment Variables:</strong> Set <code className="text-white bg-[#222222] px-1 py-0.5 rounded">VITE_HERO_VIDEO_MP4</code> in your <code className="text-slate-400">.env</code> or in <code className="text-slate-400">wrangler.jsonc</code> under <code className="text-slate-400">vars</code>.
          </li>
          <li>
            <strong className="text-white">Or Edit Config File:</strong> Directly update <code className="text-white bg-[#222222] px-1 py-0.5 rounded">src/config/site.ts</code> with your public URL.
          </li>
          <li>
            <strong className="text-white">Fallback Poster:</strong> Place your static poster image at <code className="text-white bg-[#222222] px-1 py-0.5 rounded">public/hero-v1-poster.jpg</code>.
          </li>
        </ol>

        {/* Current Active Video Source Indicator */}
        <div className="pt-2 border-t border-[#2a2a2a] space-y-1">
          <span className="text-[11px] text-[#aaaaaa] font-medium block">Current Active Stream Source:</span>
          <div className="bg-[#121212] border border-[#2a2a2a] rounded p-2 flex items-center justify-between gap-2 overflow-hidden">
            <span className="text-xs font-mono text-emerald-400 truncate select-all">
              {hasVideo ? activeVideoUrl : 'Using local static poster fallback (/hero-v1-poster.jpg)'}
            </span>
            {hasVideo && (
              <a
                href={activeVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#aaaaaa] hover:text-white shrink-0 p-1"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
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
          Guarantees $\ge 4.5:1$ WCAG AA contrast ratio so headlines and inputs remain readable against any frame.
        </p>
      </div>

      {/* Live Preview Player */}
      {hasVideo && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#aaaaaa]">Live Video Preview</label>
          <div className="relative rounded-lg overflow-hidden bg-black border border-[#333333] aspect-video">
            <video
              src={activeVideoUrl}
              poster={siteConfig.heroVideo.poster || draft.posterUrl || undefined}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
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
            <p className="text-[11px] text-slate-400">
              Upload video directly to your configured Cloudflare R2 storage bucket.
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
