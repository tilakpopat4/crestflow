import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, Sparkles, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile } from '../../types';

interface OnboardingLinkCardProps {
  onboardingUrl: string;
  publicProfileUrl?: string;
  profile: UserProfile | null;
  hasUsername?: boolean;
  onNavigateToProfile?: () => void;
}

/**
 * OnboardingLinkCard displays the freelancer's public client intake link,
 * quick copy tools, preview launch button, public portfolio link, and expandable QR code.
 */
export const OnboardingLinkCard: React.FC<OnboardingLinkCardProps> = ({
  onboardingUrl,
  publicProfileUrl,
  profile,
  hasUsername = true,
  onNavigateToProfile,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [copiedType, setCopiedType] = useState<'onboarding' | 'profile' | null>(null);
  const [showQr, setShowQr] = useState(false);

  const handleCopy = async (url: string, type: 'onboarding' | 'profile') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Professional Public Links
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Clean, professional branded links without random user IDs. Share with clients to view your work and receive project briefs.
          </p>
        </div>

        {profile?.professionalTitle && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#282828] border border-[#3a3a3a] rounded-lg text-xs sm:text-sm font-semibold text-slate-300 self-start sm:self-auto">
            {profile.professionalTitle}
          </span>
        )}
      </div>

      {/* Main Link Input or Set Username Prompt */}
      {!hasUsername ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Username required
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set a custom username in your Profile settings first to generate your shareable client onboarding link, client portal, and portfolio.
              </p>
            </div>
            {onNavigateToProfile && (
              <button
                type="button"
                onClick={onNavigateToProfile}
                className="px-3.5 py-2 bg-[#282828] hover:bg-[#383838] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 border-0"
              >
                Set Username in Profile
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Client Onboarding Intake URL
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                readOnly
                value={onboardingUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 dark:text-slate-200 outline-none select-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                type="button"
                onClick={() => handleCopy(onboardingUrl, 'onboarding')}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#282828] hover:bg-[#383838] text-white border border-[#3a3a3a] rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                {copiedType === 'onboarding' ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedType === 'onboarding' ? 'Copied' : 'Copy Onboarding'}</span>
              </motion.button>

              <motion.a
                href={onboardingUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#282828] hover:bg-[#383838] text-slate-300 hover:text-white border border-[#3a3a3a] rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                title="Open client onboarding page in new tab"
              >
                <ExternalLink size={15} />
                <span className="hidden sm:inline">Preview</span>
              </motion.a>

              <motion.button
                type="button"
                onClick={() => setShowQr(!showQr)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border border-[#3a3a3a] ${
                  showQr
                    ? 'bg-[#383838] text-white'
                    : 'bg-[#282828] hover:bg-[#383838] text-slate-300 hover:text-white'
                }`}
                title="Toggle QR Code display"
              >
                <QrCode size={15} />
                <span className="hidden sm:inline">QR</span>
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Link (Public Freelancer Profile) */}
      {hasUsername && publicProfileUrl && (
        <div className="pt-2 border-t border-[#333333] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 shrink-0 font-medium inline-flex items-center gap-1">
              <User size={13} className="text-slate-400" />
              Public Freelancer Profile:
            </span>
            <span className="font-mono text-slate-300 truncate">
              {publicProfileUrl}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy(publicProfileUrl, 'profile')}
              className="px-2.5 py-1 text-slate-300 hover:text-white bg-[#282828] hover:bg-[#383838] border border-[#3a3a3a] rounded-md font-medium cursor-pointer transition-colors inline-flex items-center gap-1"
            >
              {copiedType === 'profile' ? <Check size={12} className="text-slate-300" /> : <Copy size={12} />}
              <span>{copiedType === 'profile' ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-slate-300 hover:text-white bg-[#282828] hover:bg-[#383838] border border-[#3a3a3a] rounded-md font-medium transition-colors inline-flex items-center gap-1"
            >
              <ExternalLink size={12} />
              <span>Open</span>
            </a>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-white rounded-xl shrink-0 shadow-2xs">
                <QRCodeSVG value={onboardingUrl} size={120} level="M" />
              </div>
              <div className="space-y-1 text-center sm:text-left text-sm">
                <p className="font-bold text-slate-900 dark:text-slate-100">Scan to Open Onboarding Page</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm">
                  Clients can scan this QR code with their mobile device camera to open your branded onboarding form instantly.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
