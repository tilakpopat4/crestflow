import React from 'react';
import CardListAndTableSkeletons from './CardListAndTableSkeletons';

export interface WorkspaceSkeletonProps {
  statusText?: string;
  className?: string;
}

/**
 * WorkspaceSkeleton provides the drop-in replacement for the circular spinner
 * fallback across application routing, tab loading, and view transitions.
 */
export const WorkspaceSkeleton: React.FC<WorkspaceSkeletonProps> = ({
  statusText = 'Loading workspace…',
  className = '',
}) => {
  return (
    <div className={`flex-1 w-full animate-in fade-in duration-150 ${className}`}>
      <CardListAndTableSkeletons
        title="Workspace"
        subtitle="Loading workspace…"
        statusText={statusText}
      />
    </div>
  );
};

export default WorkspaceSkeleton;
