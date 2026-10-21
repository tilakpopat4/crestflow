import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, SubscriptionStatus, SubscriptionPlan } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useSubscriptionConfig } from '../lib/subscriptionConfig';
import { FREE_TIER_LIMITS } from '../lib/subscriptionPlans';

export interface SubscriptionDoc {
  userId: string;
  plan: 'free' | 'pro';
  billingCycle?: 'monthly' | 'yearly';
  status: 'active' | 'pending' | 'cancelled' | 'halted' | 'expired';
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  razorpaySubscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  updatedAt?: number;
}

export interface SubscriptionState {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  isPro: boolean;
  hasAccess: boolean;
  isPaidActive: boolean;
  isExpired: boolean;
  isInactive: boolean;
  isWhitelisted: boolean;
  cancelAtPeriodEnd: boolean;
  billingCycle?: 'monthly' | 'yearly';
  daysRemaining: number;
  currentPeriodEnd?: number;
  isSubscriptionFeatureEnabled: boolean;
  limits: {
    maxClients: number;
    maxInvoicesPerMonth: number;
  };
  canCreateClient: (currentClientCount: number) => boolean;
  canCreateInvoice: (currentMonthInvoiceCount: number) => boolean;
  refreshSubscription: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  checkAccess: () => boolean;
}

