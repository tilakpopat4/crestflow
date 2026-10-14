import React, { useState, useMemo } from 'react';
import { UserProfile, Client } from '../types';
import { calculateWorkJourney } from '../lib/anniversary';
import { 
  Briefcase, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Users, 
  Layers, 
  Search,
  Sparkles
} from 'lucide-react';

interface FreelancerExperienceAndClientsProps {
  profile: UserProfile;
  clients: Client[];
  loading?: boolean;
}

type ClientTabFilter = 'all' | 'current' | 'previous';

/**
 * FreelancerExperienceAndClients renders professional background details,
 * career journey / work experience, and past + current clients portfolio.
 */
export default function FreelancerExperienceAndClients({
  profile,
  clients,
  loading = false,
}: FreelancerExperienceAndClientsProps) {
  const [activeTab, setActiveTab] = useState<ClientTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate career duration and worked journey
  const workJourney = useMemo(() => {
    return calculateWorkJourney(profile.freelanceStartDate);
  }, [profile.freelanceStartDate]);

  // Partition clients into Current and Previous
  const currentClients = useMemo(() => {
    return clients.filter((c) => !c.isClosed);
  }, [clients]);

  const previousClients = useMemo(() => {
    return clients.filter((c) => c.isClosed);
  }, [clients]);

  // Filter clients based on selected tab and search term
  const displayedClients = useMemo(() => {
    let list: Client[] = [];
    if (activeTab === 'current') {
      list = currentClients;
    } else if (activeTab === 'previous') {
      list = previousClients;
    } else {
      list = clients;
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((c) => {
      const matchName = c.name.toLowerCase().includes(query);
      const matchExp = c.workExperience?.toLowerCase().includes(query);
      const matchSub = c.subClients?.some((sc) => sc.name.toLowerCase().includes(query));
      return matchName || matchExp || matchSub;
    });
  }, [activeTab, currentClients, previousClients, clients, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Work Experience & Career Journey Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
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
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
            {profile.workExperienceBio}
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
            Providing high-quality {profile.servicesDescription.toLowerCase()} with a focus on fast turnarounds, consistent brand aesthetics, and clear client communication.
          </p>
        )}

        {/* Key Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Clients Serviced
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
              {clients.length > 0 ? `${clients.length}+ Brands` : 'Open for New Clients'}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Active Experience
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
              {workJourney ? `${workJourney.workedDays} Days` : 'Established Pro'}
            </span>
          </div>
        </div>

        {profile.freelanceStartDate && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Freelancing actively since {workJourney?.startDateFormatted || profile.freelanceStartDate}</span>
          </div>
        )}
      </div>

      {/* 2. Clients Portfolio Card (Previous + Current) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Clients & Collaborations
            </h2>
          </div>

          {/* Neutral Tab Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All ({clients.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Current ({currentClients.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('previous')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'previous'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Previous ({previousClients.length})
            </button>
          </div>
        </div>

        {/* Optional Search if client list is longer */}
        {clients.length > 4 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients or projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Client List */}
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            Loading client records...
          </div>
        ) : displayedClients.length > 0 ? (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {displayedClients.map((client) => {
              const isCurrent = !client.isClosed;
              return (
                <div
                  key={client.id}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl space-y-2 text-left transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {client.name}
                      </h3>
                      {client.clientFrom && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Since {client.clientFrom}
                        </p>
                      )}
                    </div>

                    {/* Status Text (Plain text with 6px dot as per GEMINI.md) */}
                    <div className="flex items-center gap-1.5 text-xs font-medium shrink-0 pt-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCurrent
                            ? 'bg-indigo-600 dark:bg-indigo-400'
                            : 'bg-slate-400 dark:text-slate-500'
                        }`}
                      />
                      <span
                        className={
                          isCurrent
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {isCurrent ? 'Current' : 'Previous'}
                      </span>
                    </div>
                  </div>

                  {/* Work Experience with this Client */}
                  {client.workExperience && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800/80">
                      {client.workExperience}
                    </p>
                  )}

                  {/* Sub-clients or brands if present */}
                  {client.subClients && client.subClients.length > 0 && (
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Sub-brands:
                      </span>
                      {client.subClients.map((sub) => (
                        <span
                          key={sub.id}
                          className="text-xs text-slate-500 dark:text-slate-400 font-medium"
                        >
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            {searchQuery
              ? 'No matching clients found.'
              : activeTab === 'current'
              ? 'No active current clients listed.'
              : activeTab === 'previous'
              ? 'No previous clients listed.'
              : 'No client records available yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
