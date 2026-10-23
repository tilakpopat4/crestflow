import React from 'react';
import { User } from 'firebase/auth';
import { RetroTvNotFound } from './RetroTvNotFound';

interface AdminAccessDeniedCardProps {
  user?: User | null;
  onSwitchAccount?: () => void;
  onBack?: () => void;
}

/**
 * AdminAccessDeniedCard renders the retro animated TV 404 display
 * whenever an unauthorized email attempts to enter the Admin Command Center.
 * Background matches the CrestFlow page palette (bg-slate-50 dark:bg-slate-950).
 */
export default function AdminAccessDeniedCard({
  onBack,
}: AdminAccessDeniedCardProps) {
  return (
    <div
      onClick={onBack}
      className="w-full flex-1 min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 select-none overflow-x-hidden transition-colors duration-150"
    >
      <RetroTvNotFound />
    </div>
  );
}
