import { User } from 'firebase/auth';
import { EntitlementSnapshot, normalizeEntitlementPayload, writeCachedEntitlement } from './accessState';

export interface ServerAccessSyncResult {
  snapshot: EntitlementSnapshot;
  clockOffsetMs: number | null;
  recurringPlansConfigured?: boolean;
}

/**
 * Fetches server-computed entitlement state from /api/me for clock-skew calibration
 * and fallback sync when Firestore onSnapshot is unavailable.
 */
export async function fetchServerEntitlement(user: User): Promise<ServerAccessSyncResult | null> {
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const serverMs = typeof data.serverNow === 'string' ? Date.parse(data.serverNow) : NaN;
    const clockOffsetMs = Number.isFinite(serverMs) ? serverMs - Date.now() : null;
    const snapshot = normalizeEntitlementPayload(data, user.uid);
    writeCachedEntitlement(user.uid, snapshot);
    return {
      snapshot,
      clockOffsetMs,
      recurringPlansConfigured:
        typeof data.recurringPlansConfigured === 'boolean' ? data.recurringPlansConfigured : undefined,
    };
  } catch {
    return null;
  }
}

export async function postActivateTrial(
  user: User,
): Promise<{ ok: true; snapshot: EntitlementSnapshot } | { ok: false; error: string }> {
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/activate-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: String(data.error || 'Could not start free trial.') };
    }
    const snapshot = normalizeEntitlementPayload(data, user.uid);
    writeCachedEntitlement(user.uid, snapshot);
    return { ok: true, snapshot };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error starting trial.',
    };
  }
}

export async function postCancelSubscription(user: User): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch('/api/cancel-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Failed to cancel subscription.');
  }
}
