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
 * Standard Design System EmptyState.
 * Quiet surface-700 container with surface-400 border, centered icon,
 * clear explanation, and optional single primary action.
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
        "bg-surface-700/50 border border-dashed border-surface-400 rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 space-y-3",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-600 border border-surface-400 flex items-center justify-center text-text-secondary mb-1">
          {renderIcon()}
        </div>
      )}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-text-primary tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
          {description}
        </p>
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
