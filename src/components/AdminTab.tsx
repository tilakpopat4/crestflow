import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Users, ShieldAlert, CreditCard, UserCheck, RefreshCw, Tag, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import AdminPaymentApprovals from './admin/AdminPaymentApprovals';
import AdminWhitelistManager from './admin/AdminWhitelistManager';
import AdminUserSubscriptions from './admin/AdminUserSubscriptions';
import AdminMerchantUpiCard from './admin/AdminMerchantUpiCard';
import AdminPlansManager from './admin/AdminPlansManager';
import AdminAuthCard from './admin/AdminAuthCard';
import { useSubscriptionConfig } from '../lib/subscriptionConfig';

type AdminSection = 'payments' | 'whitelist' | 'subscriptions' | 'plans' | 'settings';

/**
 * Admin Tab Command Center.
 * Normalizes all subscription management, payment verification, and VIP access.
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
  const [activeSection, setActiveSection] = useState<AdminSection>('payments');
  const shouldReduceMotion = useReducedMotion();

  // Aggregated platform stats
  const [stats, setStats] = useState({
    pendingPayments: 0,
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
      // 1. Pending Payments (Firestore + Supabase)
      const pendingOrderIds = new Set<string>();
      try {
        const firePayments = await getDocs(collection(db, 'subscription_payments'));
        firePayments.forEach((d) => {
          if (d.data()?.status === 'PENDING_VERIFICATION') {
            pendingOrderIds.add(d.id);
          }
        });
      } catch {}

      try {
        const { data: supaPending } = await supabase
          .from('subscription_payments')
          .select('order_id')
          .eq('status', 'PENDING_VERIFICATION');

        (supaPending || []).forEach((p) => pendingOrderIds.add(p.order_id));
      } catch {}

      // 2. Whitelist VIPs
      const { count: whitelistCount } = await supabase
        .from('subscription_whitelist')
        .select('*', { count: 'exact', head: true });

      // 3 & 4. Total Users & Active Subscribers (Firestore + Supabase)
      const userIds = new Set<string>();
      let activeCount = 0;

      try {
        const fireSnap = await getDocs(collection(db, 'profiles'));
        fireSnap.forEach((d) => {
          userIds.add(d.id);
          const data = d.data();
          if (data?.subscriptionStatus === 'active') {
            activeCount++;
          }
        });
      } catch (err) {
        console.warn('Error fetching Firestore user stats:', err);
      }

      try {
        const { data: supaProfiles } = await supabase
          .from('profiles')
          .select('id, subscription_status');

        (supaProfiles || []).forEach((sp) => {
          if (!userIds.has(sp.id) && sp.subscription_status === 'active') {
            activeCount++;
          }
          userIds.add(sp.id);
        });
      } catch (err) {
        console.warn('Error fetching Supabase user stats:', err);
      }

      setStats({
        pendingPayments: pendingOrderIds.size,
        whitelistedVips: whitelistCount || 0,
        activeSubscribers: activeCount,
        totalUsers: userIds.size
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
            Pending Approvals
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.pendingPayments}
            </span>
            {stats.pendingPayments > 0 && (
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                Needs Review
              </span>
            )}
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
            Total Freelancers
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalUsers}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto text-sm relative">
        {[
          { id: 'payments' as const, label: 'Payment Approvals', icon: CreditCard, count: stats.pendingPayments },
          { id: 'whitelist' as const, label: 'VIP Whitelist', icon: UserCheck },
          { id: 'subscriptions' as const, label: 'User Subscriptions', icon: Users },
          { id: 'plans' as const, label: 'Plans & Offers', icon: Tag },
          { id: 'settings' as const, label: 'Gateway & UPI', icon: ShieldAlert }
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
                {Boolean(sec.count && sec.count > 0) && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors duration-150 ${
                      isActive
                        ? 'bg-indigo-700/90 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {sec.count}
                  </span>
                )}
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
            {activeSection === 'payments' && <AdminPaymentApprovals />}
            {activeSection === 'whitelist' && <AdminWhitelistManager />}
            {activeSection === 'subscriptions' && <AdminUserSubscriptions />}
            {activeSection === 'plans' && <AdminPlansManager />}
            {activeSection === 'settings' && <AdminMerchantUpiCard />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
