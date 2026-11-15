import React, { useState } from 'react';
import { Play, ExternalLink, Film } from 'lucide-react';
import { SampleWorkItem } from '../../types';
import { getDriveThumbnailUrl } from '../../lib/driveService';

interface SampleVideoCardProps {
  item: SampleWorkItem;
  onSelect: (item: SampleWorkItem) => void;
}

/**
 * SampleVideoCard renders an individual curated sample video with a
 * professional pitch-black preview box, direct thumbnail display,
 * and a single unified play action.
 */
export const SampleVideoCard: React.FC<SampleVideoCardProps> = ({ item, onSelect }) => {
  const [hasImageError, setHasImageError] = useState(false);

  const thumbUrl = item.thumbnailUrl || getDriveThumbnailUrl(item.videoUrl, 800);
  const showThumbnail = thumbUrl && !hasImageError;

  return (
    <div className="bg-[#181818] border border-[#282828] hover:border-[#383838] rounded-xl overflow-hidden flex flex-col justify-between transition-colors shadow-xs group">
      {/* Video Viewport: Pure Solid Black, No Translucent White Letterboxing */}
      <div
        onClick={() => onSelect(item)}
        className="relative aspect-video bg-black w-full overflow-hidden flex items-center justify-center cursor-pointer select-none"
        title={`Watch preview: ${item.title}`}
      >
        {showThumbnail ? (
          <img
            src={thumbUrl}
            alt={item.title}
            className="w-full h-full object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
            <Film className="w-8 h-8 text-slate-600" />
            <span className="text-[11px] font-mono text-slate-400">Google Drive Deliverable</span>
          </div>
        )}

        {/* Subtle Dark Vignette on Hover (Zero White Washout) */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors pointer-events-none" />

        {/* Fallback Play Indicator only when no thumbnail image is present */}
        {!showThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-[#1e1e1e]/90 text-white border border-[#333333] flex items-center justify-center shadow-lg">
              <Play size={18} className="ml-0.5 fill-current text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3
              onClick={() => onSelect(item)}
              className="text-sm font-semibold text-white truncate cursor-pointer hover:text-slate-200 transition-colors"
              title={item.title}
            >
              {item.title}
            </h3>
            {item.category && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#242424] text-slate-300 border border-[#303030] shrink-0">
                {item.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {item.clientName ? (
              <span className="truncate">{item.clientName}</span>
            ) : (
              <span>Client deliverable</span>
            )}
            {item.createdAt && (
              <>
                <span>•</span>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-0.5">
              {item.description}
            </p>
          )}
        </div>

        {/* Card Footer: Watch Preview Link & Source Link per GEMINI.md */}
        <div className="pt-3 border-t border-[#262626] flex items-center justify-between gap-2 text-xs mt-2">
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="inline-flex items-center gap-1.5 text-[#4870aa] hover:text-[#6a90cc] font-medium cursor-pointer border-0 bg-transparent p-0 transition-colors"
          >
            <Play size={14} className="fill-current" />
            <span>Watch Preview</span>
          </button>

          <a
            href={item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            title="Open in Google Drive"
          >
            <span>Drive</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default SampleVideoCard;
