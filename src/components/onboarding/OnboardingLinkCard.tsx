import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface OnboardingLinkCardProps {
  onboardingUrl: string;
  publicProfileUrl?: string;
  profile: UserProfile | null;
  hasUsername?: boolean;
  onNavigateToProfile?: () => void;
}

/**
 * OnboardingLinkCard Component
 * Displays the freelancer's public client intake link, copy tools, preview launch, and QR code.
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
    <Card className="p-5 sm:p-6 space-y-4 bg-surface-700 border-surface-400">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              Professional Public Links
            </h2>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Clean, professional branded links without random user IDs. Share with clients to view your work and receive project briefs.
          </p>
        </div>

        {profile?.professionalTitle && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 border border-surface-400 rounded-lg text-xs sm:text-sm font-semibold text-text-secondary self-start sm:self-auto">
            {profile.professionalTitle}
          </span>
        )}
      </div>

      {/* Main Link Input or Set Username Prompt */}
      {!hasUsername ? (
        <div className="p-4 rounded-xl bg-surface-800 border border-surface-400 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Username required
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Set a custom username in your Profile settings first to generate your shareable client onboarding link, client portal, and portfolio.
              </p>
            </div>
            {onNavigateToProfile && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onNavigateToProfile}
                className="text-xs shrink-0"
              >
                Set Username in Profile
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-secondary">
            Client Onboarding Intake URL
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                readOnly
                value={onboardingUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-surface-800 border border-surface-400 rounded-lg px-4 py-2 text-sm font-mono text-text-primary outline-none select-all focus:border-surface-300 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(onboardingUrl, 'onboarding')}
                className="text-xs h-9 px-3.5"
              >
                {copiedType === 'onboarding' ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                <span>{copiedType === 'onboarding' ? 'Copied' : 'Copy Onboarding'}</span>
              </Button>

              <a
                href={onboardingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 h-9 bg-surface-600 hover:bg-surface-500 text-text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer border-0"
                title="Open client onboarding page in new tab"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Preview</span>
              </a>

              <Button
                type="button"
                variant={showQr ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowQr(!showQr)}
                className="text-xs h-9 px-3"
                title="Toggle QR Code display"
              >
                <QrCode size={14} />
                <span className="hidden sm:inline">QR</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Link (Public Freelancer Profile) */}
      {hasUsername && publicProfileUrl && (
        <div className="pt-2 border-t border-surface-400/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-text-muted shrink-0 font-medium inline-flex items-center gap-1">
              <User size={13} />
              Public Freelancer Profile:
            </span>
            <span className="font-mono text-text-secondary truncate">
              {publicProfileUrl}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleCopy(publicProfileUrl, 'profile')}
              className="text-[11px] h-7 px-2.5"
            >
              {copiedType === 'profile' ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
              <span>{copiedType === 'profile' ? 'Copied' : 'Copy'}</span>
            </Button>
            <a
              href={publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 h-7 text-text-secondary hover:text-text-primary bg-surface-600 hover:bg-surface-500 rounded-md font-medium transition-colors inline-flex items-center gap-1 text-[11px]"
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
            <div className="pt-3 border-t border-surface-400/80 flex flex-col sm:flex-row items-center gap-4 bg-surface-800 p-4 rounded-xl border border-surface-400">
              <div className="p-3 bg-white rounded-lg shrink-0">
                <QRCodeSVG value={onboardingUrl} size={110} level="M" />
              </div>
              <div className="space-y-1 text-center sm:text-left text-sm">
                <p className="font-bold text-text-primary">Scan to Open Onboarding Page</p>
                <p className="text-text-secondary text-xs leading-relaxed max-w-sm">
                  Clients can scan this QR code with their mobile device camera to open your branded onboarding form instantly.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default OnboardingLinkCard;
