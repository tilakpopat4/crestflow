import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Users, UserCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import AdminWhitelistManager from './admin/AdminWhitelistManager';
import AdminUserSubscriptions from './admin/AdminUserSubscriptions';
import AdminAuthCard from './admin/AdminAuthCard';
import { useSubscriptionConfig } from '../lib/subscriptionConfig';

type AdminSection = 'subscriptions' | 'whitelist';

/**
 * Admin Command Center.
 * Manages user accounts, subscriptions, and VIP email whitelist via Cloud Firestore.
 * Adheres strictly to GEMINI.md design standards: flat, restrained SaaS aesthetic, 120ms transitions.
 */
interface AdminTabProps {
  onNavigateBack?: () => void;
}

export default function AdminTab({ onNavigateBack }: AdminTabProps = {}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isEnabled: isSubscriptionEnabled, setEnabled: setSubscriptionEnabled } = useSubscriptionConfig();
  const [togglingSubscription, setTogglingSubscription] = useState(false);

  const handleToggleSubscription = async (newVal: boolean) => {
    setTogglingSubscription(true);
    try {
      await setSubscriptionEnabled(newVal);
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
      alert('Failed to update subscription status. Please try again.');
    } finally {
      setTogglingSubscription(false);
    }
  };
  const [activeSection, setActiveSection] = useState<AdminSection>('subscriptions');
  const shouldReduceMotion = useReducedMotion();

  // Aggregated platform stats
  const [stats, setStats] = useState({
    whitelistedVips: 0,
    activeSubscribers: 0,
    totalUsers: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchStats = async () => {
    if (!isAuthenticated) return;
    setLoadingStats(true);
    try {
      // 1. Whitelist VIPs from Firestore
      let whitelistCount = 0;
      try {
        const wlSnap = await getDocs(collection(db, 'subscription_whitelist'));
        whitelistCount = wlSnap.size;
      } catch (err) {
        console.warn('Error fetching Firestore whitelist stats:', err);
      }

      // 2. Total Users & Active Subscribers from Firestore
      let totalUsersCount = 0;
      let activeCount = 0;
      try {
        const fireSnap = await getDocs(collection(db, 'profiles'));
        totalUsersCount = fireSnap.size;
        fireSnap.forEach((d) => {
          const data = d.data();
          if (data?.subscriptionStatus === 'active') {
            activeCount++;
          }
        });
      } catch (err) {
        console.warn('Error fetching Firestore user stats:', err);
      }

      setStats({
        whitelistedVips: whitelistCount,
        activeSubscribers: activeCount,
        totalUsers: totalUsersCount
      });
    } catch (err) {
      console.warn('Error fetching admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [isAuthenticated, activeSection]);

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAdminAuthenticated');
  };

  // Password Protection Gate
  if (!isAuthenticated) {
    return <AdminAuthCard onSuccess={() => setIsAuthenticated(true)} onBack={onNavigateBack} />;
  }

  // Authenticated Admin Dashboard
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Admin Command Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage ₹49 subscriptions, approve submitted bank UTRs, and configure VIP email whitelists.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors duration-120 cursor-pointer border-0 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit to App</span>
            </button>
          )}
          <button
            onClick={fetchStats}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 border-0 cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogoutAdmin}
            className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-120 cursor-pointer border-0"
          >
            Lock Console
          </button>
        </div>
      </div>

      {/* Master Subscription Feature Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${isSubscriptionEnabled ? 'bg-indigo-600' : 'bg-slate-400'}`} />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Platform Subscription System: {isSubscriptionEnabled ? 'ACTIVE (ON)' : 'DISABLED (OFF)'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {isSubscriptionEnabled
              ? 'Subscriptions are currently active across the main portal. Users are prompted for ₹49/mo membership unless whitelisted.'
              : 'Subscriptions are currently turned OFF. All subscription banners, badges, upgrade buttons, and paywalls are completely removed from the main portal.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {isSubscriptionEnabled ? 'Subscriptions ON' : 'Subscriptions OFF'}
          </span>
          <button
            type="button"
            onClick={() => handleToggleSubscription(!isSubscriptionEnabled)}
            disabled={togglingSubscription}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus:outline-none cursor-pointer border-0 ${
              isSubscriptionEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                isSubscriptionEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Freelancers
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalUsers}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Subscriptions
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats.activeSubscribers}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            VIP Whitelist
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.whitelistedVips}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto text-sm relative">
        {[
          { id: 'subscriptions' as const, label: 'User Subscriptions', icon: Users },
          { id: 'whitelist' as const, label: 'VIP Whitelist', icon: UserCheck }
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <motion.button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className={`relative px-4 py-2 rounded-lg font-medium transition-colors duration-150 inline-flex items-center gap-2 cursor-pointer border-0 select-none ${
                isActive
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="adminActiveTabIndicator"
                  className="absolute inset-0 bg-indigo-600 rounded-lg shadow-xs -z-0"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 450, damping: 38 }
                  }
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-2">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-sm">{sec.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Main Section Content */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
          >
            {activeSection === 'subscriptions' && <AdminUserSubscriptions />}
            {activeSection === 'whitelist' && <AdminWhitelistManager />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
