import { normalizeEntitlementPayload, resolveAccessFromSnapshot } from './accessState';

export interface ComputeAccessInput {
  entitlementDoc?: Record<string, unknown> | null;
  serverNow?: string | number | null;
  clientNowMs?: number;
}

/**
 * Pure deterministic entitlement resolver delegating directly to resolveAccessFromSnapshot.
 */
export function computeEntitlementAccess(input: ComputeAccessInput) {
  const serverMs = input.serverNow
    ? typeof input.serverNow === 'number'
      ? input.serverNow
      : Date.parse(input.serverNow)
    : Date.now();
  const effectiveNow = Number.isFinite(serverMs) ? serverMs : input.clientNowMs || Date.now();
  const snap = normalizeEntitlementPayload(input.entitlementDoc || null);
  return {
    ...resolveAccessFromSnapshot(snap, effectiveNow),
    trialUsed: snap.trialUsed,
    plan: snap.plan,
    validUntilMs: snap.validUntilMs,
    graceUntilMs: snap.graceUntilMs,
    cancelAtPeriodEnd: snap.cancelAtPeriodEnd,
  };
}

/**
 * Legacy helper retained for backward-compatible unit test imports.
 */
export function computeSubscriptionAccess(params: {
  subscriptionDoc?: Record<string, unknown> | null;
  serverMe?: { serverNow?: string; status?: string; accessUntil?: string | null; trialEndsAt?: string | null } | null;
  clientNowMs?: number;
}) {
  const mergedRaw = params.subscriptionDoc || (params.serverMe
    ? {
        status: params.serverMe.status || 'none',
        validUntil: params.serverMe.accessUntil || params.serverMe.trialEndsAt || null,
      }
    : null);
  return computeEntitlementAccess({
    entitlementDoc: mergedRaw,
    serverNow: params.serverMe?.serverNow,
    clientNowMs: params.clientNowMs,
  });
}
