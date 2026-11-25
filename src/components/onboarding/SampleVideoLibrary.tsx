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
 * on the public client onboarding page.
 */
export default function SampleVideoLibrary({
  samples = [],
  onOpenIntake,
}: SampleVideoLibraryProps) {
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    title: string;
    clientName?: string;
    isPortrait: boolean;
  } | null>(null);

  const hasSamples = samples && samples.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          Sample Videos
        </h2>

        {onOpenIntake && (
          <button
            type="button"
            onClick={onOpenIntake}
            className="px-3.5 py-1.5 bg-surface-500 hover:bg-surface-400 text-text-primary border-0 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Project Brief
          </button>
        )}
      </div>

      {!hasSamples ? (
        <div className="bg-[#181818] border-0 rounded-xl p-8 text-center space-y-2.5">
          <div className="w-11 h-11 mx-auto rounded-full bg-[#242424] text-slate-400 flex items-center justify-center">
            <Film className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            No sample videos
          </p>
          <p className="text-xs text-slate-400">
            No videos published yet.
          </p>
          {onOpenIntake && (
            <button
              type="button"
              onClick={onOpenIntake}
              className="mt-1 text-xs font-medium text-slate-300 hover:text-white cursor-pointer border-0 bg-transparent"
            >
              Request samples &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
          {samples.map((item) => (
            <SampleVideoCard
              key={item.id}
              item={item}
              onSelect={(selected, isPortrait) =>
                setSelectedVideo({
                  url: selected.videoUrl,
                  title: selected.title,
                  clientName: selected.clientName,
                  isPortrait,
                })
              }
            />
          ))}
        </div>
      )}

      {selectedVideo && (
        <MediaEmbedModal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          url={selectedVideo.url}
          title={selectedVideo.title}
          clientName={selectedVideo.clientName}
          isPortrait={selectedVideo.isPortrait}
        />
      )}
    </div>
  );
}
