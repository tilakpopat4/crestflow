import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  comparison?: React.ReactNode;
  sublabel?: string;
  subtext?: React.ReactNode;
  alert?: boolean;
  accentColor?: 'default' | 'gold' | 'mint' | 'amber' | 'rose' | 'indigo' | 'emerald' | 'blue' | 'red';
  useDisplayFont?: boolean;
  icon?: React.ReactNode | React.ElementType;
  action?: React.ReactNode;
}

/**
 * KPI Metric Card styled with Section 9 obsidian surface (#131318) and hairline border (#2A2A33).
 * Gold #FFC145 is reserved strictly for financial/metric totals where appropriate.
 */
export function StatCard({
  label,
  value,
  comparison,
  sublabel,
  subtext,
  alert = false,
  accentColor = 'default',
  useDisplayFont = false,
  icon,
  action,
  className,
  ...props
}: StatCardProps) {
  const effectiveTone = alert && accentColor === 'default' ? 'amber' : accentColor;
  const valueTone =
    effectiveTone === 'gold'
      ? 'text-[#FFC145]'
      : effectiveTone === 'mint' || effectiveTone === 'emerald'
      ? 'text-[#2DD4A0]'
      : effectiveTone === 'amber'
      ? 'text-[#FFB020]'
      : effectiveTone === 'rose' || effectiveTone === 'red'
      ? 'text-[#F0607A]'
      : 'text-[#F7F7F8]';

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon as React.ComponentType<{ size?: number; className?: string }>;
      return <IconComp size={16} />;
    }
    return <>{icon}</>;
  };

  const footerPrimary = comparison ?? subtext;

  return (
    <div
      className={cn(
        'bg-[#131318] border border-[#2A2A33] rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-colors contain-paint',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider leading-snug">
          {label}
        </div>
        {icon && <div className="text-[#A1A1AA] shrink-0">{renderIcon()}</div>}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2 flex-wrap">
        <div
          className={cn(
            useDisplayFont ? 'font-anton-display text-2xl sm:text-3xl' : 'text-xl sm:text-2xl font-semibold',
            'tracking-tight tabular-figures leading-none',
            valueTone,
          )}
        >
          {value}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {(footerPrimary || sublabel) && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#A1A1AA] tabular-figures">
          {footerPrimary ? <span>{footerPrimary}</span> : <span />}
          {sublabel && <span className="truncate">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

export default StatCard;
