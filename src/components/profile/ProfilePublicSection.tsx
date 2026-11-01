import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Check, Sparkles } from 'lucide-react';

interface ProfilePublicSectionProps {
  user: FirebaseUser;
  name: string;
  setName: (val: string) => void;
  professionalTitle: string;
  setProfessionalTitle: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  freelanceStartDate: string;
  setFreelanceStartDate: (val: string) => void;
  isSaving: boolean;
  isSaved: boolean;
  isDirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * Public profile section styled after modern minimalist settings panels.
 * Split layout: explanatory summary on the left, card form with action bar on the right.
 */
export const ProfilePublicSection: React.FC<ProfilePublicSectionProps> = ({
  user,
  name,
  setName,
  professionalTitle,
  setProfessionalTitle,
  bio,
  setBio,
  freelanceStartDate,
  setFreelanceStartDate,
  isSaving,
  isSaved,
  isDirty,
  onSave,
  onDiscard,
}) => {
  const charsLeft = 160 - (bio?.length || 0);

  const getActiveDaysLabel = () => {
    if (!freelanceStartDate) return null;
    const start = new Date(freelanceStartDate);
    if (isNaN(start.getTime())) return null;
    const diffDays = Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return `${diffDays} days active`;
  };

  const activeDays = getActiveDaysLabel();

  return (
    <section id="section-profile" className="grid grid-cols-1 gap-x-8 gap-y-4 pt-6 first:pt-0 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Public profile
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          How you appear to clients, invoice recipients, and on public onboarding intake links.
        </p>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 shadow-xs ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
          {/* Avatar and Account info */}
          <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
            <span className="relative size-16 shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={name || 'Profile Photo'}
                  className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 object-cover outline-1 -outline-offset-1 outline-black/5"
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xl font-semibold text-slate-900 dark:text-slate-100 select-none">
                  {(name || user.displayName || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {name || user.displayName || 'Creator Account'}
                </span>
                {activeDays && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <Sparkles size={11} className="text-indigo-600 dark:text-indigo-400" />
                    {activeDays}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email || 'Authenticated Google Account'}
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Ortiz"
              className="block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Displayed on exported invoices and client communications.
            </p>
          </div>

          {/* Professional Job Title */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="profile-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Job title
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Optional</span>
            </div>
            <input
              id="profile-title"
              type="text"
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
              placeholder="e.g. Video Editor / Motion Designer"
              className="block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Shown under your name in client onboarding portals.
            </p>
          </div>

          {/* Public Profile Link / Username */}
          <div className="sm:col-span-2">
            <label htmlFor="profile-link" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Public intake link
            </label>
            <div className="flex h-10 w-full overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400 transition-colors">
              <span className="flex shrink-0 items-center pl-3 text-xs text-slate-500 dark:text-slate-400 select-none font-mono">
                {typeof window !== 'undefined' ? `${window.location.host}/profile/` : 'crestflow.app/profile/'}
              </span>
              <input
                id="profile-link"
                type="text"
                readOnly
                value={user.uid}
                className="min-w-0 flex-1 bg-transparent pr-3 text-xs text-slate-700 dark:text-slate-300 font-mono outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Clients use this address to view your deliverables showcase and submit project requests.
            </p>
          </div>

          {/* Career Start Date */}
          <div>
            <label htmlFor="profile-start-date" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Career start date
            </label>
            <input
              id="profile-start-date"
              type="date"
              value={freelanceStartDate}
              onChange={(e) => setFreelanceStartDate(e.target.value)}
              className="block h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Powers streak badges and automatic milestone celebrations.
            </p>
          </div>

          {/* Bio / Experience */}
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="profile-bio" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bio &amp; experience
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Optional</span>
            </div>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Video editor specializing in short-form retention edits and high-converting YouTube storytelling."
              className="block w-full resize-y rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Displayed on your public freelancer profile.</span>
              <span className="tabular-nums">{charsLeft} characters left</span>
            </div>
          </div>
        </div>

        {/* Section Action Bar */}
        <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3 sm:px-6">
          <p className="mr-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                <Check size={13} />
                <span>Saved just now</span>
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <span className="size-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                <span>You have unsaved changes</span>
              </span>
            ) : (
              <span>All changes up to date</span>
            )}
          </p>

          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onDiscard}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer border-0 transition-colors duration-120"
            >
              Discard
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 text-xs font-semibold cursor-pointer border-0 transition-colors duration-120"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProfilePublicSection;

