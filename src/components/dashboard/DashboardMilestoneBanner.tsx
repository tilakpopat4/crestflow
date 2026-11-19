import React from 'react';
import { Award } from 'lucide-react';

interface DashboardMilestoneBannerProps {
  journey: {
    workedDays: number;
    formattedDuration: string;
    startDateFormatted: string;
    currentAnniversary?: {
      title: string;
      description: string;
    };
    nextMilestone?: {
      badge: string;
    };
  };
}

export const DashboardMilestoneBanner: React.FC<DashboardMilestoneBannerProps> = ({ journey }) => {
  return (
    <div className="bg-surface-800 border border-surface-400 text-text-primary p-4 sm:p-5 rounded-xl flex items-center justify-between gap-4 relative animate-in fade-in duration-200">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-surface-600 border border-surface-400 flex items-center justify-center shrink-0 text-text-secondary">
          <Award size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-surface-600 text-text-secondary px-2 py-0.5 rounded border border-surface-400/60">
              Freelancing Journey
            </span>
            <span className="text-xs text-text-secondary font-mono tabular-nums">
              {journey.workedDays} days worked ({journey.formattedDuration})
            </span>
          </div>
          {journey.currentAnniversary ? (
            <>
              <h3 className="text-base font-bold mt-0.5 text-text-primary">{journey.currentAnniversary.title}!</h3>
              <p className="text-xs text-text-secondary max-w-xl">{journey.currentAnniversary.description}</p>
            </>
          ) : (
            <p className="text-xs text-text-secondary mt-0.5">
              Started on {journey.startDateFormatted}. Next milestone: {journey.nextMilestone?.badge || 'Career growth'}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardMilestoneBanner;
