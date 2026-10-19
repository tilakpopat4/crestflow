import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface BlockedUserScreenProps {
  user: User;
  onLogout: () => void;
}

export const BlockedUserScreen: React.FC<BlockedUserScreenProps> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950 p-4 relative overflow-hidden font-sans text-slate-100">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl relative z-10 text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Access Restricted</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your account has been deactivated or blocked by the platform administrator. You no longer have permission to use this application.
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed text-left border border-slate-700/50">
          <span className="font-semibold text-slate-400">Account details:</span>
          <div className="mt-1 font-mono break-all text-slate-400">UID: {user.uid}</div>
          <div className="font-mono mt-0.5 text-slate-400">Email: {user.email}</div>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer border-none"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out &amp; Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
