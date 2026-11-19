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
  subtext?: React.ReactNode;
  icon?: React.ReactNode | React.ElementType;
  badge?: React.ReactNode;
  alert?: boolean;
}

export function StatCard({
  label,
  value,
  comparison,
  subtext,
  icon,
  badge,
  alert,
  className,
  ...props
}: StatCardProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon as React.ComponentType<{ size?: number; className?: string }>;
      return <IconComp size={16} className={alert ? "text-accent" : undefined} />;
    }
    return <>{icon}</>;
  };

  return (
    <div
      className={cn(
        "bg-surface-700 border border-surface-400 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between min-w-0 transition-colors",
        alert && "border-accent/40",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary truncate">
          {label}
        </span>
        {icon && (
          <div
            className={cn(
              "w-8 h-8 rounded-lg bg-surface-600 border border-surface-400/80 flex items-center justify-center text-text-secondary shrink-0",
              alert && "text-accent border-accent/30"
            )}
          >
            {renderIcon()}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 my-1">
        <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-text-primary tracking-tight truncate">
          {value}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {(subtext || comparison) && (
        <div className="text-xs text-text-secondary mt-1 truncate">
          {subtext || comparison}
        </div>
      )}
    </div>
  );
}

export default StatCard;
