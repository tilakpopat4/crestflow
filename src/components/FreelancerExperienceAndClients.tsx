import React, { useMemo } from 'react';
import { UserProfile, Client } from '../types';
import { calculateWorkJourney } from '../lib/anniversary';
import { Clock, Calendar } from 'lucide-react';

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
      <div className="bg-white dark:bg-slate-900 border-0 rounded-xl p-6 space-y-4 h-full flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Experience
            </h2>
            {workJourney && (
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {workJourney.formattedDuration}
              </span>
            )}
          </div>

          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
            {profile.workExperienceBio ||
              `Providing ${profile.servicesDescription.toLowerCase()} with fast turnarounds and clear communication.`}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#242424] border-0 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Clients
              </span>
              <span className="text-base font-bold text-slate-100 mt-1 block font-mono tabular-nums">
                {clients.length > 0 ? `${clients.length}+ Brands` : 'Open'}
              </span>
            </div>

            <div className="bg-[#242424] border-0 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Experience
              </span>
              <span className="text-base font-bold text-slate-100 mt-1 block font-mono tabular-nums">
                {workJourney ? `${workJourney.workedDays} Days` : 'Pro'}
              </span>
            </div>
          </div>
        </div>

        {profile.freelanceStartDate && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-2 border-t border-surface-500/50">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Active since {workJourney?.startDateFormatted || profile.freelanceStartDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
