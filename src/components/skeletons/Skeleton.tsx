import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Base minimal skeleton loader block.
 * Built per GEMINI.md standards: flat, restrained neutral palette, calm opacity pulse,
 * zero neon or decorative pastel tinting.
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
      className={`bg-slate-200/60 dark:bg-[#2a2a2a] animate-pulse pointer-events-none select-none ${roundedCls} ${className}`}
      {...props}
    />
  );
};
