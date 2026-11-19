import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'Draft'
  | 'draft'
  | 'Invoiced'
  | 'invoiced'
  | 'Paid'
  | 'paid'
  | 'Overdue'
  | 'overdue'
  | 'Pending'
  | 'pending'
  | 'Uninvoiced'
  | 'uninvoiced'
  | 'Closed'
  | 'closed'
  | 'Active'
  | 'active'
  | 'Blocked'
  | 'blocked'
  | 'approved'
  | 'changes_requested'
  | 'pending_review'
  | string;

export interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  showIndicator?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}

/**
 * Standard Design System StatusBadge.
 * Conforms to project-rules.md:
 * - No green or amber.
 * - Distinguishes state by icon/fill style, text, and restrained tokens:
 *   - Paid / Approved: Solid white dot + text-text-primary (#F1F1F1)
 *   - Pending / Invoiced: Outlined ring dot + text-text-secondary (#AAAAAA)
 *   - Draft / Uninvoiced: Dotted ring + text-text-muted (#666666)
 *   - Overdue / Blocked / Changes: Solid red dot + text-accent (#E1002D)
 */
export function StatusBadge({
  status,
  label,
  showIndicator = true,
  onClick,
  title,
  className,
}: StatusBadgeProps) {
  const norm = (status || '').toString().trim().toLowerCase();

  let textClass = 'text-text-secondary';
  let indicator: React.ReactNode = (
    <span className="w-1.5 h-1.5 rounded-full border border-text-secondary shrink-0" />
  );
  let defaultLabel = status || 'Pending';

  switch (norm) {
    case 'paid':
    case 'approved':
      textClass = 'text-text-primary font-semibold';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-text-primary shrink-0" />;
      defaultLabel = norm === 'approved' ? 'Approved' : 'Paid';
      break;

    case 'overdue':
    case 'blocked':
    case 'changes_requested':
    case 'failed':
      textClass = 'text-accent font-semibold';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />;
      defaultLabel = norm === 'changes_requested' ? 'Changes Requested' : norm === 'blocked' ? 'Blocked' : 'Overdue';
      break;

    case 'invoiced':
    case 'active':
    case 'pending':
    case 'pending_review':
      textClass = 'text-text-secondary font-medium';
      indicator = <span className="w-1.5 h-1.5 rounded-full border border-text-secondary shrink-0" />;
      defaultLabel = norm === 'pending_review' ? 'Pending Review' : norm === 'active' ? 'Active' : norm === 'invoiced' ? 'Invoiced' : 'Pending';
      break;

    case 'draft':
    case 'uninvoiced':
    case 'closed':
    default:
      textClass = 'text-text-muted font-normal';
      indicator = <span className="w-1.5 h-1.5 rounded-full border border-dashed border-text-muted shrink-0" />;
      defaultLabel = norm === 'uninvoiced' ? 'Uninvoiced' : norm === 'closed' ? 'Closed' : 'Draft';
      break;
  }

  const display = label ?? defaultLabel;

  const content = (
    <>
      {showIndicator && indicator}
      <span className="truncate">{display}</span>
    </>
  );

  const classes = cn(
    "text-xs inline-flex items-center gap-1.5 select-none transition-colors duration-120",
    textClass,
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={cn(classes, "cursor-pointer hover:opacity-80 bg-transparent border-0 p-0 m-0")}
      >
        {content}
      </button>
    );
  }

  return (
    <span title={title} className={classes}>
      {content}
    </span>
  );
}

export default StatusBadge;
