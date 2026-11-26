import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'Draft'
  | 'draft'
  | 'Uninvoiced'
  | 'Invoiced'
  | 'invoiced'
  | 'Pending'
  | 'pending'
  | 'Paid'
  | 'paid'
  | 'Overdue'
  | 'overdue'
  | 'Active'
  | 'active'
  | 'Closed'
  | 'closed'
  | 'Expired'
  | 'expired'
  | 'Grace'
  | 'grace'
  | string;

export interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  showIndicator?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}

const STATUS_STYLE_MAP: Record<string, { dot: string; text: string }> = {
  paid: { dot: 'bg-[#2DD4A0]', text: 'text-[#2DD4A0]' },
  active: { dot: 'bg-[#2DD4A0]', text: 'text-[#2DD4A0]' },
  approved: { dot: 'bg-[#2DD4A0]', text: 'text-[#2DD4A0]' },
  accepted: { dot: 'bg-[#2DD4A0]', text: 'text-[#2DD4A0]' },

  pending: { dot: 'bg-[#FFB020]', text: 'text-[#FFB020]' },
  invoiced: { dot: 'bg-[#FFB020]', text: 'text-[#FFB020]' },
  grace: { dot: 'bg-[#FFB020]', text: 'text-[#FFB020]' },
  pending_review: { dot: 'bg-[#FFB020]', text: 'text-[#FFB020]' },

  overdue: { dot: 'bg-[#F0607A]', text: 'text-[#F0607A]' },
  expired: { dot: 'bg-[#F0607A]', text: 'text-[#F0607A]' },
  declined: { dot: 'bg-[#F0607A]', text: 'text-[#F0607A]' },
  changes_requested: { dot: 'bg-[#F0607A]', text: 'text-[#F0607A]' },

  draft: { dot: 'bg-[#A1A1AA]', text: 'text-[#A1A1AA]' },
  uninvoiced: { dot: 'bg-[#A1A1AA]', text: 'text-[#A1A1AA]' },
  closed: { dot: 'bg-[#8E8E98]', text: 'text-[#A1A1AA]' },
};

/**
 * Calm plain-text status display with a 6px semantic indicator dot per GEMINI.md.
 * No pastel pill capsules, keeping tables crisp and scannable in dark mode and grayscale.
 */
export function StatusBadge({
  status,
  label,
  showIndicator = true,
  onClick,
  title,
  className,
}: StatusBadgeProps) {
  const key = String(status || 'draft').toLowerCase().replace(/\s+/g, '_');
  const style = STATUS_STYLE_MAP[key] || STATUS_STYLE_MAP.draft;
  const displayLabel = label || status;

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap',
        style.text,
        className,
      )}
    >
      {showIndicator && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} aria-hidden="true" />
      )}
      <span>{displayLabel}</span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className="inline-flex items-center px-1.5 py-0.5 rounded hover:bg-[#1B1B22] transition-colors cursor-pointer border-0 bg-transparent"
      >
        {content}
      </button>
    );
  }

  return (
    <span title={title} className="inline-flex items-center">
      {content}
    </span>
  );
}

export default StatusBadge;
