import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard Design System StatCard for executive metrics.
 * - Large tabular numerals (font-mono tabular-nums text-text-primary)
 * - Quiet small uppercase label (text-[11px] text-text-secondary tracking-wider)
 * - Optional contextual comparison line (e.g. vs last month)
 */
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  comparison?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  comparison,
  icon,
  badge,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-700 border border-surface-400 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between min-w-0 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary truncate">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-surface-600 border border-surface-400/80 flex items-center justify-center text-text-secondary shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 my-1">
        <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-text-primary tracking-tight truncate">
          {value}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {comparison && (
        <div className="text-xs text-text-secondary mt-1 truncate">
          {comparison}
        </div>
      )}
    </div>
  );
}

export default StatCard;
