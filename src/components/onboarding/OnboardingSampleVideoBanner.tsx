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
 * Compact card linking to the Drive-connected public sample video manager.
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
      <Card className="h-full p-4 sm:p-5 flex flex-col justify-between gap-4 bg-surface-700 border-surface-400">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">
            Sample Videos
          </h2>
          <p className="text-xs text-text-secondary">
            {samples.length > 0
              ? `${samples.length} video${samples.length > 1 ? 's' : ''} linked via Drive`
              : 'No Drive videos linked'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs h-9 px-3 inline-flex items-center gap-1.5"
          >
            <Video size={14} />
            <span>Manage ({samples.length})</span>
          </Button>
          {samples.length > 0 && (
            <a
              href={`${onboardingUrl}?view=samples`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 h-9 bg-surface-600 hover:bg-surface-500 text-text-primary text-xs font-medium rounded-lg inline-flex items-center gap-1.5 no-underline transition-colors"
            >
              <ExternalLink size={13} />
              <span>Preview</span>
            </a>
          )}
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
