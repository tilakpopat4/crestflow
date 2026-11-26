import React, { useState } from 'react';
import { Play, ExternalLink, Film } from 'lucide-react';
import { SampleWorkItem } from '../../types';
import { getDriveThumbnailUrl } from '../../lib/driveService';

interface SampleVideoCardProps {
  item: SampleWorkItem;
  onSelect: (item: SampleWorkItem, isPortrait: boolean) => void;
}

/**
 * SampleVideoCard renders a curated sample video with automatic portrait (9:16)
 * or landscape (16:9) aspect ratio matching and minimal metadata.
 */
export const SampleVideoCard: React.FC<SampleVideoCardProps> = ({ item, onSelect }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  const thumbUrl = item.thumbnailUrl || getDriveThumbnailUrl(item.videoUrl, 800);
  const showThumbnail = thumbUrl && !hasImageError;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > img.naturalWidth) {
      setIsPortrait(true);
    } else {
      setIsPortrait(false);
    }
  };

  return (
    <div className="bg-[#0B0B0E] hover:bg-[#131318] border-0 rounded-xl overflow-hidden flex flex-col break-inside-avoid transition-colors group">
      <div
        onClick={() => onSelect(item, isPortrait)}
        className={`relative bg-black w-full overflow-hidden flex items-center justify-center cursor-pointer select-none ${
          isPortrait ? 'aspect-[9/16]' : 'aspect-video'
        }`}
        title={item.title}
      >
        {showThumbnail ? (
          <img
            src={thumbUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={handleImageLoad}
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[#A1A1AA] gap-2 p-4 text-center">
            <Film className="w-8 h-8 text-[#A1A1AA]" />
            <span className="text-[11px] text-[#A1A1AA]">Video preview</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />

        {!showThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-[#131318]/90 text-white flex items-center justify-center">
              <Play size={18} className="ml-0.5 fill-current text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3
            onClick={() => onSelect(item, isPortrait)}
            className="text-sm font-semibold text-white truncate cursor-pointer hover:text-[#F7F7F8] transition-colors"
            title={item.title}
          >
            {item.title}
          </h3>
          {item.category && (
            <span className="text-[11px] text-[#A1A1AA] shrink-0 truncate max-w-[120px]">
              {item.category}
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-[#1B1B22] flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => onSelect(item, isPortrait)}
            className="inline-flex items-center gap-1.5 text-[#F7F7F8] hover:text-white font-medium cursor-pointer border-0 bg-transparent p-0 transition-colors"
          >
            <Play size={13} className="fill-current" />
            <span>Preview</span>
          </button>

          <a
            href={item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#A1A1AA] hover:text-white transition-colors"
            title="Open in Drive"
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
