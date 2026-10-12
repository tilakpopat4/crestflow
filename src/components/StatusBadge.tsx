import React from 'react';

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
  | 'UP_TO_DATE'
  | 'DUE_IN_3_DAYS'
  | 'DUE_IN_1_DAY'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'OVERDUE_2_DAYS'
  | string;

export interface StatusConfig {
  textColor: string;
  dotColor: string;
  defaultLabel: string;
}

export function getStatusConfig(status: StatusVariant): StatusConfig {
  const normalized = (status || '').toString().trim().toLowerCase();

  switch (normalized) {
    case 'paid':
      return {
        textColor: 'text-indigo-600 dark:text-indigo-400',
        dotColor: 'bg-indigo-600 dark:bg-indigo-400',
        defaultLabel: 'Paid',
      };

    case 'overdue':
    case 'blocked':
    case 'due_today':
    case 'overdue_2_days':
      return {
        textColor: 'text-red-600 dark:text-red-400',
        dotColor: 'bg-red-600 dark:bg-red-400',
        defaultLabel: normalized === 'blocked' ? 'Blocked' : 'Overdue',
      };

    case 'invoiced':
    case 'active':
    case 'up_to_date':
    case 'due_in_3_days':
    case 'due_in_1_day':
      return {
        textColor: 'text-slate-700 dark:text-slate-300',
        dotColor: 'bg-slate-600 dark:bg-slate-400',
        defaultLabel: normalized === 'active' ? 'Active' : 'Invoiced',
      };

    case 'draft':
    case 'pending':
    case 'uninvoiced':
    case 'closed':
    default:
      return {
        textColor: 'text-slate-500 dark:text-slate-400',
        dotColor: 'bg-slate-400 dark:bg-slate-500',
        defaultLabel: status || 'Draft',
      };
  }
}

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  showDot?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}

export default function StatusBadge({
  status,
  label,
  showDot = true,
  onClick,
  title,
  className = '',
}: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const displayLabel = label ?? config.defaultLabel;

  const content = (
    <>
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 shrink-0 ${config.dotColor}`}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </>
  );

  const baseClasses = `text-[13px] font-medium inline-flex items-center transition-colors ${config.textColor} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`${baseClasses} cursor-pointer hover:opacity-80 p-0 m-0 border-0 bg-transparent`}
      >
        {content}
      </button>
    );
  }

  return (
    <span title={title} className={baseClasses}>
      {content}
    </span>
  );
}
