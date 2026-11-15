import React from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import Logo from '../Logo';

interface FeedbackAuthPromptProps {
  freelancerName: string;
  onSignIn: () => void;
  isAuthenticating: boolean;
}

export const FeedbackAuthPrompt: React.FC<FeedbackAuthPromptProps> = ({
  freelancerName,
  onSignIn,
  isAuthenticating,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-150">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative p-8 text-center space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-center">
          <Logo className="w-12 h-12 rounded-xl shadow-sm" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Sign In to Review {freelancerName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
            Only verified Google accounts can rate and review creator profiles. To prevent spam and fake reviews, each account can review this creator once.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-left flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Verified Client Guarantee</p>
            <p>1 account can rate and review this profile only once.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          disabled={isAuthenticating}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 shadow-xs disabled:opacity-50"
        >
          <LogIn size={16} />
          <span>{isAuthenticating ? 'Signing in with Google...' : 'Sign In with Google to Continue'}</span>
        </button>
      </div>
    </div>
  );
};

export default FeedbackAuthPrompt;
