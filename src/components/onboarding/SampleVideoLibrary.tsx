import React, { useState } from 'react';
import { Film } from 'lucide-react';
import { SampleWorkItem } from '../../types';
import MediaEmbedModal from '../MediaEmbedModal';
import SampleVideoCard from './SampleVideoCard';

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
            className="self-start sm:self-auto px-3.5 py-1.5 bg-surface-500 hover:bg-surface-400 text-text-primary border border-surface-400 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Submit Project Brief
          </button>
        )}
      </div>

      {/* Video Grid */}
      {!hasSamples ? (
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#242424] text-slate-400 flex items-center justify-center">
            <Film className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            No sample videos published yet
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {freelancerName ? `${freelancerName}'s` : "The freelancer's"} public video library will appear here once sample edits are linked.
          </p>
          {onOpenIntake && (
            <button
              type="button"
              onClick={onOpenIntake}
              className="mt-2 text-xs font-semibold text-indigo-400 hover:underline cursor-pointer border-0 bg-transparent"
            >
              Submit an inquiry to request custom samples &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {samples.map((item) => (
            <SampleVideoCard
              key={item.id}
              item={item}
              onSelect={(selected) =>
                setSelectedVideo({
                  url: selected.videoUrl,
                  title: selected.title,
                  clientName: selected.clientName,
                })
              }
            />
          ))}
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
