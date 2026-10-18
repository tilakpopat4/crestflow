import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Users, ShieldAlert, CreditCard, UserCheck, RefreshCw, Tag } from 'lucide-react';
import AdminPaymentApprovals from './admin/AdminPaymentApprovals';
import AdminWhitelistManager from './admin/AdminWhitelistManager';
import AdminUserSubscriptions from './admin/AdminUserSubscriptions';
import AdminMerchantUpiCard from './admin/AdminMerchantUpiCard';
import AdminPlansManager from './admin/AdminPlansManager';
import AdminAuthCard from './admin/AdminAuthCard';

type AdminSection = 'payments' | 'whitelist' | 'subscriptions' | 'plans' | 'settings';

/**
 * Admin Tab Command Center.
 * Normalizes all subscription management, payment verification, and VIP access.
 * Adheres strictly to GEMINI.md design standards: flat, restrained SaaS aesthetic, 120ms transitions.
 */
export default function AdminTab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('payments');

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
    return <AdminAuthCard onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Authenticated Admin Dashboard
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Admin Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage ₹49 subscriptions, approve submitted bank UTRs, and configure VIP email whitelists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 border-0 cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogoutAdmin}
            className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-120 cursor-pointer border-0"
          >
            Lock Console
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pending Approvals
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats.pendingPayments}
            </span>
            {stats.pendingPayments > 0 && (
              <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                Needs Review
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            VIP Whitelist
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {stats.whitelistedVips}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Subscriptions
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats.activeSubscribers}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Freelancers
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalUsers}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSection('payments')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-120 inline-flex items-center gap-1.5 cursor-pointer border-0 ${
            activeSection === 'payments'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payment Approvals</span>
          {stats.pendingPayments > 0 && (
            <span className="bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded font-medium">
              {stats.pendingPayments}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection('whitelist')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-120 inline-flex items-center gap-1.5 cursor-pointer border-0 ${
            activeSection === 'whitelist'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>VIP Whitelist</span>
        </button>

        <button
          onClick={() => setActiveSection('subscriptions')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-120 inline-flex items-center gap-1.5 cursor-pointer border-0 ${
            activeSection === 'subscriptions'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Subscriptions</span>
        </button>

        <button
          onClick={() => setActiveSection('plans')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-120 inline-flex items-center gap-1.5 cursor-pointer border-0 ${
            activeSection === 'plans'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Plans & Offers</span>
        </button>

        <button
          onClick={() => setActiveSection('settings')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-120 inline-flex items-center gap-1.5 cursor-pointer border-0 ${
            activeSection === 'settings'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Gateway & UPI</span>
        </button>
      </div>

      {/* Main Section Content */}
      <div className="space-y-4">
        {activeSection === 'payments' && <AdminPaymentApprovals />}
        {activeSection === 'whitelist' && <AdminWhitelistManager />}
        {activeSection === 'subscriptions' && <AdminUserSubscriptions />}
        {activeSection === 'plans' && <AdminPlansManager />}
        {activeSection === 'settings' && <AdminMerchantUpiCard />}
      </div>
    </div>
  );
}
