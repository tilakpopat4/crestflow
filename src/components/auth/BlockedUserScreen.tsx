import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface BlockedUserScreenProps {
  user: User;
  onLogout: () => void;
}

export const BlockedUserScreen: React.FC<BlockedUserScreenProps> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#131318] dark:bg-[#0B0B0E] p-4 relative overflow-hidden font-sans text-[#F7F7F8]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      <div className="max-w-md w-full bg-[#1B1B22] border border-[#2A2A33] rounded-xl p-8 shadow-2xl relative z-10 text-center space-y-6">
        <div className="w-16 h-16 bg-[#E0002B]/10 border border-[#E0002B]/20 text-[#F0607A] rounded-xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Access Restricted</h1>
          <p className="text-[#A1A1AA] text-sm leading-relaxed">
            Your account has been deactivated or blocked by the platform administrator. You no longer have permission to use this application.
          </p>
        </div>
        <div className="bg-[#131318]/50 rounded-xl p-4 text-xs text-[#A1A1AA] leading-relaxed text-left border border-[#2A2A33]/50">
          <span className="font-semibold text-[#A1A1AA]">Account details:</span>
          <div className="mt-1 font-mono break-all text-[#A1A1AA]">UID: {user?.uid || 'Unknown'}</div>
          <div className="font-mono mt-0.5 text-[#A1A1AA]">Email: {user.email}</div>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-[#1B1B22] hover:bg-[#2A2A33] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer border-none"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out &amp; Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
