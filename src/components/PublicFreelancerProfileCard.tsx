import React from 'react';
import { UserProfile } from '../types';
import { Phone, Mail, Film } from 'lucide-react';
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
    <div className="bg-white dark:bg-slate-900 border-0 rounded-xl p-6 space-y-5">
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
          <div className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center text-lg font-bold border-0 shrink-0">
            {(profile.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="mb-0.5">
            <span className="text-[11px] font-medium text-slate-400 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Available
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{profile.name}</h1>
          {profile.professionalTitle && (
            <p className="text-slate-400 font-medium text-xs uppercase tracking-wider mt-0.5 truncate">
              {profile.professionalTitle}
            </p>
          )}
        </div>
      </div>

      {profile.servicesDescription && (
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Services
          </h3>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
            {profile.servicesDescription}
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-surface-500/50 space-y-2">
        {profile.phone && (
          <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{profile.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Contact via intake form</span>
        </div>

        {onViewSamples && samplesCount !== undefined && samplesCount > 0 && (
          <button
            type="button"
            onClick={onViewSamples}
            className="w-full mt-2 py-2 px-3 bg-[#242424] hover:bg-[#2e2e2e] text-slate-100 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border-0 transition-colors"
          >
            <Film size={14} className="text-slate-300" />
            <span>Sample Videos ({samplesCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
