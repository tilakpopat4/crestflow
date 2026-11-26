import {
  Env,
  EntitlementRecord,
  EntitlementStatus,
  ServiceAccountCredentials,
  VerifiedUser,
} from './types';
import { verifyFirebaseIdToken } from './auth';
import {
  getFirestoreDoc,
  getGoogleAccessToken,
  parseServiceAccount,
  setFirestoreDoc,
  toFirestoreValue,
} from './firestore';
import { LIFETIME_VALID_UNTIL_ISO } from '../src/shared/pricing';

const ENTITLED_STATUSES = new Set<EntitlementStatus>(['trialing', 'active', 'grace']);

/**
 * Resolves effective runtime status without depending on a cron job.
 */
export function resolveEffectiveStatus(
  entitlement: Partial<EntitlementRecord> | null | undefined,
  nowMs = Date.now()
): EntitlementStatus {
  if (!entitlement || !entitlement.status) return 'none';
  const rawStatus = entitlement.status as EntitlementStatus;
  if (rawStatus === 'none' || rawStatus === 'suspended' || rawStatus === 'expired') {
    return rawStatus;
  }
  if (!ENTITLED_STATUSES.has(rawStatus)) {
    return 'none';
  }
  const validMs = entitlement.validUntil ? new Date(entitlement.validUntil).getTime() : 0;
  if (!validMs || Number.isNaN(validMs) || validMs <= nowMs) {
    return 'expired';
  }
  return rawStatus;
}

/**
 * Checks whether an entitlement record currently grants write/action access.
 */
export function isEntitledRecord(
  entitlement: Partial<EntitlementRecord> | null | undefined,
  nowMs = Date.now()
): boolean {
  const effective = resolveEffectiveStatus(entitlement, nowMs);
  return ENTITLED_STATUSES.has(effective);
}

/**
 * Reads `entitlements/{uid}` from Firestore.
 */
export async function getEntitlementFromFirestore(
  creds: ServiceAccountCredentials,
  uid: string
): Promise<EntitlementRecord | null> {
  const doc = await getFirestoreDoc(creds, `entitlements/${uid}`);
  if (!doc) return null;
  return {
    userId: uid,
    status: doc.status || 'none',
    plan: doc.plan || 'none',
    billingCycle: doc.billingCycle,
    validUntil: doc.validUntil || null,
    graceUntil: doc.graceUntil || null,
    trialStartedAt: doc.trialStartedAt || null,
    trialUsed: Boolean(doc.trialUsed),
    cancelAtPeriodEnd: Boolean(doc.cancelAtPeriodEnd),
    razorpayCustomerId: doc.razorpayCustomerId || null,
    razorpaySubscriptionId: doc.razorpaySubscriptionId || null,
    razorpayOrderId: doc.razorpayOrderId || null,
    razorpayPaymentId: doc.razorpayPaymentId || null,
    checkoutMode: doc.checkoutMode || null,
    lastEventTimestamp: typeof doc.lastEventTimestamp === 'number' ? doc.lastEventTimestamp : undefined,
    lockTimestamp: typeof doc.lockTimestamp === 'number' ? doc.lockTimestamp : undefined,
    notifiedTrialDay5: Boolean(doc.notifiedTrialDay5),
    notifiedChargeFailed: Boolean(doc.notifiedChargeFailed),
    notifiedExpired: Boolean(doc.notifiedExpired),
    lastPaymentAt: typeof doc.lastPaymentAt === 'number' ? doc.lastPaymentAt : undefined,
    lastPaymentAmount: typeof doc.lastPaymentAmount === 'number' ? doc.lastPaymentAmount : undefined,
    lastPaymentMethod: doc.lastPaymentMethod,
    lastPaymentVpa: doc.lastPaymentVpa || null,
    welcomeEmailSent: Boolean(doc.welcomeEmailSent),
    userEmail: doc.userEmail,
    userName: doc.userName,
    updatedAt: doc.updatedAt || new Date().toISOString(),
  };
}

/**
 * Writes/merges authoritative fields on `entitlements/{uid}` with ISO timestamps.
 */
export async function writeEntitlement(
  creds: ServiceAccountCredentials,
  uid: string,
  patch: Partial<EntitlementRecord>
): Promise<void> {
  const payload: Record<string, any> = {
    userId: uid,
    ...patch,
    updatedAt: typeof patch.updatedAt === 'string' ? patch.updatedAt : new Date().toISOString(),
  };
  await setFirestoreDoc(creds, `entitlements/${uid}`, payload);
}

/**
 * Atomically claims a single-use 7-day trial across `trialClaims` (UID + email hash)
 * and sets `entitlements/{uid}` using Firestore REST `:commit`.
 */
export async function claimTrialEntitlementAtomic(params: {
  creds: ServiceAccountCredentials;
  uid: string;
  emailHash?: string;
  userEmail?: string;
  userName?: string;
  nowMs?: number;
  trialUsedExisting?: boolean;
}): Promise<
  | { ok: true; record: EntitlementRecord; code?: 'TRIAL_ALREADY_CLAIMED'; message?: string }
  | { ok: false; code: 'TRIAL_ALREADY_CLAIMED'; message: string; record?: EntitlementRecord }
