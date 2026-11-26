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
    <div className="min-h-screen bg-[#131318] dark:bg-[#0B0B0E] flex flex-col items-center justify-center p-4 font-sans text-[#F7F7F8] dark:text-[#F7F7F8] transition-colors duration-150">
      <div className="max-w-md w-full bg-[#131318] dark:bg-[#131318] rounded-xl shadow-xl border border-[#2A2A33] dark:border-[#2A2A33] overflow-hidden relative p-8 text-center space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-center">
          <Logo className="w-12 h-12 rounded-xl shadow-sm" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[#F7F7F8] dark:text-[#F7F7F8]">
            Sign In to Review {freelancerName}
          </h1>
          <p className="text-[#A1A1AA] dark:text-[#A1A1AA] text-xs sm:text-sm leading-relaxed">
            Only verified Google accounts can rate and review creator profiles. To prevent spam and fake reviews, each account can review this creator once.
          </p>
        </div>

        <div className="p-4 bg-[#131318] dark:bg-[#1B1B22] rounded-xl border border-[#2A2A33] dark:border-[#2A2A33]/60 text-left flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] space-y-1">
            <p className="font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">Verified Client Guarantee</p>
            <p>1 account can rate and review this profile only once.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          disabled={isAuthenticating}
          className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 shadow-xs disabled:opacity-50"
        >
          <LogIn size={16} />
          <span>{isAuthenticating ? 'Signing in with Google...' : 'Sign In with Google to Continue'}</span>
        </button>
      </div>
    </div>
  );
};

export default FeedbackAuthPrompt;
