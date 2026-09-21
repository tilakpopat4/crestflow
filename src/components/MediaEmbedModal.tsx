import React from 'react';
import { X, ExternalLink, Download, Play, Video } from 'lucide-react';
import { getDriveEmbedUrl, extractDriveFileId, isGoogleDriveUrl } from '../lib/driveService';

interface MediaEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
  clientName?: string;
}

export default function MediaEmbedModal({
  isOpen,
  onClose,
  url,
  title,
  clientName
}: MediaEmbedModalProps) {
  if (!isOpen || !url) return null;

  const isDrive = isGoogleDriveUrl(url);
  const driveEmbedUrl = getDriveEmbedUrl(url);
  const fileId = extractDriveFileId(url);

  // Check if it's YouTube
  let youtubeEmbedUrl: string | null = null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    youtubeEmbedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  }

  // Check if it's Vimeo
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
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-in fade-in duration-200"
    >
      <div
        id="media-embed-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden cursor-default flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
              {isDrive ? <Video size={20} /> : <Play size={18} className="fill-indigo-600 dark:fill-indigo-400" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {title || 'Media Preview'}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                {clientName && <span>Client: <strong className="text-slate-700 dark:text-slate-300">{clientName}</strong></span>}
                {isDrive && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    • Google Drive Video
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                title="Download original file"
              >
                <Download size={13} />
                <span>Download</span>
              </a>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              title="Open link in Google Drive / new tab"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open in Drive</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Player Container */}
        <div className="relative bg-black flex-1 min-h-[360px] sm:min-h-[480px] flex items-center justify-center overflow-hidden">
          {directEmbedUrl ? (
            <iframe
              src={directEmbedUrl}
              title={title || 'Embedded Deliverable'}
              className="w-full h-full min-h-[380px] sm:min-h-[500px] border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="p-8 text-center space-y-3 text-white">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-white">
                <ExternalLink size={26} />
              </div>
              <h4 className="text-base font-bold">External Post Link</h4>
              <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
                This deliverable is hosted on an external social platform (e.g. Instagram). Click below to view the post directly.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-all"
              >
                <span>Open Video in New Tab</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 px-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate max-w-md font-mono text-[11px]">{url}</span>
          <span className="shrink-0 text-[11px] font-medium">CrestFlow Drive Player</span>
        </div>
      </div>
    </div>
  );
}
