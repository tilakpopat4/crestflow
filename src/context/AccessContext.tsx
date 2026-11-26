import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { trackAccessEvent } from '../lib/analytics';
import {
  fetchServerEntitlement,
  postActivateTrial,
  postCancelSubscription,
} from '../lib/accessApi';
import {
  AccessState,
  EntitlementSnapshot,
  UpgradeContext,
  normalizeEntitlementPayload,
  readCachedEntitlement,
  resolveAccessFromSnapshot,
  resolveUpgradeBenefit,
  writeCachedEntitlement,
  getEntitlementCacheKey,
} from '../lib/accessState';

export interface AccessContextValue {
  user: User | null;
  state: AccessState;
  rawStatus: EntitlementSnapshot['status'];
  canWrite: boolean;
  isLoading: boolean;
  isExploring: boolean;
  isExpired: boolean;
  isLifetime: boolean;
  plan: string;
  billingCycle: string | null;
  checkoutMode: 'subscription' | 'order' | null;
  validUntil: string | null;
  graceUntil: string | null;
  trialStartedAt: string | null;
  daysLeft: number;
  trialDay: number;
  trialUsed: boolean;
  cancelAtPeriodEnd: boolean;
  recurringPlansConfigured: boolean;
  activatingPlan: boolean;
  setActivatingPlan: (value: boolean) => void;
  justStartedTrial: boolean;
  clearJustStartedTrial: () => void;
  upgradeSheetOpen: boolean;
  upgradeContext: UpgradeContext | null;
  openUpgradeSheet: (ctx?: { action: string; benefit?: string }) => void;
  closeUpgradeSheet: () => void;
  requireAccess: (action: string, benefit?: string) => boolean;
  activateTrial: () => Promise<{ success: boolean; error?: string }>;
  refreshAccess: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

const DEFAULT_LOADING = {
  state: 'loading' as AccessState, canWrite: false, isExploring: false, isExpired: false, isLifetime: false, daysLeft: 0, trialDay: 0,
};
const DEFAULT_NONE = {
  state: 'none' as AccessState, canWrite: false, isExploring: false, isExpired: false, isLifetime: false, daysLeft: 0, trialDay: 0,
};
const SAFE_FALLBACK_ACCESS: AccessContextValue = {
  user: null, state: 'none', rawStatus: 'none', canWrite: false, isLoading: false, isExploring: false, isExpired: false, isLifetime: false,
  plan: 'none', billingCycle: null, checkoutMode: null, validUntil: null, graceUntil: null, trialStartedAt: null,
  daysLeft: 0, trialDay: 0, trialUsed: false, cancelAtPeriodEnd: false, recurringPlansConfigured: false,
  activatingPlan: false, setActivatingPlan: () => {}, justStartedTrial: false, clearJustStartedTrial: () => {},
  upgradeSheetOpen: false, upgradeContext: null, openUpgradeSheet: () => {}, closeUpgradeSheet: () => {},
  requireAccess: () => false, activateTrial: async () => ({ success: false, error: 'Sign in required' }),
  refreshAccess: async () => {}, cancelSubscription: async () => {},
};

const AccessContext = createContext<AccessContextValue | null>(null);

interface AccessProviderProps {
  user: User | null;
  authLoading: boolean;
  children: React.ReactNode;
}

/**
 * Single authoritative client entitlement provider driven by `entitlements/{uid}` onSnapshot
 * with localStorage cache paint (zero wall/redirect flash while resolving).
 */
export function AccessProvider({ user, authLoading, children }: AccessProviderProps) {
  const uid = user?.uid || null;

  const [snapshot, setSnapshot] = useState<EntitlementSnapshot | null>(() => readCachedEntitlement(uid));
  const [resolvedOnce, setResolvedOnce] = useState<boolean>(() => Boolean(uid && readCachedEntitlement(uid)));
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [recurringPlansConfigured, setRecurringPlansConfigured] = useState(false);
  const [activatingPlan, setActivatingPlan] = useState(false);
  const [justStartedTrial, setJustStartedTrial] = useState(false);
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<UpgradeContext | null>(null);
  const [, setTick] = useState(0);

  const exploreTrackedRef = useRef<string | null>(null);
  const expiredTrackedRef = useRef<string | null>(null);

  // When auth changes UID, synchronize cache immediately without flashing wrong walls
  useEffect(() => {
    if (authLoading) return;
    if (!uid) {
      setSnapshot(null);
      setResolvedOnce(true);
      return;
    }
    const cached = readCachedEntitlement(uid);
    if (cached) {
      setSnapshot(cached);
      setResolvedOnce(true);
    } else {
      setSnapshot(null);
      setResolvedOnce(false);
    }
  }, [uid, authLoading]);

  const syncWithServerApi = useCallback(async (activeUser: User | null) => {
    if (!activeUser) return;
    const synced = await fetchServerEntitlement(activeUser);
    if (!synced) return;
    if (synced.clockOffsetMs !== null) setClockOffsetMs(synced.clockOffsetMs);
    if (synced.recurringPlansConfigured !== undefined) {
      setRecurringPlansConfigured(synced.recurringPlansConfigured);
    }
    setSnapshot(synced.snapshot);
    setResolvedOnce(true);
  }, []);

  // Single Firestore realtime listener on entitlements/{uid}
  useEffect(() => {
    if (authLoading || !uid || !user) return;
    let active = true;

    const ref = doc(db, 'entitlements', uid);
    const unsubDoc = onSnapshot(
      ref,
      (docSnap) => {
        if (!active) return;
        const next = docSnap.exists()
          ? normalizeEntitlementPayload(docSnap.data() as Record<string, unknown>, uid)
          : normalizeEntitlementPayload(null, uid);
        writeCachedEntitlement(uid, next);
        setSnapshot(next);
        setResolvedOnce(true);
      },
      () => {
        if (!active) return;
        // Fallback silently to /api/me rather than flashing an incorrect state
        void syncWithServerApi(user);
      },
    );

    void syncWithServerApi(user);

    const handleOnline = () => void syncWithServerApi(user);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === getEntitlementCacheKey(uid)) {
        const updated = readCachedEntitlement(uid);
        if (updated) {
          setSnapshot(updated);
          setResolvedOnce(true);
        }
      }
    };
    const unsubToken = onIdTokenChanged(auth, (changedUser) => {
      if (changedUser && changedUser.uid === uid) {
        // Refresh clock offset quietly without resetting state to 'loading'
        void syncWithServerApi(changedUser);
      }
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('storage', handleStorage);

    return () => {
      active = false;
      unsubDoc();
      unsubToken();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('storage', handleStorage);
    };
  }, [uid, user, authLoading, syncWithServerApi]);

  const nowMs = Date.now() + clockOffsetMs;
  const effective = useMemo(() => {
    if (authLoading || (uid && !resolvedOnce && !snapshot)) return DEFAULT_LOADING;
    if (!uid) return DEFAULT_NONE;
    return resolveAccessFromSnapshot(snapshot || normalizeEntitlementPayload(null, uid), nowMs);
  }, [authLoading, uid, resolvedOnce, snapshot, nowMs]);

  // Schedule deterministic re-evaluation right when validUntil crosses so expiry happens live without cron
  useEffect(() => {
    if (!uid || !snapshot) return;
    const targetMs =
      snapshot.status === 'grace'
        ? (snapshot.graceUntilMs ?? snapshot.validUntilMs)
        : snapshot.validUntilMs;
    if (!targetMs || effective.isLifetime) return;
    const msLeft = targetMs - (Date.now() + clockOffsetMs);
    if (msLeft > 0 && msLeft <= 24 * 60 * 60 * 1000) {
      const timer = window.setTimeout(() => setTick((v) => v + 1), msLeft + 250);
      return () => window.clearTimeout(timer);
    }
  }, [uid, snapshot, clockOffsetMs, effective.isLifetime]);

  // Analytics emissions once per UID per state transition
  useEffect(() => {
    if (!uid || effective.state === 'loading') return;
    if (effective.state === 'none' && exploreTrackedRef.current !== uid) {
      exploreTrackedRef.current = uid;
      trackAccessEvent('explore_viewed', { uid });
    }
    if (effective.state === 'expired' && snapshot?.trialUsed && expiredTrackedRef.current !== uid) {
      expiredTrackedRef.current = uid;
      trackAccessEvent('trial_expired', { uid });
    }
  }, [uid, effective.state, snapshot?.trialUsed]);

  const openUpgradeSheet = useCallback((ctx?: { action: string; benefit?: string }) => {
    const action = ctx?.action || 'upgrade';
    setUpgradeContext({ action, benefit: resolveUpgradeBenefit(action, ctx?.benefit) });
    setUpgradeSheetOpen(true);
  }, []);

  const closeUpgradeSheet = useCallback(() => setUpgradeSheetOpen(false), []);

  const requireAccess = useCallback(
    (action: string, benefit?: string): boolean => {
      if (effective.state === 'loading') return false;
      if (effective.canWrite) return true;
      trackAccessEvent('upgrade_sheet_opened', { action });
      openUpgradeSheet({
        action,
        benefit: resolveUpgradeBenefit(action, benefit),
      });
      return false;
    },
    [effective.state, effective.canWrite, openUpgradeSheet],
  );

  const activateTrial = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Please sign in first.' };
    const result = await postActivateTrial(user);
    if (!result.ok) return { success: false, error: 'error' in result ? result.error : 'Could not activate trial.' };
    setSnapshot(result.snapshot);
    setResolvedOnce(true);
    setJustStartedTrial(true);
    setUpgradeSheetOpen(false);
    trackAccessEvent('trial_started', { plan: 'pro_trial' });
    return { success: true };
  }, [user]);

  const refreshAccess = useCallback(async () => {
    await syncWithServerApi(user);
  }, [syncWithServerApi, user]);

  const cancelSubscription = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    await postCancelSubscription(user);
    await syncWithServerApi(user);
  }, [user, syncWithServerApi]);

  const value: AccessContextValue = useMemo(
    () => ({
      user, state: effective.state, rawStatus: snapshot?.status || 'none', canWrite: effective.canWrite,
      isLoading: effective.state === 'loading', isExploring: effective.isExploring, isExpired: effective.isExpired,
      isLifetime: effective.isLifetime, plan: snapshot?.plan || 'none', billingCycle: snapshot?.billingCycle || null,
      checkoutMode: snapshot?.checkoutMode || null,
      validUntil: snapshot?.validUntilMs ? new Date(snapshot.validUntilMs).toISOString() : null,
      graceUntil: snapshot?.graceUntilMs ? new Date(snapshot.graceUntilMs).toISOString() : null,
      trialStartedAt: snapshot?.trialStartedAtMs ? new Date(snapshot.trialStartedAtMs).toISOString() : null,
      daysLeft: effective.daysLeft, trialDay: effective.trialDay, trialUsed: Boolean(snapshot?.trialUsed),
      cancelAtPeriodEnd: Boolean(snapshot?.cancelAtPeriodEnd), recurringPlansConfigured,
      activatingPlan, setActivatingPlan, justStartedTrial, clearJustStartedTrial: () => setJustStartedTrial(false),
      upgradeSheetOpen, upgradeContext, openUpgradeSheet, closeUpgradeSheet,
      requireAccess, activateTrial, refreshAccess, cancelSubscription,
    }),
    [
      user, effective, snapshot, recurringPlansConfigured, activatingPlan, justStartedTrial,
      upgradeSheetOpen, upgradeContext, openUpgradeSheet, closeUpgradeSheet, requireAccess,
      activateTrial, refreshAccess, cancelSubscription,
    ],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

/** Primary hook for workspace access state, gating mutating actions, and opening UpgradeSheet. */
export function useAccessContext(): AccessContextValue {
  return useContext(AccessContext) ?? SAFE_FALLBACK_ACCESS;
}
