import type { User } from 'firebase/auth';

export type AccessState =
  | 'loading'
  | 'none'
  | 'trialing'
  | 'active'
  | 'grace'
  | 'expired'
  | 'suspended';

export type EntitlementStatus = Exclude<AccessState, 'loading'>;

export interface EntitlementSnapshot {
  uid?: string;
  status: EntitlementStatus;
  plan: string;
  billingCycle?: string | null;
  checkoutMode?: 'subscription' | 'order' | null;
  validUntilMs: number | null;
  graceUntilMs: number | null;
  trialStartedAtMs: number | null;
  trialUsed: boolean;
  cancelAtPeriodEnd: boolean;
  updatedAtMs?: number | null;
}

export interface UpgradeContext {
  action: string;
  benefit: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = 'crestflow_entitlement_';

export const ACTION_BENEFIT_COPY: Record<string, string> = {
  add_client: 'Add unlimited clients with per-reel or monthly retainer billing.',
  edit_client: 'Keep client terms, sub-clients, and payment reminders up to date.',
  log_work: 'Track deliverables, quantities, revisions, and preview links.',
  create_invoice: 'Generate GST-ready PDFs and shareable UPI QR invoices in seconds.',
  send_invoice: 'Send this invoice with an offline UPI QR directly via Gmail.',
  share_invoice: 'Create a private token-protected payment link for your client.',
  publish_portal: 'Publish your public onboarding portal and accept new client briefs.',
  ai_summary: 'Summarize deliverables and draft client status notes with AI.',
  manage_onboarding: 'Convert incoming onboarding leads directly into active clients.',
  manage_reviews: 'Approve and feature verified client testimonials on your portal.',
  schedule_email: 'Schedule automated 6:00 AM invoice emails and due reminders.',
};

/**
 * Parses a Firestore Timestamp, ISO string, or millisecond epoch safely into epoch milliseconds.
 */
export function parseTimestampMs(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const num = Number(raw);
    if (Number.isFinite(num) && raw.trim() !== '') return num;
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof raw === 'object' && raw !== null) {
    const tsLike = raw as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof tsLike.toMillis === 'function') return tsLike.toMillis();
    if (typeof tsLike.seconds === 'number') return tsLike.seconds * 1000;
    if (typeof tsLike._seconds === 'number') return tsLike._seconds * 1000;
  }
  return null;
}

/**
 * Normalizes a raw Firestore entitlements/{uid} or /api/me payload into a typed EntitlementSnapshot.
 */
export function normalizeEntitlementPayload(
  raw: Record<string, unknown> | null | undefined,
  uid?: string,
): EntitlementSnapshot {
  if (!raw) {
    return {
      uid,
      status: 'none',
      plan: 'none',
      billingCycle: null,
      checkoutMode: null,
      validUntilMs: null,
      graceUntilMs: null,
      trialStartedAtMs: null,
      trialUsed: false,
      cancelAtPeriodEnd: false,
    };
  }

  const rawStatus = String(raw.rawStatus || raw.status || 'none') as EntitlementStatus;
  const validStatuses: EntitlementStatus[] = [
    'none',
    'trialing',
    'active',
    'grace',
    'expired',
    'suspended',
  ];
  const status: EntitlementStatus = validStatuses.includes(rawStatus) ? rawStatus : 'none';

  return {
    uid: String(raw.uid || uid || ''),
    status,
    plan: String(raw.plan || 'none'),
    billingCycle: typeof raw.billingCycle === 'string' ? raw.billingCycle : null,
    checkoutMode:
      raw.checkoutMode === 'subscription' || raw.checkoutMode === 'order'
        ? raw.checkoutMode
        : null,
    validUntilMs: parseTimestampMs(raw.validUntil),
    graceUntilMs: parseTimestampMs(raw.graceUntil),
    trialStartedAtMs: parseTimestampMs(raw.trialStartedAt),
    trialUsed: Boolean(raw.trialUsed),
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
    updatedAtMs: parseTimestampMs(raw.updatedAt),
  };
}

/**
 * Resolves effective client AccessState from server-written entitlement data without cron reliance.
 */
export function resolveAccessFromSnapshot(
  snapshot: EntitlementSnapshot,
  nowMs: number = Date.now(),
): {
  state: EntitlementStatus;
  canWrite: boolean;
  isExploring: boolean;
  isExpired: boolean;
  isLifetime: boolean;
  daysLeft: number;
  trialDay: number;
} {
  const isLifetime = snapshot.plan === 'lifetime' && snapshot.status === 'active';
  const raw = snapshot.status;

  if (raw === 'suspended') {
    return {
      state: 'suspended',
      canWrite: false,
      isExploring: false,
      isExpired: true,
      isLifetime: false,
      daysLeft: 0,
      trialDay: 0,
    };
  }

  if (raw === 'none') {
    return {
      state: 'none',
      canWrite: false,
      isExploring: true,
      isExpired: false,
      isLifetime: false,
      daysLeft: 0,
      trialDay: 0,
    };
  }

  if (raw === 'expired') {
    return {
      state: 'expired',
      canWrite: false,
      isExploring: false,
      isExpired: true,
      isLifetime: false,
      daysLeft: 0,
      trialDay: 0,
    };
  }

  const expiryMs = raw === 'grace' ? (snapshot.graceUntilMs ?? snapshot.validUntilMs) : snapshot.validUntilMs;
  if (!isLifetime && (!expiryMs || expiryMs <= nowMs)) {
    return {
      state: 'expired',
      canWrite: false,
      isExploring: false,
      isExpired: true,
      isLifetime: false,
      daysLeft: 0,
      trialDay: snapshot.trialStartedAtMs ? 7 : 0,
    };
  }

  const remainingMs = expiryMs ? Math.max(0, expiryMs - nowMs) : 0;
  const daysLeft = isLifetime ? 9999 : Math.max(1, Math.ceil(remainingMs / DAY_MS));
  const trialDay =
    raw === 'trialing' && snapshot.trialStartedAtMs
      ? Math.min(7, Math.max(1, Math.floor(Math.max(0, nowMs - snapshot.trialStartedAtMs) / DAY_MS) + 1))
      : 0;

  return {
    state: raw,
    canWrite: true,
    isExploring: false,
    isExpired: false,
    isLifetime,
    daysLeft,
    trialDay,
  };
}

export function getEntitlementCacheKey(uid: string): string {
  return `${CACHE_PREFIX}${uid}`;
}

/**
 * Reads cached entitlement for instant flicker-free UI painting scoped strictly to one UID.
 */
export function readCachedEntitlement(uid: string | null | undefined): EntitlementSnapshot | null {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getEntitlementCacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EntitlementSnapshot;
    if (!parsed || parsed.uid !== uid) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists last known entitlement per UID strictly for instant reload UI painting.
 */
export function writeCachedEntitlement(uid: string, snapshot: EntitlementSnapshot): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      getEntitlementCacheKey(uid),
      JSON.stringify({ ...snapshot, uid }),
    );
  } catch {
    // Ignore storage quota or private-mode failures
  }
}

export function clearCachedEntitlement(uid: string | null | undefined): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getEntitlementCacheKey(uid));
  } catch {
    // Ignore
  }
}

export function resolveUpgradeBenefit(action: string, customBenefit?: string): string {
  if (customBenefit && customBenefit.trim()) return customBenefit.trim();
  return (
    ACTION_BENEFIT_COPY[action] ||
    'Activate your workspace to create, edit, send invoices, and publish your client portal.'
  );
}

export async function getFreshIdToken(user: User | null | undefined): Promise<string | null> {
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}