async function checkIsWhitelisted(email?: string): Promise<boolean> {
  if (!email || !email.trim()) return false;
  try {
    const snap = await getDoc(doc(db, 'subscription_whitelist', email.trim().toLowerCase()));
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Hook to manage user subscription lifecycle backed by Cloud Firestore.
 * Realtime updates from webhook via Firestore `subscriptions/{userId}` document.
 */
export function useSubscription(
  userId?: string,
  profile?: UserProfile | null,
  userEmail?: string
): SubscriptionState {
  const { isEnabled: isSubscriptionFeatureEnabled } = useSubscriptionConfig();
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [subscriptionDoc, setSubscriptionDoc] = useState<SubscriptionDoc | null>(null);

  // 1. Check email whitelist
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

  // 2. Realtime listener on Firestore `subscriptions/{userId}`
  useEffect(() => {
    if (!userId) {
      setSubscriptionDoc(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'subscriptions', userId),
      (snap) => {
        if (snap.exists()) {
          setSubscriptionDoc(snap.data() as SubscriptionDoc);
        } else {
          setSubscriptionDoc(null);
        }
      },
      (err) => {
        console.warn('[useSubscription] Subscriptions onSnapshot warning:', err);
      }
    );

    return () => unsub();
  }, [userId]);

  const now = Date.now();

  // Determine current active status
  const {
    status,
    plan,
    isPro,
    isPaidActive,
    isExpired,
    isInactive,
    hasAccess,
    cancelAtPeriodEnd,
    billingCycle,
    daysRemaining,
    currentPeriodEnd,
  } = useMemo(() => {
    // When master subscription toggle is turned OFF, grant full unrestricted Pro access
    if (!isSubscriptionFeatureEnabled) {
      return {
        status: 'active' as SubscriptionStatus,
        plan: 'pro' as SubscriptionPlan,
        isPro: true,
        isPaidActive: true,
        isExpired: false,
        isInactive: false,
        hasAccess: true,
        cancelAtPeriodEnd: false,
        billingCycle: 'monthly' as const,
        daysRemaining: 999,
        currentPeriodEnd: undefined,
      };
    }

    // 0. Whitelisted VIP access
    if (isWhitelisted) {
      return {
        status: 'active' as SubscriptionStatus,
        plan: 'pro' as SubscriptionPlan,
        isPro: true,
        isPaidActive: true,
        isExpired: false,
        isInactive: false,
        hasAccess: true,
        cancelAtPeriodEnd: false,
        billingCycle: 'yearly' as const,
        daysRemaining: 999,
        currentPeriodEnd: undefined,
      };
    }

    // 1. Read from realtime subscription doc or legacy profile fallback
    const rawStatus = subscriptionDoc?.status || profile?.subscriptionStatus || 'free';
    const rawPlan = subscriptionDoc?.plan || (profile?.subscriptionPlan === 'monthly' ? 'pro' : profile?.subscriptionPlan) || 'free';
    const periodEnd = subscriptionDoc?.currentPeriodEnd || profile?.currentPeriodEnd;
    const isCancelled = Boolean(subscriptionDoc?.cancelAtPeriodEnd);
    const cycle = subscriptionDoc?.billingCycle || 'monthly';

    // Active Pro Subscription (periodEnd in future)
    if (rawPlan === 'pro' && periodEnd && now < periodEnd) {
      const daysLeft = Math.max(0, Math.ceil((periodEnd - now) / (24 * 60 * 60 * 1000)));
      return {
        status: isCancelled ? ('cancelled' as SubscriptionStatus) : ('active' as SubscriptionStatus),
        plan: 'pro' as SubscriptionPlan,
        isPro: true,
        isPaidActive: true,
        isExpired: false,
        isInactive: false,
        hasAccess: true,
        cancelAtPeriodEnd: isCancelled,
        billingCycle: cycle,
        daysRemaining: daysLeft,
        currentPeriodEnd: periodEnd,
      };
    }

    // Expired Pro subscription
    if (periodEnd && now >= periodEnd) {
      return {
        status: 'expired' as SubscriptionStatus,
        plan: 'free' as SubscriptionPlan,
        isPro: false,
        isPaidActive: false,
        isExpired: true,
        isInactive: false,
        hasAccess: true, // Free tier access
        cancelAtPeriodEnd: false,
        billingCycle: cycle,
        daysRemaining: 0,
        currentPeriodEnd: periodEnd,
      };
    }

    // Free Tier user
    return {
      status: (rawStatus as SubscriptionStatus) || 'free',
      plan: 'free' as SubscriptionPlan,
      isPro: false,
      isPaidActive: false,
      isExpired: false,
      isInactive: rawStatus === 'free' || rawStatus === 'inactive',
      hasAccess: true, // Free tier is active with limits
      cancelAtPeriodEnd: false,
      billingCycle: undefined,
      daysRemaining: 0,
      currentPeriodEnd: undefined,
    };
  }, [subscriptionDoc, profile, now, isWhitelisted, isSubscriptionFeatureEnabled]);

  // Refresh manually if needed
  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      if (userEmail) {
        const whitelisted = await checkIsWhitelisted(userEmail);
        setIsWhitelisted(whitelisted);
      }
      const snap = await getDoc(doc(db, 'subscriptions', userId));
      if (snap.exists()) {
        setSubscriptionDoc(snap.data() as SubscriptionDoc);
      }
    } catch (err) {
      console.warn('[useSubscription] Refresh failed:', err);
    }
  }, [userId, userEmail]);

  // Cancel subscription at period end via Worker API
  const cancelSubscription = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel subscription');
    }

    await refreshSubscription();
  }, [refreshSubscription]);

  // Free Tier Limit Guards
  const canCreateClient = useCallback(
    (currentClientCount: number) => {
      if (isPro || !isSubscriptionFeatureEnabled) return true;
      return currentClientCount < FREE_TIER_LIMITS.maxClients;
    },
    [isPro, isSubscriptionFeatureEnabled]
  );

  const canCreateInvoice = useCallback(
    (currentMonthInvoiceCount: number) => {
      if (isPro || !isSubscriptionFeatureEnabled) return true;
      return currentMonthInvoiceCount < FREE_TIER_LIMITS.maxInvoicesPerMonth;
    },
    [isPro, isSubscriptionFeatureEnabled]
  );

  const checkAccess = useCallback(() => hasAccess, [hasAccess]);

  return {
    status,
    plan,
    isPro,
    hasAccess,
    isPaidActive,
    isExpired,
    isInactive,
    isWhitelisted,
    cancelAtPeriodEnd,
    billingCycle,
    daysRemaining,
    currentPeriodEnd,
    isSubscriptionFeatureEnabled,
    limits: FREE_TIER_LIMITS,
    canCreateClient,
    canCreateInvoice,
    refreshSubscription,
    cancelSubscription,
    checkAccess,
  };
}
