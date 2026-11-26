import React from 'react';
import { LogOut, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import { usePwaInstall } from '../../hooks/usePwaInstall';

interface SidebarProfileFooterProps {
  user?: User;
  profile?: UserProfile | null;
  onEditProfile?: () => void;
  onLogout?: () => void;
  activeTab: string;
  isIconOnly: boolean;
  shouldReduceMotion: boolean | null;
}

/**
 * SidebarProfileFooter renders the user profile avatar and account details
 * at the bottom of the navigation sidebar, animating smoothly between full and icon-only modes.
 */
export const SidebarProfileFooter: React.FC<SidebarProfileFooterProps> = ({
  user,
  profile,
  onEditProfile,
  onLogout,
  activeTab,
  isIconOnly,
  shouldReduceMotion,
}) => {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  return (
    <div
      className={clsx(
        "hidden md:flex border-t border-[#2A2A33] transition-all duration-200",
        isIconOnly ? "p-2 flex-col items-center gap-2" : "p-4 items-center justify-between gap-2"
      )}
    >
      <button
        type="button"
        onClick={onEditProfile}
        className={clsx(
          "flex items-center overflow-hidden rounded-lg transition-colors text-left cursor-pointer border-none outline-none focus-visible:ring-1 focus-visible:ring-[#F7F7F8] group",
          isIconOnly ? "justify-center p-1.5" : "space-x-3 flex-1 min-w-0 p-1.5",
          activeTab === 'profile'
            ? "bg-[#1B1B22] text-[#F7F7F8]"
            : "hover:bg-[#1B1B22] active:bg-[#2A2A33] text-[#A1A1AA]"
        )}
        title={isIconOnly ? (profile?.name || user?.displayName || 'Profile Settings') : "Open Profile Settings"}
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-8 h-8 rounded-full shrink-0"
            referrerPolicy="no-referrer"
            decoding="async"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#2A2A33] text-[#F7F7F8] flex items-center justify-center text-xs font-semibold shrink-0">
            {(profile?.name || user?.displayName)?.charAt(0) || 'U'}
          </div>
        )}
        <AnimatePresence initial={false}>
          {!isIconOnly && (
            <motion.div
              key="profile-details"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="flex-1 min-w-0 overflow-hidden whitespace-nowrap"
            >
              <p className="text-sm font-semibold text-[#F7F7F8] truncate group-hover:text-white transition-colors">
                {profile?.name || user?.displayName || 'User Account'}
              </p>
              <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                {profile?.professionalTitle || user?.email || 'View Profile'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <div className="flex items-center shrink-0 gap-1">
        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={() => promptInstall()}
            className="text-[#A1A1AA] hover:text-white p-2 rounded-lg hover:bg-[#1B1B22] active:bg-[#2A2A33] transition-colors cursor-pointer border-none bg-transparent"
            title="Install CrestFlow App"
            aria-label="Install CrestFlow App"
          >
            <Download size={16} />
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="text-[#A1A1AA] hover:text-white p-2 rounded-lg hover:bg-[#1B1B22] active:bg-[#2A2A33] transition-colors cursor-pointer border-none bg-transparent"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
