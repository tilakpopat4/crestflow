import React, { useState } from 'react';
import { Video, ExternalLink } from 'lucide-react';
import { UserProfile, SampleWorkItem, WorkItem } from '../../types';
import ManageSampleVideosModal from './ManageSampleVideosModal';

interface OnboardingSampleVideoBannerProps {
  profile: UserProfile | null;
  workItems?: WorkItem[];
  onboardingUrl: string;
  onSaveProfile?: (profile: UserProfile) => Promise<void>;
}

export const OnboardingSampleVideoBanner: React.FC<OnboardingSampleVideoBannerProps> = ({
  profile,
  workItems = [],
  onboardingUrl,
  onSaveProfile,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const samples = profile?.sampleWorks || [];

  const handleSave = async (newSamples: SampleWorkItem[]) => {
    if (!profile || !onSaveProfile) return;
    await onSaveProfile({
      ...profile,
      sampleWorks: newSamples,
    });
  };

  return (
    <>
      <div className="bg-white dark:bg-[#212121] border border-slate-200 dark:border-[#333333] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Public Sample Video Library
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {samples.length > 0
              ? `${samples.length} sample video${samples.length > 1 ? 's' : ''} connected to Google Drive for prospective clients.`
              : 'Manually select sample edited videos connected to Google Drive to showcase on your onboarding link.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {samples.length > 0 && (
            <a
              href={`${onboardingUrl}?view=samples`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 no-underline transition-colors"
            >
              <ExternalLink size={13} />
              Preview Public Library
            </a>
          )}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-[#282828] hover:bg-[#1a1a1a] text-white text-xs font-semibold rounded-lg cursor-pointer border-0 inline-flex items-center gap-1.5 transition-colors"
          >
            <Video size={14} />
            Manage Sample Videos ({samples.length})
          </button>
        </div>
      </div>

      <ManageSampleVideosModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        samples={samples}
        workItems={workItems}
        onSaveSamples={handleSave}
      />
    </>
  );
};

export default OnboardingSampleVideoBanner;
