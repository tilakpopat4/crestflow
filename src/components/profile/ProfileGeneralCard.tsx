import React from 'react';
import { Calendar, Mail } from 'lucide-react';
import { User } from 'firebase/auth';

interface ProfileGeneralCardProps {
  user: User;
  name: string;
  setName: (val: string) => void;
  professionalTitle: string;
  setProfessionalTitle: (val: string) => void;
  servicesDescription: string;
  setServicesDescription: (val: string) => void;
  freelanceStartDate: string;
  setFreelanceStartDate: (val: string) => void;
  workExperienceBio: string;
  setWorkExperienceBio: (val: string) => void;
}

export const ProfileGeneralCard: React.FC<ProfileGeneralCardProps> = ({
  user,
  name,
  setName,
  professionalTitle,
  setProfessionalTitle,
  servicesDescription,
  setServicesDescription,
  freelanceStartDate,
  setFreelanceStartDate,
  workExperienceBio,
  setWorkExperienceBio
}) => {
  const getActiveDaysLabel = () => {
    if (!freelanceStartDate) return '';
    const start = new Date(freelanceStartDate);
    if (isNaN(start.getTime())) return '';
    const diffDays = Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return `${diffDays} days active`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs p-5 sm:p-6 space-y-5">
      {/* Profile Picture & Connected Account Details */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={name || 'Profile Picture'}
            className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center text-xl font-bold border-2 border-slate-200 dark:border-slate-700 shrink-0">
            {(name || user.displayName || user.email || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {name || user.displayName || 'Creator Account'}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Google Connected
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
            <Mail size={13} className="shrink-0 text-slate-400" />
            <span className="truncate font-mono">{user.email || 'No email associated'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Tilak Popat"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Account Email (Google Auth)
          </label>
          <div className="relative">
            <input
              type="email"
              readOnly
              value={user.email || ''}
              className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed font-mono"
            />
            <Mail size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Professional Title
          </label>
          <input
            type="text"
            placeholder="e.g. Video Editor &amp; Motion Designer"
            value={professionalTitle}
            onChange={(e) => setProfessionalTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Freelancing Start Date</span>
            </span>
            {freelanceStartDate && (
              <span className="text-[11px] text-slate-500 font-mono">
                {getActiveDaysLabel()}
              </span>
            )}
          </label>
          <input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={freelanceStartDate}
            onChange={(e) => setFreelanceStartDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Services Description
        </label>
        <input
          type="text"
          placeholder="e.g. YouTube Longform, Instagram Reels, Color Grading"
          value={servicesDescription}
          onChange={(e) => setServicesDescription(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Work Experience &amp; Bio (Optional)
        </label>
        <textarea
          rows={3}
          placeholder="Describe your background, software tools (Premiere, DaVinci, After Effects), and client highlights..."
          value={workExperienceBio}
          onChange={(e) => setWorkExperienceBio(e.target.value)}
          className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors resize-none leading-relaxed"
        />
      </div>
    </div>
  );
};
