import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile } from '../../types';

interface OnboardingLinkCardProps {
  onboardingUrl: string;
  profile: UserProfile | null;
}

/**
 * OnboardingLinkCard displays the freelancer's public client intake link,
 * quick copy tools, preview launch button, and expandable QR code.
 */
export const OnboardingLinkCard: React.FC<OnboardingLinkCardProps> = ({
  onboardingUrl,
  profile,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(onboardingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
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

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Public Client Onboarding Link
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Share this link or QR code with prospective clients to receive project briefs directly into CrestFlow.
          </p>
        </div>

        {profile?.professionalTitle && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 self-start sm:self-auto">
            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
            {profile.professionalTitle}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
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
            onClick={handleCopy}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </motion.button>

          <motion.a
            href={onboardingUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0"
            title="Open client onboarding page in new tab"
          >
            <ExternalLink size={15} />
            <span className="hidden sm:inline">Preview</span>
          </motion.a>

          <motion.button
            type="button"
            onClick={() => setShowQr(!showQr)}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0 ${
              showQr ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
            }`}
            title="Toggle QR Code display"
          >
            <QrCode size={15} />
            <span className="hidden sm:inline">QR</span>
          </motion.button>
        </div>
      </div>

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