> {
  const { creds, uid, emailHash, userEmail, userName, nowMs = Date.now(), trialUsedExisting } = params;
  if (trialUsedExisting) {
    return { ok: false, code: 'TRIAL_ALREADY_CLAIMED', message: 'Free trial already claimed for this account.' };
  }

  const startIso = new Date(nowMs).toISOString();
  const validUntilIso = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();
  const dbBase = `projects/${creds.project_id}/databases/(default)/documents`;
  const token = await getGoogleAccessToken(creds);

  const record: EntitlementRecord = {
    userId: uid, userEmail, userName,
    status: 'trialing', plan: 'pro_trial', billingCycle: 'trial',
    validUntil: validUntilIso, graceUntil: null, trialStartedAt: startIso,
    trialUsed: true, cancelAtPeriodEnd: false,
    razorpayCustomerId: null, razorpaySubscriptionId: null, razorpayOrderId: null, razorpayPaymentId: null, checkoutMode: null,
    updatedAt: startIso,
  };

  const toFields = (obj: Record<string, any>) => {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return fields;
  };

  const writes: any[] = [
    {
      update: {
        name: `${dbBase}/trialClaims/uid_${uid}`,
        fields: toFields({
          claimKey: `uid_${uid}`,
          type: 'uid',
          claimedByUid: uid,
          claimedAt: startIso,
        }),
      },
      currentDocument: { exists: false },
    },
  ];

  if (emailHash) {
    writes.push({
      update: {
        name: `${dbBase}/trialClaims/email_${emailHash}`,
        fields: toFields({
          claimKey: `email_${emailHash}`,
          type: 'email',
          claimedByUid: uid,
          claimedAt: startIso,
        }),
      },
      currentDocument: { exists: false },
    });
  }

  writes.push({
    update: {
      name: `${dbBase}/entitlements/${uid}`,
      fields: toFields(record),
    },
  });

  const commitUrl = `https://firestore.googleapis.com/v1/${dbBase}:commit`;
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (res.status === 409 || res.status === 400 || res.status === 412) {
    const errText = await res.text().catch(() => '');
    if (errText.includes('ALREADY_EXISTS') || errText.includes('FAILED_PRECONDITION') || res.status === 409) {
      return {
        ok: false,
        code: 'TRIAL_ALREADY_CLAIMED',
        message: 'Free trial already claimed for this Google account.',
      };
    }
    throw new Error(`Trial commit rejected (${res.status}): ${errText}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Trial transaction failed (${res.status}): ${errText}`);
  }

  return { ok: true, record };
}

/**
 * Builds a lifetime entitlement record for Admin SDK provisioning/migration.
 */
export function buildLifetimeEntitlement(uid: string, email?: string, name?: string): EntitlementRecord {
  const nowIso = new Date().toISOString();
  return {
    userId: uid,
    userEmail: email,
    userName: name,
    status: 'active',
    plan: 'lifetime',
    billingCycle: 'lifetime',
    validUntil: LIFETIME_VALID_UNTIL_ISO,
    graceUntil: null,
    trialStartedAt: null,
    trialUsed: true,
    cancelAtPeriodEnd: false,
    updatedAt: nowIso,
  };
}

export type EntitlementGateResult =
  | {
      ok: true;
      user: VerifiedUser;
      creds: ServiceAccountCredentials;
      entitlement: EntitlementRecord;
      effectiveStatus: EntitlementStatus;
      response?: Response;
    }
  | {
      ok: false;
      response: Response;
      user?: VerifiedUser;
      creds?: ServiceAccountCredentials;
      entitlement?: EntitlementRecord;
      effectiveStatus?: EntitlementStatus;
    };

function errJson(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Verifies bearer token and active entitlement for Worker endpoints.
 * Returns typed `{ code: 'ENTITLEMENT_REQUIRED' }` on missing/expired/suspended access.
 */
export async function requireEntitlement(request: Request, env: Env, nowMs = Date.now()): Promise<EntitlementGateResult> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : null;
  if (!token) return { ok: false, response: errJson({ error: 'Authentication required.' }, 401) };

  let creds: ServiceAccountCredentials;
  let user: VerifiedUser;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    user = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID || creds.project_id);
  } catch {
    return { ok: false, response: errJson({ error: 'Invalid or expired authentication token.' }, 401) };
  }

  const ent = await getEntitlementFromFirestore(creds, user.uid);
  const effectiveStatus = resolveEffectiveStatus(ent, nowMs);
  if (!ent || !ENTITLED_STATUSES.has(effectiveStatus)) {
    return {
      ok: false,
      response: errJson(
        {
          code: 'ENTITLEMENT_REQUIRED',
          status: effectiveStatus,
          error: 'An active trial or paid plan is required for this action.',
        },
        403
      ),
    };
  }

  return { ok: true, user, creds, entitlement: ent, effectiveStatus };
}
