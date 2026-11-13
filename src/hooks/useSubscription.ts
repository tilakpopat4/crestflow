import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useSubscriptionConfig } from '../lib/subscriptionConfig';
import { FREE_TIER_LIMITS } from '../lib/subscriptionPlans';

export interface SubscriptionDoc {
  userId: string; plan: string; billingCycle?: string;
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'cancelled' | 'halted' | 'expired';
  currentPeriodStart?: number; currentPeriodEnd?: number; accessUntil?: string; trialEndsAt?: string | null;
  razorpaySubscriptionId?: string; cancelAtPeriodEnd?: boolean; updatedAt?: number;
}

export interface SubscriptionState {
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'cancelled' | 'halted' | 'expired' | 'none';
  plan: string; isPro: boolean; hasAccess: boolean; isTrialing: boolean; isPastDue: boolean;
  isExpired: boolean; isCancelled: boolean; isPaidActive: boolean; isWhitelisted: boolean; loading: boolean;
  cancelAtPeriodEnd: boolean; billingCycle?: string; accessUntil?: string | null; trialEndsAt?: string | null;
  daysRemaining: number; serverNow?: string; currentPeriodEnd?: number; isSubscriptionFeatureEnabled: boolean;
  limits: typeof FREE_TIER_LIMITS; canCreateClient: (count: number) => boolean; canCreateInvoice: (count: number) => boolean;
  refreshSubscription: () => Promise<void>; cancelSubscription: () => Promise<void>; checkAccess: () => boolean;
}

async function checkIsWhitelisted(email?: string): Promise<boolean> {
  if (!email || !email.trim()) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === 'tilakpopat2007@gmail.com') return true;
  try {
    const snap = await getDoc(doc(db, 'subscription_whitelist', normalized));
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

  const cachedDoc = useMemo<SubscriptionDoc | null>(() => {
    if (!userId || typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`crestflow_sub_${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [userId]);

  const [subscriptionDoc, setSubscriptionDoc] = useState<SubscriptionDoc | null>(cachedDoc);
  const [loading, setLoading] = useState<boolean>(() => {
    if (!userId) return false;
    if (cachedDoc?.accessUntil && new Date(cachedDoc.accessUntil).getTime() > Date.now()) return false;
    return true;
  });
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
    const normalized = userEmail.trim().toLowerCase();
    if (normalized === 'tilakpopat2007@gmail.com') {
      setIsWhitelisted(true);
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

  // 2. Fetch authoritative state from GET /api/me with immediate access propagation
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
        if (data.accessUntil && new Date(data.accessUntil).getTime() > Date.now()) {
          setSubscriptionDoc((prev) => {
            if (prev && prev.accessUntil === data.accessUntil && prev.status === data.status) return prev;
            const updated: SubscriptionDoc = {
              userId: auth.currentUser!.uid,
              plan: data.plan || 'pro',
              billingCycle: data.billingCycle || 'monthly',
              status: (data.status as any) || 'active',
              accessUntil: data.accessUntil,
              trialEndsAt: data.trialEndsAt,
              updatedAt: Date.now(),
            };
            try {
              localStorage.setItem(`crestflow_sub_${auth.currentUser!.uid}`, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn('[useSubscription] Failed to fetch /api/me:', err);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchMe();
  }, [userId, fetchMe]);

  // Continuous Polling: Live connection between Razorpay payments & CrestFlow
  useEffect(() => {
    if (!userId) return;
    const intervalMs = computedState.hasAccess ? 45000 : 2500;
    const timer = setInterval(() => { fetchMe(); }, intervalMs);
    const onFocus = () => { fetchMe(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [userId, computedState.hasAccess, fetchMe]);

  // 3. Realtime Firestore listener on `subscriptions/{userId}`
  useEffect(() => {
    if (!userId) {
      setSubscriptionDoc(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'subscriptions', userId),
      (snap) => {
        setLoading(false);
        if (snap.exists()) {
          const data = snap.data() as SubscriptionDoc;
          setSubscriptionDoc(data);
          try {
            localStorage.setItem(`crestflow_sub_${userId}`, JSON.stringify(data));
          } catch {}
        } else {
          setSubscriptionDoc(null);
          try {
            localStorage.removeItem(`crestflow_sub_${userId}`);
          } catch {}
        }
      },
      (err) => {
        console.warn('[useSubscription] onSnapshot warning:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  // 4. Compute access strictly from server accessUntil
  const computedState = useMemo(() => {
    if (!isSubscriptionFeatureEnabled || isWhitelisted) {
      return {
        status: 'active' as const, plan: 'pro_yearly', isPro: true, hasAccess: true,
        isTrialing: false, isPastDue: false, isExpired: false, isCancelled: false,
        isPaidActive: true, cancelAtPeriodEnd: false, billingCycle: 'yearly',
        accessUntil: undefined, trialEndsAt: undefined, daysRemaining: 999,
        serverNow: serverMe?.serverNow, currentPeriodEnd: undefined,
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

    let targetEndMs = accessUntilMs;
    if (isTrialing && trialEndsAtMs > 0) targetEndMs = trialEndsAtMs;
    const daysRemaining = targetEndMs > serverNowMs
      ? Math.max(0, Math.ceil((targetEndMs - serverNowMs) / (24 * 60 * 60 * 1000)))
      : 0;

    return {
      status: rawStatus, plan: subscriptionDoc?.plan || 'pro_monthly',
      isPro: hasAccess, hasAccess, isTrialing, isPastDue, isExpired, isCancelled, isPaidActive,
      cancelAtPeriodEnd: isCancelled, billingCycle: subscriptionDoc?.billingCycle || 'monthly',
      accessUntil: accessUntilStr, trialEndsAt: trialEndsAtStr, daysRemaining,
      serverNow: serverMe?.serverNow, currentPeriodEnd: subscriptionDoc?.currentPeriodEnd,
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
    loading,
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
