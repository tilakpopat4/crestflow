import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface AdminAccessDeniedCardProps {
  user: User | null;
  onSwitchAccount: () => void;
  onBack?: () => void;
}

/**
 * Access Denied screen for non-admin users attempting to access the Admin Command Center.
 * Strictly adheres to GEMINI.md design standards: flat, restrained SaaS aesthetic.
 */
export default function AdminAccessDeniedCard({
  user,
  onSwitchAccount,
  onBack,
}: AdminAccessDeniedCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-xl p-7 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2.5">
          <div className="w-11 h-11 bg-slate-800 text-red-400 rounded-xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Access Restricted</h1>
          <p className="text-sm text-slate-400">
            This console is strictly limited to verified platform administrators.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Current Google Account
          </span>
          <div className="text-sm font-mono text-slate-200 truncate">
            {user?.email || 'No email associated'}
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-800/80">
            Only <strong className="text-slate-300">tilakpopat2007@gmail.com</strong> and accounts explicitly granted administrator permissions can access this portal.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onSwitchAccount}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors duration-120 flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch Google Account</span>
          </button>

          <button
            type="button"
            onClick={() => (onBack ? onBack() : (window.location.href = '/'))}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors duration-120 flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
