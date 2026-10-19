import React, { useRef } from 'react';
import { LayoutDashboard, Users, FileText, LogOut, ClipboardList, ShieldCheck, MessageSquare, UserPlus, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { Tab } from '../App';
import { User } from 'firebase/auth';
import Logo from './Logo';
import { UserProfile } from '../types';
import { SubscriptionState } from '../hooks/useSubscription';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  user?: User;
  onLogout?: () => void;
  profile?: UserProfile | null;
  onEditProfile?: () => void;
  onSwitchToClient?: () => void;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
  isCollapsed?: boolean;
  onCollapse?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  profile,
  onEditProfile,
  onSwitchToClient,
  subscriptionState,
  onOpenSubscriptionModal,
  isCollapsed = false,
  onCollapse,
}: SidebarProps) {
  const shouldReduceMotion = useReducedMotion();
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const clientX = e.changedTouches[0].clientX;
    const clientY = e.changedTouches[0].clientY;
    const deltaX = clientX - touchStartXRef.current;
    const deltaY = clientY - (touchStartYRef.current || 0);

    // Swiped left by 40px+
    if (deltaX < -40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      onCollapse?.();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 0) {
      touchStartXRef.current = e.clientX;
      touchStartYRef.current = e.clientY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.clientX - touchStartXRef.current;
    const deltaY = e.clientY - (touchStartYRef.current || 0);

    if (deltaX < -40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      onCollapse?.();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'work', label: 'Work Log', icon: ClipboardList },
    { id: 'invoice', label: 'Invoices', icon: FileText },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
  ] as const;

  return (
    <nav
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={clsx(
        "fixed md:relative bottom-0 left-0 w-full bg-slate-900 text-white flex md:flex-col md:h-full z-20 border-r border-slate-800/80 border-t border-slate-800 pb-[max(env(safe-area-inset-bottom),4px)] md:pb-0 transition-all duration-200 ease-in-out",
        isCollapsed
          ? "md:w-0 md:-translate-x-full md:opacity-0 md:pointer-events-none md:border-r-0 overflow-hidden"
          : "md:w-64 md:translate-x-0 md:opacity-100"
      )}
    >
      <div className="hidden md:block p-6 border-b border-slate-800/80 mb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 rounded-xl shadow-xs" />
            <span className="text-xl font-bold tracking-tight text-white">
              CrestFlow
            </span>
          </div>
          
        </div>
        <p className="text-xs text-slate-400">Freelancing Client Manager</p>
      </div>

      <div className="flex flex-row md:flex-col justify-around md:justify-start flex-1 px-0.5 md:px-4 py-1 md:py-0 md:space-y-1 overflow-x-hidden overflow-y-hidden md:overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              className={clsx(
                "relative flex flex-col md:flex-row items-center md:space-x-3 px-1 min-[380px]:px-1.5 md:px-3 py-1.5 min-[380px]:py-2 md:py-2.5 rounded-xl text-[9px] min-[380px]:text-[10px] md:text-sm font-medium flex-1 md:flex-initial md:w-full md:max-w-none flex-shrink md:flex-shrink-0 min-w-0 min-h-[44px] justify-center md:justify-start transition-colors duration-150 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveTabIndicator"
                  className="absolute inset-0 bg-indigo-600 rounded-xl shadow-sm -z-0"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 450, damping: 35 }
                  }
                />
              )}
              <span className="relative z-10 flex flex-col md:flex-row items-center md:space-x-3 w-full justify-center md:justify-start">
                <Icon size={16} className={clsx(isActive ? "text-white" : "text-slate-400", "mb-0.5 md:mb-0 shrink-0 transition-colors")} />
                <span className="truncate w-full text-center md:text-left leading-tight">{item.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {subscriptionState?.isSubscriptionFeatureEnabled && onOpenSubscriptionModal && (
        <div className="hidden md:block px-4 py-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs text-white transition-colors cursor-pointer border border-slate-700/60 group"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${subscriptionState?.isPaidActive ? 'bg-indigo-400' : 'bg-red-400'}`} />
              <span className="font-semibold">{subscriptionState?.isPaidActive ? 'Pro Active' : 'Subscribe'}</span>
            </div>
            <span className="text-[11px] text-indigo-400 font-medium group-hover:underline">₹49/mo</span>
          </button>
        </div>
      )}

      <div className="hidden md:flex p-4 border-t border-slate-800 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onEditProfile}
          className={clsx(
            "flex items-center space-x-3 overflow-hidden flex-1 min-w-0 p-1.5 rounded-lg transition-colors text-left cursor-pointer border-none outline-none focus-visible:ring-1 focus-visible:ring-slate-400 group",
            activeTab === 'profile'
              ? "bg-slate-800 text-white"
              : "hover:bg-slate-800/60 text-slate-300"
          )}
          title="Open Profile Settings"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium shrink-0">
              {(profile?.name || user?.displayName)?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-slate-200 transition-colors">
              {profile?.name || user?.displayName || 'User Account'}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {profile?.professionalTitle || user?.email || 'View Profile'}
            </p>
          </div>
        </button>

        {onLogout && (
          <div className="flex items-center shrink-0">
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
