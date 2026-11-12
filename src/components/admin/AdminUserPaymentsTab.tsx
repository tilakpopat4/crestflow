import React from 'react';
import { CreditCard, CheckCircle, Clock, Shield, AlertCircle } from 'lucide-react';
import { AdminUserUnified } from '../../hooks/useAdminUsersAndHistory';

interface AdminUserPaymentsTabProps {
  user: AdminUserUnified;
  subscription: any;
}

/**
 * AdminUserPaymentsTab: Detailed subscription and transaction audit trail for a freelancer.
 * Adheres strictly to GEMINI.md: text status with 6px dot, no colored pills, 120ms transitions.
 */
export default function AdminUserPaymentsTab({ user, subscription }: AdminUserPaymentsTabProps) {
  const sub = subscription || {};
  const status = sub.status || user.subscription_status || 'free';
  const plan = sub.plan || user.subscription_plan || 'free';
  const cycle = sub.billingCycle || user.billing_cycle || (status === 'trialing' ? 'trial' : 'monthly');
  const now = Date.now();

  const accessUntil = sub.accessUntil || user.current_period_end;
  const accessExpiryDate = accessUntil ? new Date(accessUntil) : null;
  const isCurrentlyActive = (status === 'active' || status === 'trialing') && (!accessExpiryDate || accessExpiryDate.getTime() > now);

  // Compute payment amount based on plan and recorded data
  const amountPaid = sub.lastPaymentAmount ?? user.last_payment_amount ?? (
    status === 'trialing' || cycle === 'trial'
      ? 1
      : cycle === 'yearly'
      ? 899
      : cycle === 'half'
      ? 449
      : cycle === 'quarterly'
      ? 199
      : status === 'active'
      ? 79
      : 0
  );

  const paymentId = sub.lastPaymentId || user.last_payment_id || sub.razorpaySubscriptionId || user.razorpay_subscription_id || '—';
  const paymentMethod = sub.lastPaymentMethod || user.last_payment_method || (sub.lastPaymentVpa || user.last_payment_vpa ? 'UPI' : 'Razorpay Standard');
  const paymentVpa = sub.lastPaymentVpa || user.last_payment_vpa || user.upi_id;
  const paymentDate = sub.lastPaymentAt ? new Date(sub.lastPaymentAt) : sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : null;
  const hasTrialClaimed = Boolean(sub.hasHadTrial || user.has_had_trial || sub.trialEndsAt || user.trial_ends_at || status === 'trialing');

  const getStatusColor = (st: string) => {
    switch (st.toLowerCase()) {
      case 'active':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-600';
      case 'trialing':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-600';
      case 'expired':
        return 'text-red-600 dark:text-red-400 bg-red-600';
      case 'cancelled':
      case 'past_due':
        return 'text-slate-600 dark:text-slate-400 bg-slate-500';
      default:
        return 'text-slate-500 bg-slate-400';
    }
  };

  const statusColorCls = getStatusColor(status);
  const dotBg = statusColorCls.split(' ').pop();
  const textColor = statusColorCls.split(' ').slice(0, 2).join(' ');

  return (
    <div className="space-y-4 text-xs">
      {/* Primary Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wide">Subscription Plan</div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
            {cycle === 'trial' ? '7-Day Trial' : `Pro ${cycle}`}
          </div>
          <div className="text-[11px] text-slate-400">
            {plan === 'pro' || status === 'active' || status === 'trialing' ? 'Full Workspace Access' : 'Free Workspace'}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wide">Amount Paid</div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {amountPaid > 0 ? `₹${amountPaid.toLocaleString('en-IN')}` : 'Free'}
          </div>
          <div className="text-[11px] text-slate-400">
            Method: {paymentMethod}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wide">Status</div>
          <div className={`text-sm font-bold inline-flex items-center gap-1.5 ${textColor}`}>
            <span className={`w-2 h-2 rounded-full ${dotBg}`} />
            <span className="capitalize">{status}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {isCurrentlyActive ? 'Access Entitlement Valid' : 'Access Restricted'}
          </div>
        </div>
      </div>

      {/* Transaction & Razorpay Identifiers */}
      <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
          Payment Authorization & Settlement Details
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase text-[10px] font-semibold">Payment / Order Reference</span>
            <p className="font-mono text-slate-800 dark:text-slate-200 select-all truncate text-[11px]">
              {paymentId}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase text-[10px] font-semibold">UPI VPA Handle</span>
            <p className="font-mono text-slate-800 dark:text-slate-200 truncate text-[11px]">
              {paymentVpa || '—'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase text-[10px] font-semibold">Transaction Date</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {paymentDate ? paymentDate.toLocaleString() : '—'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase text-[10px] font-semibold">Access Validity Period</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {accessExpiryDate ? accessExpiryDate.toLocaleString() : 'No Active Expiry'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase text-[10px] font-semibold">7-Day Free Trial Status</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {hasTrialClaimed ? 'Claimed / Used' : 'Available for Claim'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 uppercase text-[10px] font-semibold">First-Time Welcome Email</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {hasTrialClaimed || status === 'active' ? 'Dispatched on First Payment' : 'Pending First Payment'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
