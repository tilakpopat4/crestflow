import React from 'react';
import { RetroTvNotFound } from './admin/RetroTvNotFound';

interface NotFoundScreenProps {
  onBack?: () => void;
}

/**
 * NotFoundScreen renders the vintage animated TV 404 screen
 * whenever someone accesses an unknown route outside our established sitemaps.
 * Matches CrestFlow's page palette (bg-slate-50 dark:bg-slate-950).
 */
export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onBack }) => {
  return (
    <div
      onClick={onBack ? onBack : () => (window.location.href = '/')}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 select-none overflow-x-hidden transition-colors duration-150 cursor-pointer"
      title="Click to return to workspace"
    >
      <RetroTvNotFound />
    </div>
  );
};

export default NotFoundScreen;
