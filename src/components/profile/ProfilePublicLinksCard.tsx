import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
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
      <div className="sm:col-span-2 p-3.5 rounded-lg bg-[#131318]/50 dark:bg-[#1B1B22] space-y-1">
        <p className="text-xs font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">
          Username required
        </p>
        <p className="text-[11px] text-[#A1A1AA] dark:text-[#A1A1AA]">
          Save a valid username above to activate your link.
        </p>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 pt-1">
      {/* Unified Onboarding Link Card */}
      <div className="p-3.5 rounded-lg bg-[#131318]/50 dark:bg-[#1B1B22] space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">
            Onboarding link
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyUrl}
              className="p-1.5 text-[#A1A1AA] hover:text-[#F7F7F8] dark:text-[#A1A1AA] dark:hover:text-[#F7F7F8] hover:bg-[#1B1B22]/60 dark:hover:bg-[#1B1B22] rounded cursor-pointer border-0"
              title="Copy Onboarding Link"
            >
              {copied ? <Check size={13} className="text-[#FF2D4A]" /> : <Copy size={13} />}
            </button>
            <a
              href={onboardingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[#A1A1AA] hover:text-[#F7F7F8] dark:text-[#A1A1AA] dark:hover:text-[#F7F7F8] hover:bg-[#1B1B22]/60 dark:hover:bg-[#1B1B22] rounded"
              title="Open onboarding page in new tab"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <p className="text-[11px] font-mono text-[#A1A1AA] dark:text-[#A1A1AA] truncate">
          /{cleanHandle}/onboarding
        </p>
      </div>
    </div>
  );
};

export default ProfilePublicLinksCard;
