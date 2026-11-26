import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Check } from 'lucide-react';
import { cleanUsername, isValidUsername, getOnboardingUrl } from '../../lib/userHandle';
import { SITE_URL } from '../../lib/siteConfig';
import ProfilePublicLinksCard from './ProfilePublicLinksCard';
import ProfileAvatarUploader from './ProfileAvatarUploader';

interface ProfilePublicSectionProps {
  user: FirebaseUser;
  name: string;
  setName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  professionalTitle: string;
  setProfessionalTitle: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  freelanceStartDate: string;
  setFreelanceStartDate: (val: string) => void;
  onAutoSaveDate?: (val: string) => void;
  photoURL?: string;
  onPhotoChange?: (val: string) => void;
  canEditUsername?: boolean;
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
  username,
  setUsername,
  professionalTitle,
  setProfessionalTitle,
  bio,
  setBio,
  freelanceStartDate,
  setFreelanceStartDate,
  onAutoSaveDate,
  photoURL,
  onPhotoChange,
  canEditUsername = true,
  isSaving,
  isSaved,
  isDirty,
  onSave,
  onDiscard,
}) => {
  const charsLeft = 160 - (bio?.length || 0);

  const cleanHandle = cleanUsername(username) || 'creator';
  const onboardingUrl = getOnboardingUrl(cleanHandle);
  const isHandleValid = isValidUsername(cleanHandle);

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
        <h2 className="text-base font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">
          Public profile
        </h2>
        <p className="mt-1 text-xs text-[#A1A1AA] dark:text-[#A1A1AA] leading-relaxed">
          Your public identity and handle.
        </p>
      </div>

      <div className="rounded-xl bg-[#131318] dark:bg-[#131318] overflow-hidden">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
          {/* Avatar with Direct Photo Upload */}
          <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
            <ProfileAvatarUploader
              currentPhotoUrl={photoURL || user.photoURL}
              fallbackInitial={(name || user.displayName || 'U').charAt(0).toUpperCase()}
              onPhotoUploaded={(url) => onPhotoChange && onPhotoChange(url)}
              onPhotoRemoved={() => onPhotoChange && onPhotoChange('')}
              disabled={isSaving}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#F7F7F8] dark:text-[#F7F7F8] truncate">
                  {name || user.displayName || 'Creator Account'}
                </span>
                {activeDays && (
                  <span className="text-[11px] font-medium text-[#A1A1AA] dark:text-[#A1A1AA]">
                    {activeDays}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#A1A1AA] dark:text-[#A1A1AA] truncate font-mono">
                @{cleanHandle} • {user.email || 'Authenticated Google Account'}
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA]">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Ortiz"
              className="block h-10 w-full rounded-lg bg-[#131318] dark:bg-[#1B1B22] px-3 text-sm text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] placeholder:text-[#A1A1AA] focus:border-[#2A2A33] dark:focus:border-[#2A2A33] outline-none transition-colors"
            />
          </div>

          {/* Professional Job Title */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="profile-title" className="block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA]">
                Job title
              </label>
              <span className="text-[11px] text-[#A1A1AA] dark:text-[#A1A1AA]">Optional</span>
            </div>
            <input
              id="profile-title"
              type="text"
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
              placeholder="e.g. UI/UX Designer, Web Developer, Video Editor"
              className="block h-10 w-full rounded-lg bg-[#131318] dark:bg-[#1B1B22] px-3 text-sm text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] placeholder:text-[#A1A1AA] focus:border-[#2A2A33] dark:focus:border-[#2A2A33] outline-none transition-colors"
            />
          </div>

          {/* Professional Username Handle */}
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="profile-username" className="block text-xs font-semibold text-[#F7F7F8]">
                Username
              </label>
              {!canEditUsername && (
                <span className="text-[11px] text-[#FFB020]">Activate plan to change public handle</span>
              )}
            </div>
            <div className="flex h-10 w-full overflow-hidden rounded-lg bg-[#1B1B22] border border-[#2A2A33] focus-within:border-[#F7F7F8] transition-colors">
              <span className="flex shrink-0 items-center pl-3 text-xs text-[#A1A1AA] select-none font-mono">
                {SITE_URL.replace(/^https?:\/\//, '')}/
              </span>
              <input
                id="profile-username"
                type="text"
                disabled={!canEditUsername}
                value={username}
                onChange={(e) => setUsername(cleanUsername(e.target.value))}
                placeholder="username"
                className="min-w-0 flex-1 bg-transparent px-1 text-xs text-[#F7F7F8] font-mono outline-none disabled:opacity-60"
              />
              <span className="flex shrink-0 items-center pr-3 text-xs text-[#A1A1AA] select-none font-mono">
                /onboarding
              </span>
            </div>
            {!isHandleValid && cleanHandle.length > 0 && (
              <p className="mt-1 text-[11px] text-rose-500">
                Handle must be 3-30 letters, numbers, hyphens or underscores (no spaces or reserved words).
              </p>
            )}
          </div>

          {/* Live Link Card */}
          <ProfilePublicLinksCard
            cleanHandle={cleanHandle}
            onboardingUrl={onboardingUrl}
          />

          {/* Career Start Date */}
          <div>
            <label htmlFor="profile-start-date" className="mb-1.5 block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA]">
              Start date
            </label>
            <input
              id="profile-start-date"
              type="date"
              value={freelanceStartDate}
              onChange={(e) => {
                const val = e.target.value;
                setFreelanceStartDate(val);
                onAutoSaveDate?.(val);
              }}
              onBlur={() => onAutoSaveDate?.(freelanceStartDate)}
              className="block h-10 w-full rounded-lg bg-[#131318] dark:bg-[#1B1B22] px-3 text-sm text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] placeholder:text-[#A1A1AA] focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
          </div>

          {/* Bio / Experience */}
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="profile-bio" className="block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA]">
                Bio
              </label>
              <span className="text-[11px] text-[#A1A1AA] dark:text-[#A1A1AA] tabular-nums">{charsLeft} left</span>
            </div>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Independent creative specializing in high-impact design, development, or video storytelling."
              className="block w-full resize-y rounded-lg bg-[#131318] dark:bg-[#1B1B22] p-3 text-sm text-[#F7F7F8] dark:text-[#F7F7F8] border border-[#2A2A33] dark:border-[#2A2A33] placeholder:text-[#A1A1AA] focus:border-indigo-600 dark:focus:border-indigo-400 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Section Action Bar */}
        <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[#2A2A33] dark:border-[#2A2A33] px-5 py-3 sm:px-6">
          <p className="mr-auto flex items-center gap-1.5 text-xs text-[#A1A1AA] dark:text-[#A1A1AA]">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 text-text-primary font-medium">
                <Check size={13} />
                <span>Saved</span>
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-[#A1A1AA] dark:text-[#A1A1AA] font-medium">
                <span className="size-1.5 rounded-full bg-accent" />
                <span>Unsaved changes</span>
              </span>
            ) : (
              <span>Up to date</span>
            )}
          </p>

          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onDiscard}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#2A2A33] hover:bg-[#2A2A33] border-0 px-3.5 text-xs font-semibold text-[#A1A1AA] hover:text-white cursor-pointer transition-colors duration-120"
            >
              Discard
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 text-xs font-semibold cursor-pointer border-0 transition-colors duration-120"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProfilePublicSection;
