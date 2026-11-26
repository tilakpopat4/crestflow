import React from 'react';
import { useAccess } from '../../hooks/useAccess';

interface AccessStatusBadgeButtonProps {
  onOpenSubscriptionModal?: () => void;
}

/**
 * Compact header status indicator reflecting live server-backed access state without flicker.
 */
export default function AccessStatusBadgeButton({ onOpenSubscriptionModal }: AccessStatusBadgeButtonProps) {
  const access = useAccess();

  if (access.state === 'loading') {
    return <div className="h-7 w-24 rounded-lg bg-[#1B1B22] animate-pulse shrink-0" aria-hidden="true" />;
  }

  const label =
    access.state === 'none'
      ? 'Exploring'
      : access.state === 'trialing'
      ? `Trial: ${access.daysLeft} ${access.daysLeft === 1 ? 'day' : 'days'} left`
      : access.state === 'active'
      ? access.isLifetime
        ? 'Pro · Lifetime'
        : `Pro: ${access.daysLeft} ${access.daysLeft === 1 ? 'day' : 'days'} left`
      : access.state === 'grace'
      ? `Grace: ${access.daysLeft} ${access.daysLeft === 1 ? 'day' : 'days'} left`
      : 'Expired';

  const title =
    access.state === 'none'
      ? 'Explorer Mode using sample data. Click to start free trial.'
      : access.state === 'trialing' || access.state === 'active'
      ? access.isLifetime
        ? 'CrestFlow Pro Lifetime Access'
        : label
      : access.state === 'grace'
      ? `Payment grace period: ${access.daysLeft} ${access.daysLeft === 1 ? 'day' : 'days'} left`
      : 'Plan expired. Reactivate to resume editing.';

  const dotCls =
    access.state === 'active'
      ? 'bg-[#2DD4A0]'
      : access.state === 'trialing'
      ? 'bg-[#FFC145]'
      : access.state === 'grace'
      ? 'bg-[#FFB020]'
      : access.state === 'expired' || access.state === 'suspended'
      ? 'bg-[#F0607A]'
      : 'bg-[#A1A1AA]';

  const textCls =
    access.state === 'expired' || access.state === 'suspended'
      ? 'text-[#F0607A]'
      : access.state === 'grace'
      ? 'text-[#FFB020]'
      : access.state === 'trialing'
      ? 'text-[#FFC145]'
      : 'text-[#F7F7F8]';

  return (
    <button
      type="button"
      onClick={() => {
        if (onOpenSubscriptionModal) {
          onOpenSubscriptionModal();
        } else {
          access.openUpgradeSheet({
            action: 'upgrade',
            benefit: 'Manage your CrestFlow Pro trial or subscription plan.',
          });
        }
      }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-[#1B1B22] cursor-pointer border border-[#2A2A33] bg-[#1B1B22]/60 shrink-0"
      title={title}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
      <span className={`font-medium text-xs whitespace-nowrap tabular-figures ${textCls}`}>{label}</span>
    </button>
  );
}
