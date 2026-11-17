import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import {
  parseServiceAccount,
  getSubscriptionFromFirestore,
  updateSubscriptionInFirestore,
} from '../firestore';
import {
  normalizeGoogleEmail,
  hashIdentifier,
  getTrialLedgerEntry,
  markTrialLedgerUsed,
} from '../trialLedger';
import { jsonResponse, getBearerToken } from './subscription';

/**
 * Handles POST /api/activate-trial
 * 
 * Strict CrestFlow Subscription Policy:
 * - Exactly 7 days (168 hours) free trial
 * - ₹0 cost, NO payment method required, NO Razorpay interaction
 * - Exactly ONE lifetime trial per Firebase UID and per Google account
 * - Expiration retains all user records untouched and transitions to paid plans
 */
export async function handleActivateTrial(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);

  // 1. Check existing subscription record in Firestore
  const existing = await getSubscriptionFromFirestore(creds, verifiedUser.uid);

  // Lifetime trial check by UID
  const hasAlreadyClaimedTrial = Boolean(
    existing &&
      (existing.trialClaimed === true ||
        existing.status === 'trialing' ||
        Boolean(existing.trialEndsAt) ||
        existing.hasHadTrial === true)
  );

  if (hasAlreadyClaimedTrial) {
    return jsonResponse(
      {
        error: 'Free trial already claimed for this account. One free trial per account lifetime.',
        code: 'TRIAL_ALREADY_CLAIMED',
      },
      403
    );
  }

  // Active paid subscription check
  if (existing && (existing.status === 'active' || (existing as any).hasAccess)) {
    return jsonResponse(
      {
        error: 'User already has an active subscription.',
        status: existing.status,
      },
      409
    );
  }

  // 2. Anti-abuse email hash ledger check
  let emailHash = '';
  if (verifiedUser.email) {
    const normalizedEmail = normalizeGoogleEmail(verifiedUser.email);
    emailHash = await hashIdentifier(normalizedEmail, env.TRIAL_LEDGER_PEPPER);

    const ledgerEntry = await getTrialLedgerEntry(creds, emailHash);
    if (ledgerEntry && ledgerEntry.status === 'used' && ledgerEntry.claimedByUid !== verifiedUser.uid) {
      return jsonResponse(
        {
          error: 'Free trial already claimed for this Google account. Please choose a paid plan.',
          code: 'EMAIL_TRIAL_ALREADY_USED',
        },
        403
      );
    }
  }

  // 3. Concurrency lock to prevent simultaneous duplicate requests
  if (existing?.lockTimestamp && Date.now() - existing.lockTimestamp < 10000) {
    return jsonResponse(
      { error: 'Trial activation in progress. Please wait a moment.' },
      429
    );
  }

  // Set acquisition lock
  const now = Date.now();
  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    lockTimestamp: now,
  });

  // 4. Activate 7-day (168-hour) Pro Trial
  const durationMs = 7 * 24 * 60 * 60 * 1000;
  const endTimestamp = now + durationMs;
  const accessUntilIso = new Date(endTimestamp).toISOString();

  await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
    userId: verifiedUser.uid,
    userEmail: verifiedUser.email,
    userName: verifiedUser.name,
    plan: 'pro' as any,
    billingCycle: 'trial' as any,
    status: 'trialing',
    trialClaimed: true,
    trialClaimedAt: now,
    trialStartedAt: now,
    trialEndsAt: accessUntilIso,
    accessUntil: accessUntilIso,
    hasHadTrial: true,
    hasHadSubscription: true,
    cancelAtPeriodEnd: false,
    lockTimestamp: 0,
    updatedAt: now,
  });

  // 5. Mark email in trial ledger as permanently used
  if (emailHash) {
    await markTrialLedgerUsed(creds, emailHash, 'email', verifiedUser.uid);
  }

  return jsonResponse({
    success: true,
    status: 'trialing',
    plan: 'pro',
    trialClaimed: true,
    trialStartedAt: now,
    trialEndsAt: accessUntilIso,
    accessUntil: accessUntilIso,
    serverNow: new Date(now).toISOString(),
    daysRemaining: 7,
  });
}
