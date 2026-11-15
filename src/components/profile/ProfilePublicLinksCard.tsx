import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Link2 } from 'lucide-react';
import { isValidUsername } from '../../lib/userHandle';

interface ProfilePublicLinksCardProps {
  cleanHandle: string;
  onboardingUrl: string;
}

/**
 * ProfilePublicLinksCard renders the quick copy and preview card
 * for the freelancer's custom client onboarding URL.
 */
export const ProfilePublicLinksCard: React.FC<ProfilePublicLinksCardProps> = ({
  cleanHandle,
  onboardingUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const isHandleValid = isValidUsername(cleanHandle);

  const copyUrl = async () => {
    if (!isHandleValid) return;
    try {
      await navigator.clipboard.writeText(onboardingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = onboardingUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isHandleValid) {
    return (
      <div className="sm:col-span-2 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Username required
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Enter and save a valid username above (3-30 alphanumeric characters) to activate your branded intake link.
        </p>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 pt-1">
      {/* Unified Onboarding Link Card */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
            <Link2 size={13} className="text-indigo-600 dark:text-indigo-400" />
            Client Onboarding Link
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyUrl}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded cursor-pointer border-0"
              title="Copy Onboarding Link"
            >
              {copied ? <Check size={13} className="text-indigo-600" /> : <Copy size={13} />}
            </button>
            <a
              href={onboardingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded"
              title="Open onboarding page in new tab"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">
          /{cleanHandle}/onboarding
        </p>
      </div>
    </div>
  );
};

export default ProfilePublicLinksCard;
