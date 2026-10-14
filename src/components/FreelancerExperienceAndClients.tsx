import React, { useMemo } from 'react';
import { UserProfile, Client } from '../types';
import { calculateWorkJourney } from '../lib/anniversary';
import { 
  Briefcase, 
  Clock, 
  Calendar 
} from 'lucide-react';

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
  loading = false,
}: FreelancerExperienceAndClientsProps) {
  // Calculate career duration and worked journey
  const workJourney = useMemo(() => {
    return calculateWorkJourney(profile.freelanceStartDate);
  }, [profile.freelanceStartDate]);

  return (
    <div>
      {/* Work Experience & Career Journey Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Work Experience & Journey
            </h2>
          </div>
          {workJourney && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {workJourney.formattedDuration}
            </span>
          )}
        </div>

        {/* Experience Overview / Bio */}
        {profile.workExperienceBio ? (
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5 rounded-lg">
            {profile.workExperienceBio}
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5 rounded-lg">
            Providing high-quality {profile.servicesDescription.toLowerCase()} with a focus on fast turnarounds, consistent brand aesthetics, and clear client communication.
          </p>
        )}

        {/* Key Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Clients Serviced
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 block">
              {clients.length > 0 ? `${clients.length}+ Brands` : 'Open for New Clients'}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Active Experience
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 block">
              {workJourney ? `${workJourney.workedDays} Days` : 'Established Pro'}
            </span>
          </div>
        </div>

        {profile.freelanceStartDate && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Freelancing actively since {workJourney?.startDateFormatted || profile.freelanceStartDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
