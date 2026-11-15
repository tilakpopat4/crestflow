import React, { useState } from 'react';
import { Play, Video, ExternalLink, Film } from 'lucide-react';
import { SampleWorkItem } from '../../types';
import { getDriveEmbedUrl, isGoogleDriveUrl } from '../../lib/driveService';
import MediaEmbedModal from '../MediaEmbedModal';

interface SampleVideoLibraryProps {
  samples?: SampleWorkItem[];
  freelancerName?: string;
  onOpenIntake?: () => void;
}

/**
 * SampleVideoLibrary displays the freelancer's curated video library
 * connected to Google Drive on the public client onboarding page.
 */
export default function SampleVideoLibrary({
  samples = [],
  freelancerName,
  onOpenIntake,
}: SampleVideoLibraryProps) {
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    title: string;
    clientName?: string;
  } | null>(null);

  const hasSamples = samples && samples.length > 0;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Sample Works & Video Library
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Curated video edits and client deliverables hosted on Google Drive.
          </p>
        </div>

        {onOpenIntake && (
          <button
            type="button"
            onClick={onOpenIntake}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-[#282828] hover:bg-[#1a1a1a] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer border-0"
          >
            Submit Project Brief
          </button>
        )}
      </div>

      {/* Video Grid */}
      {!hasSamples ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No sample videos published yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {freelancerName ? `${freelancerName}'s` : "The freelancer's"} public video library will appear here once sample edits are linked.
          </p>
          {onOpenIntake && (
            <button
              type="button"
              onClick={onOpenIntake}
              className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Submit an inquiry to request custom samples &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {samples.map((item) => {
            const isDrive = isGoogleDriveUrl(item.videoUrl);
            const embedUrl = getDriveEmbedUrl(item.videoUrl);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Embed Video Preview Box */}
                <div className="relative aspect-video bg-black/90 w-full overflow-hidden flex items-center justify-center group">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={item.title}
                      className="w-full h-full border-0 pointer-events-none"
                      tabIndex={-1}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                      <Video className="w-8 h-8" />
                      <span className="text-[11px] font-mono">Google Drive Video</span>
                    </div>
                  )}

                  {/* Play Action Overlay */}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedVideo({
                        url: item.videoUrl,
                        title: item.title,
                        clientName: item.clientName,
                      })
                    }
                    className="absolute inset-0 bg-slate-950/40 hover:bg-slate-950/20 flex items-center justify-center transition-colors cursor-pointer border-0"
                    title={`Watch ${item.title}`}
                    aria-label={`Play ${item.title}`}
                  >
                    <span className="w-12 h-12 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Play size={20} className="ml-0.5 fill-current" />
                    </span>
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </h3>
                      {item.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Watch Preview Link & Source Link */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVideo({
                          url: item.videoUrl,
                          title: item.title,
                          clientName: item.clientName,
                        })
                      }
                      className="text-indigo-600 dark:text-indigo-400 font-medium inline-flex items-center gap-1.5 hover:underline cursor-pointer border-0 bg-transparent p-0"
                    >
                      <Play size={14} className="fill-current" />
                      Watch Preview
                    </button>

                    <a
                      href={item.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 inline-flex items-center gap-1 text-[11px]"
                      title="Open in Google Drive"
                    >
                      <span>Drive</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Video Player Modal */}
      {selectedVideo && (
        <MediaEmbedModal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          url={selectedVideo.url}
          title={selectedVideo.title}
          clientName={selectedVideo.clientName}
        />
      )}
    </div>
  );
}
