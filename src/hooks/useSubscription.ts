import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useSubscriptionConfig } from '../lib/subscriptionConfig';
import { FREE_TIER_LIMITS } from '../lib/subscriptionPlans';
import { checkIsWhitelisted, computeSubscriptionAccess } from '../lib/subscriptionStateUtils';

export interface SubscriptionDoc {
  userId: string; plan: string; billingCycle?: string;
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'cancelled' | 'halted' | 'expired';
  currentPeriodStart?: number; currentPeriodEnd?: number; accessUntil?: string; trialEndsAt?: string | null;
  trialClaimed?: boolean; trialClaimedAt?: number; trialStartedAt?: number;
  razorpaySubscriptionId?: string; cancelAtPeriodEnd?: boolean; updatedAt?: number;
}

export type SubscriptionStateMachine =
  | 'FREE'
  | 'TRIAL_ELIGIBLE'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export interface SubscriptionState {
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'cancelled' | 'halted' | 'expired' | 'none';
  stateMachine: SubscriptionStateMachine;
  plan: string; isPro: boolean; hasAccess: boolean; isTrialing: boolean; isPastDue: boolean;
  isExpired: boolean; isCancelled: boolean; isPaidActive: boolean; isWhitelisted: boolean; loading: boolean;
  trialClaimed: boolean; isTrialEligible: boolean;
  cancelAtPeriodEnd: boolean; billingCycle?: string; accessUntil?: string | null; trialEndsAt?: string | null;
  daysRemaining: number; serverNow?: string; currentPeriodEnd?: number; isSubscriptionFeatureEnabled: boolean;
  limits: typeof FREE_TIER_LIMITS; canCreateClient: (count: number) => boolean; canCreateInvoice: (count: number) => boolean;
  refreshSubscription: () => Promise<void>; cancelSubscription: () => Promise<void>;
  activateFreeTrial: () => Promise<{ success: boolean; error?: string }>; checkAccess: () => boolean;
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
    trialClaimed?: boolean;
  } | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // 1. Check VIP email whitelist
  useEffect(() => {
    if (!userEmail) { setIsWhitelisted(false); return; }
    if (userEmail.trim().toLowerCase() === 'tilakpopat2007@gmail.com') { setIsWhitelisted(true); return; }
    let isMounted = true;
    checkIsWhitelisted(userEmail).then((whitelisted) => { if (isMounted) setIsWhitelisted(whitelisted); });
    return () => { isMounted = false; };
  }, [userEmail]);

  // 2. Compute access strictly from server accessUntil (with live forward clock check)
  const computedState = useMemo(() => {
    return computeSubscriptionAccess({
      isSubscriptionFeatureEnabled,
      isWhitelisted,
      subscriptionDoc,
      serverMe,
      clientNowMs: nowTick,
    });
  }, [subscriptionDoc, serverMe, isWhitelisted, isSubscriptionFeatureEnabled, nowTick]);

  // Live expiration timer: locks workspace immediately when 7-day trial or subscription expires
  useEffect(() => {
    if (!computedState.hasAccess || !computedState.accessUntil || isWhitelisted) return;
    const msLeft = new Date(computedState.accessUntil).getTime() - Date.now();
    const delay = msLeft <= 0 ? 500 : Math.min(msLeft + 500, 60000);
    const id = setTimeout(() => setNowTick(Date.now()), delay);
    return () => clearTimeout(id);
  }, [computedState.hasAccess, computedState.accessUntil, isWhitelisted, nowTick]);

  // 3. Fetch authoritative state from GET /api/me with immediate access propagation
  const fetchMe = useCallback(async () => {
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid;
    if (!currentUser || !uid) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || auth.currentUser?.uid !== uid) return;
      const data = await res.json();
      if (auth.currentUser?.uid !== uid) return;
      setServerMe(data);
      if (data.accessUntil && new Date(data.accessUntil).getTime() > Date.now()) {
        setSubscriptionDoc((prev) => {
          if (prev && prev.accessUntil === data.accessUntil && prev.status === data.status) return prev;
          const updated: SubscriptionDoc = {
            userId: uid,
            plan: data.plan || 'pro',
            billingCycle: data.billingCycle || 'monthly',
            status: (data.status as any) || 'active',
            accessUntil: data.accessUntil,
            trialEndsAt: data.trialEndsAt,
            updatedAt: Date.now(),
          };
          try {
            localStorage.setItem(`crestflow_sub_${uid}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('[useSubscription] Failed to fetch /api/me:', err);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchMe();
  }, [userId, fetchMe]);

  // 4. Continuous Polling: Live connection between Razorpay payments & CrestFlow
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

  // 5. Realtime Firestore listener on `subscriptions/{userId}`
  useEffect(() => {
    if (!userId) {
      setSubscriptionDoc(null);
      setServerMe(null);
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

  const activateFreeTrial = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid;
    if (!currentUser || !uid) return { success: false, error: 'Not authenticated' };
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/activate-trial', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || 'Failed to activate free trial.' };
      if (data.accessUntil) {
        const updated: SubscriptionDoc = {
          userId: uid,
          plan: 'pro',
          billingCycle: 'trial',
          status: 'trialing',
          accessUntil: data.accessUntil,
          trialEndsAt: data.trialEndsAt,
          trialClaimed: true,
          trialStartedAt: data.trialStartedAt,
          updatedAt: Date.now(),
        };
        setSubscriptionDoc(updated);
        try { localStorage.setItem(`crestflow_sub_${uid}`, JSON.stringify(updated)); } catch {}
      }
      await refreshSubscription();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Trial activation network error.' };
    }
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
    activateFreeTrial,
    checkAccess,
  };
}
