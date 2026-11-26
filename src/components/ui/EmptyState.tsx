import React from 'react';
import { cn } from '@/lib/utils';
import Button from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode | React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Standard EmptyState styled with Section 9 surface (#131318) and hairline border (#2A2A33).
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon as React.ComponentType<{ size?: number; className?: string }>;
      return <IconComp size={24} />;
    }
    return <>{icon}</>;
  };

  return (
    <div
      className={cn(
        'bg-[#131318] border border-dashed border-[#2A2A33] rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 space-y-3',
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[#1B1B22] border border-[#2A2A33] flex items-center justify-center text-[#A1A1AA] mb-1">
          {renderIcon()}
        </div>
      )}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-[#F7F7F8] tracking-tight">{title}</h4>
        <p className="text-xs text-[#A1A1AA] max-w-sm leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
