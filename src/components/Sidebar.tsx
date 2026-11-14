import React from 'react';
import { LayoutDashboard, Users, FileText, ClipboardList, MessageSquare, UserPlus, ChevronLeft } from 'lucide-react';
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
  const isUpgradedPro = Boolean(subscriptionState?.hasAccess && !subscriptionState?.isTrialing);
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
      style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
      className={clsx(
        "fixed md:relative bottom-0 left-0 w-full bg-[#1e1e1e] text-slate-100 flex md:flex-col md:h-full z-20 border-r border-[#2a2a2a] border-t md:border-t-0 pb-[max(env(safe-area-inset-bottom),4px)] md:pb-0",
        isResizing ? "transition-none" : "transition-all duration-200 ease-in-out",
        isCollapsed
          ? "md:w-0 md:-translate-x-full md:opacity-0 md:pointer-events-none md:border-r-0 overflow-hidden"
          : "md:w-[var(--sidebar-width,16rem)] md:translate-x-0 md:opacity-100 md:flex-shrink-0"
      )}
    >
      <div
        className={clsx(
          "hidden md:block border-b border-[#2a2a2a] mb-2 transition-all duration-200",
          isIconOnly ? "p-3" : "p-6"
        )}
      >
        <div
          className={clsx(
            "flex items-center transition-all duration-200",
            isIconOnly ? "justify-center mb-0" : "justify-between gap-2 mb-3"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Logo className="w-8 h-8 rounded-xl shadow-xs shrink-0" />
            <AnimatePresence initial={false}>
              {!isIconOnly && (
                <motion.span
                  key="brand-name"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                  className="text-xl font-bold tracking-tight text-white whitespace-nowrap"
                >
                  {isUpgradedPro ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span>CrestFlow</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-[#282828] text-slate-200 shrink-0">
                        PRO
                      </span>
                    </span>
                  ) : (
                    'CrestFlow'
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {!isIconOnly && onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#282828] active:bg-[#333333] transition-colors cursor-pointer border-none bg-transparent shrink-0"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {!isIconOnly && (
            <motion.p
              key="brand-desc"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
              className="text-xs text-slate-500 overflow-hidden whitespace-nowrap"
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
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              title={isIconOnly ? item.label : undefined}
              className={clsx(
                "group relative flex items-center justify-center px-1 min-[380px]:px-2 md:px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium flex-1 md:flex-initial md:w-full md:max-w-none flex-shrink md:flex-shrink-0 min-w-0 min-h-[44px] md:min-h-0 outline-none select-none cursor-pointer",
                isIconOnly ? "md:justify-center" : "md:justify-start md:space-x-3",
                isActive
                  ? "text-white"
                  : "text-[#aaaaaa] hover:text-white hover:bg-[#282828]/50 active:bg-[#333333] transition-colors duration-120"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-sidebar-nav-pill"
                  className="absolute inset-0 rounded-xl bg-[#282828] border border-[#3a3a3a]"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 38 }
                  }
                  aria-hidden="true"
                />
              )}
              <span
                className={clsx(
                  "relative z-10 flex items-center justify-center w-full transition-all duration-120",
                  isIconOnly ? "md:justify-center" : "md:justify-start md:space-x-3"
                )}
              >
                <Icon
                  size={20}
                  className={clsx(
                    isActive ? "text-white" : "text-[#aaaaaa] group-hover:text-white",
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
                      className={clsx(
                        "hidden md:inline-block truncate leading-tight overflow-hidden whitespace-nowrap",
                        isActive ? "font-semibold text-white" : "text-[#aaaaaa] group-hover:text-white"
                      )}
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
