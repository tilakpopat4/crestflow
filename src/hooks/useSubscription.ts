import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, SubscriptionStatus, SubscriptionPlan } from '../types';
import { supabase } from '../lib/supabase';
import { checkIsWhitelisted } from '../lib/youpiService';

export interface SubscriptionState {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  hasAccess: boolean;
  isPaidActive: boolean;
  isExpired: boolean;
  isInactive: boolean;
  isWhitelisted: boolean;
  daysRemaining: number;
  currentPeriodEnd?: number;
  refreshSubscription: () => Promise<void>;
  checkAccess: () => boolean;
}

/**
 * Hook to manage user subscription lifecycle.
 * All users require an active subscription (₹49/month) unless whitelisted by Admin.
 */
export function useSubscription(
  userId?: string,
  profile?: UserProfile | null,
  userEmail?: string
): SubscriptionState {
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [localOverride, setLocalOverride] = useState<{
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
    currentPeriodEnd?: number;
  } | null>(() => {
    if (!userId) return null;
    try {
      const saved = localStorage.getItem(`crestflow_sub_${userId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Check email whitelist on load & changes
  useEffect(() => {
    if (!userEmail) {
      setIsWhitelisted(false);
      return;
    }
    let isMounted = true;
    checkIsWhitelisted(userEmail).then((whitelisted) => {
      if (isMounted) setIsWhitelisted(whitelisted);
    });
    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  const now = Date.now();

  // Determine current active status
  const { status, plan, isPaidActive, isExpired, isInactive, hasAccess, daysRemaining, currentPeriodEnd } = useMemo(() => {
    // 0. Whitelisted User (VIP Free Access)
    if (isWhitelisted) {
      return {
        status: 'active' as SubscriptionStatus,
        plan: 'monthly' as SubscriptionPlan,
        isPaidActive: true,
        isExpired: false,
        isInactive: false,
        hasAccess: true,
        daysRemaining: 999,
        currentPeriodEnd: undefined
      };
    }

    const rawStatus = localOverride?.status || profile?.subscriptionStatus || 'inactive';
    const activePlan: SubscriptionPlan = 'monthly';
    const periodEnd = localOverride?.currentPeriodEnd || profile?.currentPeriodEnd;

    // 1. Paid Active Subscription
    if (rawStatus === 'active' && periodEnd && now < periodEnd) {
      const daysLeft = Math.max(0, Math.ceil((periodEnd - now) / (24 * 60 * 60 * 1000)));
      return {
        status: 'active' as SubscriptionStatus,
        plan: activePlan,
        isPaidActive: true,
        isExpired: false,
        isInactive: false,
        hasAccess: true,
        daysRemaining: daysLeft,
        currentPeriodEnd: periodEnd
      };
    }

    // 2. Expired subscription (was active previously, but period ended)
    if (periodEnd && now >= periodEnd) {
      return {
        status: 'expired' as SubscriptionStatus,
        plan: activePlan,
        isPaidActive: false,
        isExpired: true,
        isInactive: false,
        hasAccess: false,
        daysRemaining: 0,
        currentPeriodEnd: periodEnd
      };
    }

    // 3. Inactive (New signup who hasn't subscribed yet)
    return {
      status: 'inactive' as SubscriptionStatus,
      plan: activePlan,
      isPaidActive: false,
      isExpired: false,
      isInactive: true,
      hasAccess: false,
      daysRemaining: 0,
      currentPeriodEnd: undefined
    };
  }, [profile?.subscriptionStatus, profile?.currentPeriodEnd, localOverride, now, isWhitelisted]);

  // Refresh subscription state directly from Supabase profiles and whitelist
  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      if (userEmail) {
        const whitelisted = await checkIsWhitelisted(userEmail);
        setIsWhitelisted(whitelisted);
        if (whitelisted) return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan, current_period_start, current_period_end')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const periodEndMs = data.current_period_end ? new Date(data.current_period_end).getTime() : undefined;
        setLocalOverride({
          status: data.subscription_status,
          plan: 'monthly',
          currentPeriodEnd: periodEndMs
        });
      }
    } catch (err) {
      console.warn('[useSubscription] Refresh failed:', err);
    }
  }, [userId, userEmail]);

  // Listen to cross-tab storage changes
  useEffect(() => {
    if (!userId) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `crestflow_sub_${userId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setLocalOverride(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userId]);

  const checkAccess = useCallback(() => {
    return hasAccess;
  }, [hasAccess]);

  return {
    status,
    plan,
    hasAccess,
    isPaidActive,
    isExpired,
    isInactive,
    isWhitelisted,
    daysRemaining,
    currentPeriodEnd,
    refreshSubscription,
    checkAccess
  };
}
