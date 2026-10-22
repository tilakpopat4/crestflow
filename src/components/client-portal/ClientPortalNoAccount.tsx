/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserCheck, LogOut, ArrowLeft } from 'lucide-react';
import Logo from '../Logo';

interface ClientPortalNoAccountProps {
  userEmail: string | null;
  onLogout: () => void;
  onSwitchToFreelancer?: () => void;
}

/**
 * Empty state screen when no client account is associated with the authenticated Google email.
 */
export const ClientPortalNoAccount: React.FC<ClientPortalNoAccountProps> = ({
  userEmail,
  onLogout,
  onSwitchToFreelancer,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Logo className="w-10 h-10 rounded-lg" />
        </div>

        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center mx-auto">
          <UserCheck size={24} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            No Client Account Linked
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            Your Google account (<strong className="text-slate-700 dark:text-slate-300">{userEmail}</strong>) is not associated with any active client record in CrestFlow.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-[11px] leading-relaxed">
            Please ask your freelancer to invite you or link your email address in their clients tab.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          {onSwitchToFreelancer && (
            <button
              type="button"
              onClick={onSwitchToFreelancer}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Freelancer Workspace</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
