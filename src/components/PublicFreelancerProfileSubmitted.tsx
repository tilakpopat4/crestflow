import React from 'react';
import { UserProfile } from '../types';
import { CheckCircle2, MessageCircle } from 'lucide-react';

interface PublicFreelancerProfileSubmittedProps {
  profile: UserProfile;
  clientName: string;
  contactEmail: string;
  submittedWhatsAppUrl: string | null;
  onReset: () => void;
}

/**
 * PublicFreelancerProfileSubmitted renders the clean confirmation view
 * with details and WhatsApp redirection button following intake submission.
 */
export const PublicFreelancerProfileSubmitted: React.FC<PublicFreelancerProfileSubmittedProps> = ({
  profile,
  clientName,
  contactEmail,
  submittedWhatsAppUrl,
  onReset,
}) => {
  const profilePic = profile.photoURL;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center transition-colors duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 max-w-md w-full shadow-xs space-y-5">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Onboarding Submitted!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            Your onboarding details have been sent to <strong>{profile.name}</strong>. Redirecting to WhatsApp to send a confirmation...
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-lg p-3.5 text-left space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500">Freelancer:</span>
            <div className="flex items-center gap-2">
              {profilePic ? (
                <img src={profilePic} alt={profile.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
              ) : null}
              <span className="font-semibold text-slate-950 dark:text-slate-100">{profile.name}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 dark:text-slate-500">Client / Company:</span>
            <span className="font-semibold text-slate-950 dark:text-slate-100">{clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 dark:text-slate-500">Contact Email:</span>
            <span className="font-semibold text-slate-950 dark:text-slate-100">{contactEmail}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {submittedWhatsAppUrl && (
            <a
              href={submittedWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Open WhatsApp Chat
            </a>
          )}

          <button
            type="button"
            onClick={onReset}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer border-0"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicFreelancerProfileSubmitted;

