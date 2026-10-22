/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { 
  Briefcase, 
  Layers, 
  FileText, 
  Star, 
  LogOut, 
  UserCheck, 
  ArrowLeft 
} from 'lucide-react';
import { Client, UserProfile } from '../../types';
import Logo from '../Logo';

export type ClientPortalTab = 'overview' | 'work' | 'invoices' | 'review';

interface ClientPortalHeaderProps {
  activeTab: ClientPortalTab;
  onTabChange: (tab: ClientPortalTab) => void;
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
  freelancerProfile: UserProfile | null;
  workItemsCount: number;
  invoicesCount: number;
  onLogout: () => void;
  onSwitchToFreelancer?: () => void;
}

/**
 * Responsive header navigation for the Client Portal.
 * Adapts across mobile (touch-friendly targets), tablet, and desktop viewports.
 */
export const ClientPortalHeader: React.FC<ClientPortalHeaderProps> = ({
  activeTab,
  onTabChange,
  clients,
  selectedClientId,
  onSelectClient,
  freelancerProfile,
  workItemsCount,
  invoicesCount,
  onLogout,
  onSwitchToFreelancer,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const tabs: Array<{ id: ClientPortalTab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: Briefcase },
    { id: 'work', label: 'Work Log', icon: Layers, badge: workItemsCount },
    { id: 'invoices', label: 'Invoices', icon: FileText, badge: invoicesCount },
    { id: 'review', label: 'Rate & Review', icon: Star },
  ];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top bar with branding & account actions */}
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Logo className="w-8 h-8 rounded-lg" />
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                CrestFlow
              </span>
            </div>
            <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-700 pl-2.5">
              Client Portal
            </span>
          </div>

          {/* Center: Freelancer information badge (desktop / tablet) */}
          {freelancerProfile && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-300">
              <UserCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                Freelancer: <strong className="text-slate-900 dark:text-white">{freelancerProfile.name}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {freelancerProfile.professionalTitle}
              </span>
            </div>
          )}

          {/* Right actions: Multi-client switcher, Switch to Freelancer, Sign out */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {clients.length > 1 && (
              <select
                value={selectedClientId || ''}
                onChange={(e) => onSelectClient(e.target.value)}
                aria-label="Select Client Account"
                className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-h-[44px]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {onSwitchToFreelancer && (
              <button
                type="button"
                onClick={onSwitchToFreelancer}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                title="Switch back to Freelancer workspace"
              >
                <ArrowLeft size={14} />
                <span>Freelancer Mode</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 px-3 py-2 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar with touch scroll support and 44px min tap height */}
        <nav
          aria-label="Client Portal Sections"
          className="flex space-x-1 sm:space-x-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                className={`relative min-h-[44px] py-2.5 px-3 sm:px-4 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 outline-none select-none ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span>
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 ? ` (${tab.badge})` : ''}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="clientPortalTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 450, damping: 35 }
                    }
                  />
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
