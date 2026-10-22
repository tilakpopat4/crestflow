import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useSubscriptionConfig } from '../lib/subscriptionConfig';
import { FREE_TIER_LIMITS } from '../lib/subscriptionPlans';

export interface SubscriptionDoc {
  userId: string;
  plan: string;
  billingCycle?: string;
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'cancelled' | 'halted' | 'expired';
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  accessUntil?: string;
  trialEndsAt?: string | null;
  razorpaySubscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  updatedAt?: number;
}

export interface SubscriptionState {
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'cancelled' | 'halted' | 'expired' | 'none';
  plan: string;
  isPro: boolean;
  hasAccess: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  isPaidActive: boolean;
  isWhitelisted: boolean;
  cancelAtPeriodEnd: boolean;
  billingCycle?: string;
  accessUntil?: string | null;
  trialEndsAt?: string | null;
  daysRemaining: number;
  serverNow?: string;
  currentPeriodEnd?: number;
  isSubscriptionFeatureEnabled: boolean;
  limits: typeof FREE_TIER_LIMITS;
  canCreateClient: (count: number) => boolean;
  canCreateInvoice: (count: number) => boolean;
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
 * Authoritative subscription state hook.
 * Client never decides access; it listens directly to Firestore subscriptions/{userId}
 * and synchronizes with serverNow from GET /api/me.
 */
export function useSubscription(
  userId?: string,
  profile?: UserProfile | null,
  userEmail?: string
): SubscriptionState {
  const { isEnabled: isSubscriptionFeatureEnabled } = useSubscriptionConfig();
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [subscriptionDoc, setSubscriptionDoc] = useState<SubscriptionDoc | null>(null);
  const [serverMe, setServerMe] = useState<{
    serverNow: string;
    status: string;
    accessUntil: string | null;
    trialEndsAt: string | null;
  } | null>(null);

  // 1. Check VIP email whitelist
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

  // 2. Fetch authoritative state from GET /api/me
  const fetchMe = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setServerMe(data);
      }
    } catch (err) {
      console.warn('[useSubscription] Failed to fetch /api/me:', err);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchMe();
  }, [userId, fetchMe]);

  // 3. Realtime Firestore listener on `subscriptions/{userId}`
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
      (err) => console.warn('[useSubscription] onSnapshot warning:', err)
    );

    return () => unsub();
  }, [userId]);

  // 4. Compute access strictly from server accessUntil
  const computedState = useMemo(() => {
    if (!isSubscriptionFeatureEnabled || isWhitelisted) {
      return {
        status: 'active' as const,
        plan: 'pro_yearly',
        isPro: true,
        hasAccess: true,
        isTrialing: false,
        isPastDue: false,
        isExpired: false,
        isCancelled: false,
        isPaidActive: true,
        cancelAtPeriodEnd: false,
        billingCycle: 'yearly',
        accessUntil: undefined,
        trialEndsAt: undefined,
        daysRemaining: 999,
        serverNow: serverMe?.serverNow,
        currentPeriodEnd: undefined,
      };
    }

    const serverNowMs = serverMe?.serverNow ? new Date(serverMe.serverNow).getTime() : Date.now();
    const accessUntilStr = subscriptionDoc?.accessUntil || serverMe?.accessUntil;
    const trialEndsAtStr = subscriptionDoc?.trialEndsAt || serverMe?.trialEndsAt;
    const accessUntilMs = accessUntilStr ? new Date(accessUntilStr).getTime() : 0;
    const trialEndsAtMs = trialEndsAtStr ? new Date(trialEndsAtStr).getTime() : 0;

    const rawStatus = (subscriptionDoc?.status || serverMe?.status || 'none') as SubscriptionState['status'];
    const isCancelled = Boolean(subscriptionDoc?.cancelAtPeriodEnd);

    // Access entitlement is strictly governed by whether server accessUntil > serverNow
    const hasAccess = accessUntilMs > serverNowMs;
    const isTrialing = rawStatus === 'trialing' && hasAccess;
    const isPastDue = rawStatus === 'past_due' && hasAccess;
    const isPaidActive = (rawStatus === 'active' || rawStatus === 'cancelled') && hasAccess;
    const isExpired = !hasAccess && rawStatus !== 'none';

    // Days left display counter based on serverNow
    let targetEndMs = accessUntilMs;
    if (isTrialing && trialEndsAtMs > 0) {
      targetEndMs = trialEndsAtMs;
    }
    const daysRemaining = targetEndMs > serverNowMs
      ? Math.max(0, Math.ceil((targetEndMs - serverNowMs) / (24 * 60 * 60 * 1000)))
      : 0;

    return {
      status: rawStatus,
      plan: subscriptionDoc?.plan || 'pro_monthly',
      isPro: hasAccess,
      hasAccess,
      isTrialing,
      isPastDue,
      isExpired,
      isCancelled,
      isPaidActive,
      cancelAtPeriodEnd: isCancelled,
      billingCycle: subscriptionDoc?.billingCycle || 'monthly',
      accessUntil: accessUntilStr,
      trialEndsAt: trialEndsAtStr,
      daysRemaining,
      serverNow: serverMe?.serverNow,
      currentPeriodEnd: subscriptionDoc?.currentPeriodEnd,
    };
  }, [subscriptionDoc, serverMe, isWhitelisted, isSubscriptionFeatureEnabled]);

  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      if (userEmail) {
        const whitelisted = await checkIsWhitelisted(userEmail);
        setIsWhitelisted(whitelisted);
      }
      await fetchMe();
      const snap = await getDoc(doc(db, 'subscriptions', userId));
      if (snap.exists()) {
        setSubscriptionDoc(snap.data() as SubscriptionDoc);
      }
    } catch (err) {
      console.warn('[useSubscription] Refresh failed:', err);
    }
  }, [userId, userEmail, fetchMe]);

  const cancelSubscription = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel subscription');
    }

    await refreshSubscription();
  }, [refreshSubscription]);

  const canCreateClient = useCallback(
    (count: number) => {
      if (computedState.hasAccess || !isSubscriptionFeatureEnabled) return true;
      return count < FREE_TIER_LIMITS.maxClients;
    },
    [computedState.hasAccess, isSubscriptionFeatureEnabled]
  );

  const canCreateInvoice = useCallback(
    (count: number) => {
      if (computedState.hasAccess || !isSubscriptionFeatureEnabled) return true;
      return count < FREE_TIER_LIMITS.maxInvoicesPerMonth;
    },
    [computedState.hasAccess, isSubscriptionFeatureEnabled]
  );

  const checkAccess = useCallback(() => computedState.hasAccess, [computedState.hasAccess]);

  return {
    ...computedState,
    isWhitelisted,
    isSubscriptionFeatureEnabled,
    limits: FREE_TIER_LIMITS,
    canCreateClient,
    canCreateInvoice,
    refreshSubscription,
    cancelSubscription,
    checkAccess,
  };
}
