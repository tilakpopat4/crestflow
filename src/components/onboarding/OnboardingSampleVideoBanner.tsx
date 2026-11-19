import React, { useState } from 'react';
import { Video, ExternalLink } from 'lucide-react';
import { UserProfile, SampleWorkItem, WorkItem } from '../../types';
import ManageSampleVideosModal from './ManageSampleVideosModal';
import { Card } from '../ui/Card';
import { Button } from '../ui/button';

interface OnboardingSampleVideoBannerProps {
  profile: UserProfile | null;
  workItems?: WorkItem[];
  onboardingUrl: string;
  onSaveProfile?: (profile: UserProfile) => Promise<void>;
}

/**
 * OnboardingSampleVideoBanner Component
 * Workspace banner linking to the Drive-connected public sample video manager.
 */
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
      <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-700 border-surface-400">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-text-primary">
            Public Sample Video Library
          </h2>
          <p className="text-xs text-text-secondary">
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
              className="px-3 h-8 bg-surface-600 hover:bg-surface-500 text-text-primary text-xs font-medium rounded-lg inline-flex items-center gap-1.5 no-underline transition-colors"
            >
              <ExternalLink size={13} />
              Preview Public Library
            </a>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs h-8 inline-flex items-center gap-1.5"
          >
            <Video size={14} />
            Manage Sample Videos ({samples.length})
          </Button>
        </div>
      </Card>

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
