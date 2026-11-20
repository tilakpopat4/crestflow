import React from 'react';
import { Palette, Image as ImageIcon, Video, AlignLeft, AlignRight, AlignCenter } from 'lucide-react';
import { HeroConfig, HeroBackgroundType, HeroCardAlignment } from '../../lib/heroConfig';

interface AdminHeroMediaSectionProps {
  draft: HeroConfig;
  setDraft: React.Dispatch<React.SetStateAction<HeroConfig>>;
}

/**
 * Sub-component for managing the hero background media (color, photo, video)
 * and the sign-in / sign-up card layout alignment.
 */
export const AdminHeroMediaSection: React.FC<AdminHeroMediaSectionProps> = ({
  draft,
  setDraft,
}) => {
  return (
    <div className="bg-[#212121] border border-[#333333] rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Background &amp; Sign-In Placement</h3>

      {/* Sign-in Box Alignment */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Sign-In Box Alignment</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'right' as HeroCardAlignment, label: 'Right (Standard)', icon: AlignRight },
            { id: 'left' as HeroCardAlignment, label: 'Left Side', icon: AlignLeft },
            { id: 'center' as HeroCardAlignment, label: 'Centered', icon: AlignCenter },
          ].map((opt) => {
            const Icon = opt.icon;
            const isSelected = draft.cardAlignment === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, cardAlignment: opt.id }))}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-[#383838] bg-[#181818] text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Background Type */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Background Media Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'color' as HeroBackgroundType, label: 'Solid Color', icon: Palette },
            { id: 'image' as HeroBackgroundType, label: 'Custom Photo', icon: ImageIcon },
            { id: 'video' as HeroBackgroundType, label: 'Custom Video', icon: Video },
          ].map((bg) => {
            const Icon = bg.icon;
            const isSelected = draft.backgroundType === bg.id;
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, backgroundType: bg.id }))}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-[#383838] bg-[#181818] text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{bg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Background Specific Inputs */}
      {draft.backgroundType === 'color' && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.backgroundColor.startsWith('#') ? draft.backgroundColor : '#333333'}
              onChange={(e) => setDraft((prev) => ({ ...prev, backgroundColor: e.target.value }))}
              className="w-9 h-9 rounded border border-[#383838] bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={draft.backgroundColor}
              onChange={(e) => setDraft((prev) => ({ ...prev, backgroundColor: e.target.value }))}
              className="flex-1 bg-[#181818] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white font-mono"
              placeholder="#333333"
            />
          </div>
        </div>
      )}

      {draft.backgroundType === 'image' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Image URL</label>
            <input
              type="url"
              value={draft.backgroundImageUrl}
              onChange={(e) => {
                const val = e.target.value;
                setDraft((prev) => ({
                  ...prev,
                  backgroundImageUrl: val,
                  ...(val.trim() && prev.backgroundType !== 'image' ? { backgroundType: 'image' } : {}),
                }));
              }}
              className="w-full bg-[#181818] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white font-mono"
              placeholder="https://images.unsplash.com/photo-..."
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Overlay Darkness</span>
              <span className="font-mono">{Math.round(draft.backgroundOverlayOpacity * 100)}%</span>
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
          </div>
        </div>
      )}

      {draft.backgroundType === 'video' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Video URL (Direct MP4/WebM, YouTube, Vimeo, or Google Drive)
            </label>
            <input
              type="url"
              value={draft.backgroundVideoUrl}
              onChange={(e) => {
                const val = e.target.value;
                setDraft((prev) => ({
                  ...prev,
                  backgroundVideoUrl: val,
                  ...(val.trim() && prev.backgroundType !== 'video' ? { backgroundType: 'video' } : {}),
                }));
              }}
              className="w-full bg-[#181818] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white font-mono"
              placeholder="https://www.youtube.com/watch?v=... or direct .mp4 link"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Autoplays muted &amp; loops full screen. Supports YouTube (links, shorts), Vimeo, Google Drive share links, and direct .mp4/.webm videos.
            </p>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Overlay Darkness</span>
              <span className="font-mono">{Math.round(draft.backgroundOverlayOpacity * 100)}%</span>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHeroMediaSection;
