import React from 'react';
import { UserProfile } from '../types';
import { auth } from '../firebase';

interface PublicFreelancerProfileCardProps {
  profile: UserProfile;
  freelancerId: string;
  onViewSamples?: () => void;
  samplesCount?: number;
}

/**
 * PublicFreelancerProfileCard displays freelancer branding, profile picture,
 * services offered, and contact points on the public client onboarding page.
 */
export default function PublicFreelancerProfileCard({
  profile,
  freelancerId,
  onViewSamples,
  samplesCount,
}: PublicFreelancerProfileCardProps) {
  const photoUrl = profile.photoURL || (auth.currentUser?.uid === freelancerId ? auth.currentUser?.photoURL : null);

  return (
    <div className="bg-[#131318] dark:bg-[#131318] border-0 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={profile.name}
            className="w-14 h-14 rounded-full object-cover border-0 shrink-0"
            referrerPolicy="no-referrer"
            decoding="async"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#1B1B22] text-white flex items-center justify-center text-lg font-bold border-0 shrink-0">
            {(profile.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-[#A1A1AA] block mb-0.5">
            Available
          </span>
          <h1 className="text-xl font-bold text-[#F7F7F8] dark:text-white tracking-tight truncate">
            {profile.name}
          </h1>
          {profile.professionalTitle && (
            <p className="text-[#A1A1AA] font-medium text-xs uppercase tracking-wider mt-0.5 truncate">
              {profile.professionalTitle}
            </p>
          )}
        </div>
      </div>

      {profile.servicesDescription && (
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">
            Services
          </h3>
          <p className="text-[#F7F7F8] text-sm leading-relaxed whitespace-pre-line">
            {profile.servicesDescription}
          </p>
        </div>
      )}

      {(profile.phone || (onViewSamples && samplesCount !== undefined && samplesCount > 0)) && (
        <div className="pt-3 border-t border-surface-500/50 space-y-2.5">
          {profile.phone && (
            <p className="text-xs text-[#A1A1AA] font-mono">
              {profile.phone}
            </p>
          )}

          {onViewSamples && samplesCount !== undefined && samplesCount > 0 && (
            <button
              type="button"
              onClick={onViewSamples}
              className="w-full py-2 px-3 bg-[#1B1B22] hover:bg-[#2A2A33] text-[#F7F7F8] text-xs font-medium rounded-lg text-center cursor-pointer border-0 transition-colors"
            >
              Sample Videos ({samplesCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
