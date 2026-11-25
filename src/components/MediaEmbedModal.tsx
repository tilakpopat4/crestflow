import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { getDriveEmbedUrl, extractDriveFileId, isGoogleDriveUrl, getDriveThumbnailUrl } from '../lib/driveService';

interface MediaEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
  clientName?: string;
  isPortrait?: boolean;
}

export default function MediaEmbedModal({
  isOpen,
  onClose,
  url,
  title,
  clientName,
  isPortrait,
}: MediaEmbedModalProps) {
  const isDrive = Boolean(url && isGoogleDriveUrl(url));
  const [detectedPortrait, setDetectedPortrait] = useState<boolean>(Boolean(isPortrait));

  useEffect(() => {
    if (typeof isPortrait === 'boolean') {
      setDetectedPortrait(isPortrait);
      return;
    }
    setDetectedPortrait(false);
    if (!isOpen || !url || !isDrive) return;

    const thumb = getDriveThumbnailUrl(url, 400);
    if (!thumb) return;
    let active = true;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      if (active && img.naturalWidth > 0 && img.naturalHeight > img.naturalWidth) {
        setDetectedPortrait(true);
      }
    };
    img.src = thumb;
    return () => {
      active = false;
    };
  }, [isOpen, url, isDrive, isPortrait]);

  if (!isOpen || !url) return null;

  const driveEmbedUrl = getDriveEmbedUrl(url);
  const fileId = extractDriveFileId(url);

  let youtubeEmbedUrl: string | null = null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    youtubeEmbedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  }

  let vimeoEmbedUrl: string | null = null;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    vimeoEmbedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  const directEmbedUrl = driveEmbedUrl || youtubeEmbedUrl || vimeoEmbedUrl;
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : undefined;

  return (
    <div
      id="media-embed-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-in fade-in duration-200 select-none"
    >
      <div
        id="media-embed-card"
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#181818] border-0 text-white rounded-xl shadow-2xl w-full overflow-hidden cursor-default flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 ${
          detectedPortrait ? 'max-w-md' : 'max-w-4xl'
        }`}
      >
        <div className="px-4 py-3 border-b border-[#242424] flex items-center justify-between gap-3 bg-[#1e1e1e]">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-white truncate">
              {title || 'Preview'}
            </h3>
            {clientName && !clientName.includes('@') && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{clientName}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#282828] hover:bg-[#333333] text-slate-200 rounded-lg text-xs font-medium transition-colors border-0"
                title="Download"
              >
                <Download size={13} />
                <span>Download</span>
              </a>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium transition-colors"
              title="Open in Drive"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#282828] transition-colors cursor-pointer border-0 bg-transparent"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          className={`relative bg-black flex items-center justify-center overflow-hidden mx-auto w-full ${
            detectedPortrait
              ? 'aspect-[9/16] max-h-[78vh]'
              : 'aspect-video max-h-[78vh]'
          }`}
        >
          {directEmbedUrl ? (
            <iframe
              src={directEmbedUrl}
              title={title || 'Video Preview'}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="p-8 text-center space-y-3 text-white">
              <p className="text-sm font-semibold">External Link</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <span>Open Video</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
