import React from 'react';
import { UserProfile } from '../types';
import { Briefcase, Phone, Mail } from 'lucide-react';
import { auth } from '../firebase';

interface PublicFreelancerProfileCardProps {
  profile: UserProfile;
  freelancerId: string;
}

/**
 * PublicFreelancerProfileCard displays freelancer branding, profile picture,
 * services offered, and contact points on the public client onboarding page.
 */
export default function PublicFreelancerProfileCard({
  profile,
  freelancerId,
}: PublicFreelancerProfileCardProps) {
  const photoUrl = profile.photoURL || (auth.currentUser?.uid === freelancerId ? auth.currentUser?.photoURL : null);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
      {/* Header with Profile Picture */}
      <div className="flex items-start gap-4">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={profile.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-xs shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center text-xl font-bold border-2 border-slate-100 dark:border-slate-800 shrink-0">
            {(profile.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              Open for Bookings
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{profile.name}</h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase mt-0.5">{profile.professionalTitle}</p>
        </div>
      </div>

      {/* Services Description */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Services Provided
        </h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
          {profile.servicesDescription}
        </p>
      </div>

      {/* Contact Points */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        {profile.phone && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <div className="w-7 h-7 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <span>{profile.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <div className="w-7 h-7 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </div>
          <span>Contact via onboarding form</span>
        </div>
      </div>
    </div>
  );
}
