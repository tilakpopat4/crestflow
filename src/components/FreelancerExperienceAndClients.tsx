import React, { useMemo } from 'react';
import { UserProfile, Client } from '../types';
import { calculateWorkJourney } from '../lib/anniversary';

interface FreelancerExperienceAndClientsProps {
  profile: UserProfile;
  clients: Client[];
  loading?: boolean;
}

/**
 * FreelancerExperienceAndClients renders professional background details
 * and career journey / work experience.
 */
export default function FreelancerExperienceAndClients({
  profile,
  clients,
}: FreelancerExperienceAndClientsProps) {
  const workJourney = useMemo(() => {
    return calculateWorkJourney(profile.freelanceStartDate);
  }, [profile.freelanceStartDate]);

  return (
    <div className="h-full">
      <div className="bg-[#131318] dark:bg-[#131318] border-0 rounded-xl p-6 space-y-4 h-full flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
              Experience
            </h2>
            {workJourney && (
              <span className="text-xs text-[#A1A1AA] font-medium">
                {workJourney.formattedDuration}
              </span>
            )}
          </div>

          <p className="text-[#A1A1AA] text-sm leading-relaxed whitespace-pre-line">
            {profile.workExperienceBio ||
              `Providing ${profile.servicesDescription.toLowerCase()} with fast turnarounds.`}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#1B1B22] border-0 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider block">
                Clients
              </span>
              <span className="text-base font-bold text-[#F7F7F8] mt-1 block font-mono tabular-nums">
                {clients.length > 0 ? `${clients.length}+ Brands` : 'Open'}
              </span>
            </div>

            <div className="bg-[#1B1B22] border-0 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider block">
                Experience
              </span>
              <span className="text-base font-bold text-[#F7F7F8] mt-1 block font-mono tabular-nums">
                {workJourney ? `${workJourney.workedDays} Days` : 'Pro'}
              </span>
            </div>
          </div>
        </div>

        {profile.freelanceStartDate && (
          <div className="text-xs text-[#A1A1AA] pt-2 border-t border-surface-500/50">
            Active since {workJourney?.startDateFormatted || profile.freelanceStartDate}
          </div>
        )}
      </div>
    </div>
  );
}
