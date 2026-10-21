import React, { useRef } from 'react';
import { LayoutDashboard, Users, FileText, ClipboardList, MessageSquare, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Tab } from '../App';
import { User } from 'firebase/auth';
import Logo from './Logo';
import { UserProfile } from '../types';
import { SubscriptionState } from '../hooks/useSubscription';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { SidebarResizer } from './layout/SidebarResizer';
import { SidebarProfileFooter } from './layout/SidebarProfileFooter';

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
  const {
    width,
    isIconOnly,
    isResizing,
    startResizing,
    resetWidth,
    stepWidth,
    minWidth,
    maxWidth,
  } = useSidebarResize();
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
      style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
      className={clsx(
        "fixed md:relative bottom-0 left-0 w-full bg-slate-900 text-white flex md:flex-col md:h-full z-20 border-r border-slate-800/80 border-t border-slate-800 pb-[max(env(safe-area-inset-bottom),4px)] md:pb-0",
        isResizing ? "transition-none" : "transition-all duration-200 ease-in-out",
        isCollapsed
          ? "md:w-0 md:-translate-x-full md:opacity-0 md:pointer-events-none md:border-r-0 overflow-hidden"
          : "md:w-[var(--sidebar-width,16rem)] md:translate-x-0 md:opacity-100 md:flex-shrink-0"
      )}
    >
      <div
        className={clsx(
          "hidden md:block border-b border-slate-800/80 mb-2 transition-all duration-200",
          isIconOnly ? "p-3" : "p-6"
        )}
      >
        <div
          className={clsx(
            "flex items-center transition-all duration-200",
            isIconOnly ? "justify-center mb-0" : "gap-3 mb-3"
          )}
        >
          <Logo className="w-8 h-8 rounded-xl shadow-xs shrink-0" />
          <AnimatePresence initial={false}>
            {!isIconOnly && (
              <motion.span
                key="brand-name"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                className="text-xl font-bold tracking-tight text-white overflow-hidden whitespace-nowrap"
              >
                CrestFlow
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence initial={false}>
          {!isIconOnly && (
            <motion.p
              key="brand-desc"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
              className="text-xs text-slate-400 overflow-hidden whitespace-nowrap"
            >
              Freelancing Client Manager
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div
        className={clsx(
          "flex flex-row md:flex-col justify-around md:justify-start flex-1 py-1 md:py-0 md:space-y-1 overflow-x-hidden overflow-y-hidden md:overflow-y-auto transition-all duration-200",
          isIconOnly ? "px-0.5 md:px-2" : "px-0.5 md:px-4"
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              title={item.label}
              className={clsx(
                "relative flex items-center justify-center px-1 min-[380px]:px-2 md:px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium flex-1 md:flex-initial md:w-full md:max-w-none flex-shrink md:flex-shrink-0 min-w-0 min-h-[44px] md:min-h-0 transition-colors duration-150 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                isIconOnly ? "md:justify-center" : "md:justify-start md:space-x-3",
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveTabIndicator"
                  className="absolute inset-0 bg-indigo-600 rounded-xl shadow-xs -z-0"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 450, damping: 35 }
                  }
                />
              )}
              <span
                className={clsx(
                  "relative z-10 flex items-center justify-center w-full transition-all duration-200",
                  isIconOnly ? "md:justify-center" : "md:justify-start md:space-x-3"
                )}
              >
                <Icon
                  size={20}
                  className={clsx(
                    isActive ? "text-white" : "text-slate-400",
                    "shrink-0 transition-colors md:w-[18px] md:h-[18px]"
                  )}
                />
                <AnimatePresence initial={false}>
                  {!isIconOnly && (
                    <motion.span
                      key="nav-label"
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                      className="hidden md:inline-block truncate leading-tight overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.button>
          );
        })}
      </div>

      {subscriptionState?.isSubscriptionFeatureEnabled && onOpenSubscriptionModal && (
        <div
          className={clsx(
            "hidden md:block border-t border-slate-800/60 transition-all duration-200",
            isIconOnly ? "px-2 py-2" : "px-4 py-2"
          )}
        >
          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className={clsx(
              "w-full flex items-center p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs text-white transition-colors cursor-pointer border border-slate-700/60 group",
              isIconOnly ? "justify-center" : "justify-between"
            )}
            title={subscriptionState?.isPaidActive ? "Pro Active (Manage)" : "Subscribe to Pro"}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${subscriptionState?.isPaidActive ? 'bg-indigo-400' : 'bg-red-400'}`}
              />
              <AnimatePresence initial={false}>
                {!isIconOnly && (
                  <motion.span
                    key="sub-status"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                    className="font-semibold whitespace-nowrap overflow-hidden"
                  >
                    {subscriptionState?.isPaidActive ? 'Pro Active' : 'Subscribe'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence initial={false}>
              {!isIconOnly && (
                <motion.span
                  key="sub-price"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                  className="text-[11px] text-indigo-400 font-medium group-hover:underline whitespace-nowrap overflow-hidden"
                >
                  ₹49/mo
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}

      <SidebarProfileFooter
        user={user}
        profile={profile}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        activeTab={activeTab}
        isIconOnly={isIconOnly}
        shouldReduceMotion={shouldReduceMotion}
      />

      {!isCollapsed && (
        <SidebarResizer
          isResizing={isResizing}
          onPointerDown={startResizing}
          onDoubleClick={resetWidth}
          currentWidth={width}
          minWidth={minWidth}
          maxWidth={maxWidth}
          onStepWidth={stepWidth}
          onResetWidth={resetWidth}
        />
      )}
    </nav>
  );
}
