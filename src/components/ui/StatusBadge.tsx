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
 * Conforms strictly to GEMINI.md:
 * - Status column: plain text, 13px, weight 500, no background, no border, no pill.
 * - Allowed colors:
 *   - Paid / Approved: steel blue text (#4870aa)
 *   - Invoiced / Pending / Active: slate-700 text (slate-300 in dark mode)
 *   - Draft / Uninvoiced / Closed: slate-500 text
 *   - Overdue / Blocked / Changes: red text (red-600 / red-400 in dark mode)
 * - Optional: a 6px solid dot before the label in the same color as the text.
 * - No icons, no checkmarks, no circles with ticks.
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

  let textClass = 'text-slate-700 dark:text-slate-300';
  let indicator: React.ReactNode = (
    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300 shrink-0" />
  );
  let defaultLabel = status || 'Pending';

  switch (norm) {
    case 'paid':
    case 'approved':
      textClass = 'text-[#4870aa] dark:text-[#4870aa]';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-[#4870aa] shrink-0" />;
      defaultLabel = norm === 'approved' ? 'Approved' : 'Paid';
      break;

    case 'overdue':
    case 'blocked':
    case 'changes_requested':
    case 'failed':
      textClass = 'text-red-600 dark:text-red-400';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0" />;
      defaultLabel = norm === 'changes_requested' ? 'Changes Requested' : norm === 'blocked' ? 'Blocked' : 'Overdue';
      break;

    case 'invoiced':
    case 'active':
    case 'pending':
    case 'pending_review':
      textClass = 'text-slate-700 dark:text-slate-300';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300 shrink-0" />;
      defaultLabel = norm === 'pending_review' ? 'Pending Review' : norm === 'active' ? 'Active' : norm === 'invoiced' ? 'Invoiced' : 'Pending';
      break;

    case 'draft':
    case 'uninvoiced':
    case 'closed':
    default:
      textClass = 'text-slate-500';
      indicator = <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />;
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
    "text-[13px] font-medium inline-flex items-center gap-1.5 select-none transition-colors duration-120",
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
