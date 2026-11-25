import React from 'react';
import { UserProfile } from '../types';

interface PublicFreelancerProfileSubmittedProps {
  profile: UserProfile;
  clientName: string;
  contactEmail: string;
  submittedWhatsAppUrl: string | null;
  onReset: () => void;
}

/**
 * PublicFreelancerProfileSubmitted renders the clean confirmation view
 * following intake submission.
 */
export const PublicFreelancerProfileSubmitted: React.FC<PublicFreelancerProfileSubmittedProps> = ({
  profile,
  clientName,
  contactEmail,
  submittedWhatsAppUrl,
  onReset,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center transition-colors duration-150">
      <div className="bg-white dark:bg-slate-900 border-0 rounded-xl p-6 md:p-8 max-w-md w-full space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Submitted</h1>
          <p className="text-slate-400 text-xs">
            Sent to <strong className="text-slate-200">{profile.name}</strong>.
          </p>
        </div>

        <div className="bg-slate-800/60 border-0 rounded-lg p-3.5 text-left space-y-2 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Freelancer</span>
            <span className="font-semibold text-slate-100">{profile.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Client</span>
            <span className="font-semibold text-slate-100">{clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Email</span>
            <span className="font-semibold text-slate-100">{contactEmail}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {submittedWhatsAppUrl && (
            <a
              href={submittedWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center"
            >
              Open WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={onReset}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer border-0"
          >
            Submit Another
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicFreelancerProfileSubmitted;
