import React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

/**
 * Standard Design System PageHeader.
 * Enforces uniform text-2xl font-semibold title and text-xs text-text-secondary subtitle.
 */
export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        {breadcrumbs && (
          <div className="text-xs text-text-secondary flex items-center gap-1.5 mb-1">
            {breadcrumbs}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export default PageHeader;
