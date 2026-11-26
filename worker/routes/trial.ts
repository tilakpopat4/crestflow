import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount, getFirestoreDoc } from '../firestore';
import {
  claimTrialEntitlementAtomic,
  getEntitlementFromFirestore,
  isEntitledRecord,
  writeEntitlement,
} from '../entitlements';
import { normalizeGoogleEmail, hashIdentifier, getTrialLedgerEntry } from '../trialLedger';
import { jsonResponse, getBearerToken } from './subscription';

/**
 * Handles POST /api/activate-trial
 *
 * - Strictly 7 days (168 hours), no card, no automatic charge, no Razorpay subscription.
 * - Verifies Firebase ID token and atomically writes `entitlements/{uid}` + `trialClaims`
 *   (keyed by UID and normalized Google email SHA-256 hash) in a single transaction.
 */
export async function handleActivateTrial(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401, request, env);
  }

  let creds;
  let verifiedUser;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
    verifiedUser = await verifyFirebaseIdToken(idToken, projectId);
  } catch {
    return jsonResponse({ error: 'Authentication failed' }, 401, request, env);
  }

  const existing = await getEntitlementFromFirestore(creds, verifiedUser.uid);

  if (existing && isEntitledRecord(existing)) {
    return jsonResponse(
      {
        error: 'You already have an active trial or plan.',
        status: existing.status,
      },
      409,
      request,
      env
    );
  }

  if (existing?.trialUsed || existing?.status === 'trialing' || Boolean(existing?.trialStartedAt)) {
    return jsonResponse(
      {
        error: 'Free trial already claimed for this account.',
        code: 'TRIAL_ALREADY_CLAIMED',
      },
      403,
      request,
      env
    );
  }

  let emailHash: string | undefined;
  if (verifiedUser.email) {
    const normalizedEmail = normalizeGoogleEmail(verifiedUser.email);
    emailHash = await hashIdentifier(normalizedEmail, env.TRIAL_LEDGER_PEPPER);

    // Check existing normalized claim & legacy trial_ledger during transition
    const [claimByEmail, legacyEntry] = await Promise.all([
      getFirestoreDoc(creds, `trialClaims/email_${emailHash}`),
      getTrialLedgerEntry(creds, emailHash).catch(() => null),
    ]);

    if (
      (claimByEmail && claimByEmail.claimedByUid !== verifiedUser.uid) ||
      (legacyEntry && legacyEntry.status === 'used' && legacyEntry.claimedByUid !== verifiedUser.uid)
    ) {
      return jsonResponse(
        {
          error: 'Free trial already claimed for this Google account. Please choose a paid plan.',
          code: 'TRIAL_ALREADY_CLAIMED',
        },
        403,
        request,
        env
      );
    }
  }

  const now = Date.now();
  if (existing?.lockTimestamp && now - existing.lockTimestamp < 10000) {
    return jsonResponse({ error: 'Trial activation in progress. Please wait a moment.' }, 429, request, env);
  }

  if (existing) {
    await writeEntitlement(creds, verifiedUser.uid, { lockTimestamp: now });
  }

  const claimRes = await claimTrialEntitlementAtomic({
    creds,
    uid: verifiedUser.uid,
    emailHash,
    userEmail: verifiedUser.email,
    userName: verifiedUser.name,
    nowMs: now,
    trialUsedExisting: Boolean(existing?.trialUsed),
  });

  if (!claimRes.ok) {
    return jsonResponse(
      {
        error: claimRes.message,
        code: claimRes.code,
      },
      403,
      request,
      env
    );
  }

  return jsonResponse(
    {
      success: true,
      status: claimRes.record.status,
      plan: claimRes.record.plan,
      trialUsed: true,
      trialStartedAt: claimRes.record.trialStartedAt,
      validUntil: claimRes.record.validUntil,
      serverNow: new Date(now).toISOString(),
      daysLeft: 7,
    },
    200,
    request,
    env
  );
}
