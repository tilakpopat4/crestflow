import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Link2, Sparkles } from 'lucide-react';

interface ProfilePublicLinksCardProps {
  cleanHandle: string;
  onboardingUrl: string;
  publicProfileUrl: string;
}

/**
 * ProfilePublicLinksCard renders the quick copy and preview cards
 * for the freelancer's custom onboarding and public portfolio URLs.
 */
export const ProfilePublicLinksCard: React.FC<ProfilePublicLinksCardProps> = ({
  cleanHandle,
  onboardingUrl,
  publicProfileUrl,
}) => {
  const [copiedLink, setCopiedLink] = useState<'onboarding' | 'profile' | null>(null);

  const copyUrl = async (url: string, type: 'onboarding' | 'profile') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  return (
    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      {/* Onboarding Link Card */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
            <Link2 size={13} className="text-indigo-600 dark:text-indigo-400" />
            Client Onboarding Link
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => copyUrl(onboardingUrl, 'onboarding')}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded cursor-pointer border-0"
              title="Copy Onboarding Link"
            >
              {copiedLink === 'onboarding' ? <Check size={13} className="text-indigo-600" /> : <Copy size={13} />}
            </button>
            <a
              href={onboardingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded"
              title="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">
          /{cleanHandle}/onboarding
        </p>
      </div>

      {/* Public Profile Link Card */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
            Public Freelancer Profile
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => copyUrl(publicProfileUrl, 'profile')}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded cursor-pointer border-0"
              title="Copy Profile Link"
            >
              {copiedLink === 'profile' ? <Check size={13} className="text-indigo-600" /> : <Copy size={13} />}
            </button>
            <a
              href={publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded"
              title="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">
          /{cleanHandle}/publicprofile
        </p>
      </div>
    </div>
  );
};

export default ProfilePublicLinksCard;
