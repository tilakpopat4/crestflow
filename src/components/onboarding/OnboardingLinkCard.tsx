import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/button';

interface OnboardingLinkCardProps {
  onboardingUrl: string;
  publicProfileUrl?: string;
  profile: UserProfile | null;
  hasUsername?: boolean;
  onNavigateToProfile?: () => void;
}

/**
 * OnboardingLinkCard Component
 * Displays the freelancer's shareable intake link, copy action, preview, and QR code.
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

  const hasDistinctProfileUrl = Boolean(publicProfileUrl && publicProfileUrl !== onboardingUrl);

  return (
    <Card className="h-full p-4 sm:p-5 flex flex-col justify-between gap-4 bg-surface-700 border-surface-400">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">
            Intake Link
          </h2>
          {profile?.professionalTitle && (
            <span className="text-xs text-text-secondary truncate">
              {profile.professionalTitle}
            </span>
          )}
        </div>

        {!hasUsername ? (
          <div className="p-3.5 rounded-lg bg-surface-800 border border-surface-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Username required</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Set a username in Profile to activate your intake link.
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
                Set Username
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={onboardingUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              aria-label="Client onboarding intake URL"
              className="flex-1 min-w-0 bg-surface-800 border border-surface-400 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-mono text-text-primary outline-none select-all focus:border-surface-300 transition-colors"
            />

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(onboardingUrl, 'onboarding')}
                className="text-xs h-9 px-3"
              >
                {copiedType === 'onboarding' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedType === 'onboarding' ? 'Copied' : 'Copy'}</span>
              </Button>

              <a
                href={onboardingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 h-9 bg-surface-600 hover:bg-surface-500 text-text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer border-0"
                title="Preview intake page"
              >
                <ExternalLink size={14} />
                <span>Preview</span>
              </a>

              <Button
                type="button"
                variant={showQr ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowQr(!showQr)}
                className="text-xs h-9 px-3"
                title="Toggle QR code"
              >
                <QrCode size={14} />
                <span>QR</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {hasUsername && hasDistinctProfileUrl && (
        <div className="pt-2.5 border-t border-surface-400/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-text-muted shrink-0 font-medium inline-flex items-center gap-1">
              <User size={13} />
              Profile:
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
              onClick={() => handleCopy(publicProfileUrl!, 'profile')}
              className="text-[11px] h-7 px-2.5"
            >
              {copiedType === 'profile' ? <Check size={12} /> : <Copy size={12} />}
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
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-800 p-3.5 rounded-lg border border-surface-400">
              <div className="p-2.5 bg-[#131318] rounded-lg shrink-0">
                <QRCodeSVG value={onboardingUrl} size={96} level="M" />
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-sm font-semibold text-text-primary">Scan to open</p>
                <p className="text-text-secondary text-xs">
                  Opens your intake form on mobile.
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
