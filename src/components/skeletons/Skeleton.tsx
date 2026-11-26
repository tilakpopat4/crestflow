import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Base minimal skeleton loader block aligned with Section 9 raised obsidian palette (#1B1B22).
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  rounded = 'md',
  ...props
}) => {
  const roundedCls =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === 'lg'
      ? 'rounded-lg'
      : rounded === 'sm'
      ? 'rounded-sm'
      : rounded === 'none'
      ? 'rounded-none'
      : 'rounded-md';

  return (
    <div
      aria-hidden="true"
      className={`bg-[#1B1B22] animate-pulse pointer-events-none select-none ${roundedCls} ${className}`}
      {...props}
    />
  );
};
