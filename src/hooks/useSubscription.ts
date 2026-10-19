import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, SubscriptionStatus, SubscriptionPlan } from '../types';
import { supabase } from '../lib/supabase';
import { checkIsWhitelisted } from '../lib/youpiService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSubscriptionConfig } from '../lib/subscriptionConfig';

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
  isSubscriptionFeatureEnabled: boolean;
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
  const { isEnabled: isSubscriptionFeatureEnabled } = useSubscriptionConfig();
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
    // When master subscription toggle is turned OFF, grant full unrestricted access
    if (!isSubscriptionFeatureEnabled) {
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
  }, [profile?.subscriptionStatus, profile?.currentPeriodEnd, localOverride, now, isWhitelisted, isSubscriptionFeatureEnabled]);

  // Refresh subscription state from Firestore, local cache, and Supabase ledger
  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Whitelist check
      if (userEmail) {
        const whitelisted = await checkIsWhitelisted(userEmail);
        setIsWhitelisted(whitelisted);
        if (whitelisted) return;
      }

      // 2. Read local cache
      const cached = localStorage.getItem(`crestflow_sub_${userId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.status === 'active' && parsed.currentPeriodEnd && Number(parsed.currentPeriodEnd) > Date.now()) {
            setLocalOverride({
              status: 'active',
              plan: parsed.plan || 'monthly',
              currentPeriodEnd: Number(parsed.currentPeriodEnd)
            });
          }
        } catch {}
      }

      // 3. Read Firestore profile (native to Firebase Auth UID)
      try {
        const snap = await getDoc(doc(db, 'profiles', userId));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.subscriptionStatus === 'active' && data?.currentPeriodEnd) {
            setLocalOverride({
              status: 'active',
              plan: data.subscriptionPlan || 'monthly',
              currentPeriodEnd: Number(data.currentPeriodEnd)
            });
            return;
          }
        }
      } catch (fErr) {
        console.warn('[useSubscription] Firestore profile check:', fErr);
      }

      // 4. Read Supabase subscription_payments table (where user_id is text)
      try {
        const { data: payments } = await supabase
          .from('subscription_payments')
          .select('status, plan, created_at')
          .eq('user_id', userId)
          .eq('status', 'SUCCESS')
          .order('created_at', { ascending: false })
          .limit(1);

        if (payments && payments.length > 0) {
          const p = payments[0];
          const startMs = new Date(p.created_at).getTime();
          const endMs = startMs + (30 * 24 * 60 * 60 * 1000);
          if (endMs > Date.now()) {
            setLocalOverride({
              status: 'active',
              plan: (p.plan as SubscriptionPlan) || 'monthly',
              currentPeriodEnd: endMs
            });
            return;
          }
        }
      } catch {}

      // 5. Supabase profiles table (only if userId is a standard UUID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUuid) {
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
    isSubscriptionFeatureEnabled,
    refreshSubscription,
    checkAccess
  };
}
