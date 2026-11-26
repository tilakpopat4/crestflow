import { Env, ServiceAccountCredentials } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import {
  parseServiceAccount,
  getGoogleAccessToken,
  getSubscriptionFromFirestore,
  toFirestoreValue,
} from '../firestore';
import { getEntitlementFromFirestore } from '../entitlements';
import {
  normalizeGoogleEmail,
  hashIdentifier,
  markTrialLedgerUsed,
} from '../trialLedger';
import { jsonResponse, getBearerToken } from './subscription';

const OWNED_COLLECTIONS = [
  'clients',
  'workItems',
  'invoices',
  'notes',
  'reviews',
  'serviceRequests',
] as const;

/**
 * Deletes a single Firestore document by relative path (ignores 404).
 */
async function deleteFirestoreDoc(
  creds: ServiceAccountCredentials,
  token: string,
  docPath: string
): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok || res.status === 404;
}

/**
 * Deletes a Firestore document by its full REST resource name.
 */
async function deleteDocByFullName(token: string, fullName: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/${fullName}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok || res.status === 404;
}

/**
 * Queries all documents in a collection where `userId == uid` and deletes them.
 */
async function deleteOwnedCollectionDocs(
  creds: ServiceAccountCredentials,
  token: string,
  collectionId: string,
  uid: string
): Promise<number> {
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents:runQuery`;
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'userId' },
            op: 'EQUAL',
            value: { stringValue: uid },
          },
        },
        select: { fields: [{ fieldPath: '__name__' }] },
      },
    }),
  });

  if (!res.ok) return 0;

  const rows = (await res.json()) as Array<{ document?: { name?: string } }>;
  const names = rows
    .map((r) => r.document?.name)
    .filter((n): n is string => Boolean(n));

  await Promise.all(names.map((name) => deleteDocByFullName(token, name)));
  return names.length;
}

/**
 * Lists and deletes all documents inside `profiles/{uid}/private`.
 */
async function deleteProfilePrivateSubcollection(
  creds: ServiceAccountCredentials,
  token: string,
  uid: string
): Promise<number> {
  const listUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/profiles/${uid}/private`;
  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;

  const body = (await res.json()) as { documents?: Array<{ name?: string }> };
  const names = (body.documents || [])
    .map((d) => d.name)
    .filter((n): n is string => Boolean(n));

  await Promise.all(names.map((name) => deleteDocByFullName(token, name)));
  return names.length;
}

/**
 * Deletes the Firebase Auth account via Identity Toolkit Admin REST API.
 */
async function deleteFirebaseAuthAccount(
  creds: ServiceAccountCredentials,
  token: string,
  uid: string
): Promise<void> {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${creds.project_id}/accounts:delete`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ localId: uid }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (!errText.includes('USER_NOT_FOUND')) {
      throw new Error(`Failed to delete Firebase Auth account: ${res.status} ${errText}`);
    }
  }
}

/**
 * Handles POST /api/delete-account
 * Completely deletes an authenticated freelancer's workspace data, cancels any active Razorpay
 * recurring subscription, preserves anti-abuse trial ledger records, and removes their Firebase Auth account.
 */
export async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return jsonResponse({ error: 'Missing or unauthorized Authorization header' }, 401);
  }

  let body: { confirm?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  if ((body?.confirm || '').trim() !== 'DELETE') {
    return jsonResponse(
      { error: 'Explicit confirmation required. Please type DELETE to confirm account deletion.' },
      400
    );
  }

  let creds: ServiceAccountCredentials;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }

  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  let verifiedUser;
  try {
    verifiedUser = await verifyFirebaseIdToken(idToken, projectId);
  } catch (err: any) {
    return jsonResponse({ error: `Authentication failed: ${err.message}` }, 401);
  }

  const uid = verifiedUser.uid;
  const googleToken = await getGoogleAccessToken(creds);

  // 1. Inspect existing entitlement/subscription: cancel recurring Razorpay sub & preserve lifetime trialClaims
  try {
    const existingEnt = await getEntitlementFromFirestore(creds, uid).catch(() => null);
    const existingSub = await getSubscriptionFromFirestore(creds, uid).catch(() => null);
    const activeRzpSubId = existingEnt?.razorpaySubscriptionId || existingSub?.razorpaySubscriptionId;
    const activeSubStatus = existingEnt?.status || existingSub?.status || '';

    if (
      activeRzpSubId &&
      activeRzpSubId.startsWith('sub_') &&
      env.RAZORPAY_KEY_ID &&
      env.RAZORPAY_KEY_SECRET &&
      ['active', 'trialing', 'past_due', 'grace'].includes(activeSubStatus)
    ) {
      const authHeader = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
      await fetch(`https://api.razorpay.com/v1/subscriptions/${activeRzpSubId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancel_at_cycle_end: 0 }),
      }).catch(() => {});
    }

    const hadTrial = Boolean(
      existingEnt?.trialUsed ||
        existingEnt?.trialStartedAt ||
        existingSub?.trialClaimed ||
        existingSub?.hasHadTrial ||
        existingSub?.trialEndsAt
    );

    // Preserve permanent claim records across account deletion so re-signing up cannot grant another trial
    if (hadTrial) {
      const nowIso = new Date().toISOString();
      const claimUrlBase = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/trialClaims`;
      await fetch(`${claimUrlBase}/uid_${uid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            claimKey: toFirestoreValue(`uid_${uid}`),
            type: toFirestoreValue('uid'),
            claimedByUid: toFirestoreValue(uid),
            claimedAt: toFirestoreValue(nowIso),
          },
        }),
      }).catch(() => {});

      if (verifiedUser.email) {
        const normalizedEmail = normalizeGoogleEmail(verifiedUser.email);
        const emailHash = await hashIdentifier(normalizedEmail, env.TRIAL_LEDGER_PEPPER);
        await Promise.all([
          markTrialLedgerUsed(creds, emailHash, 'email', uid).catch(() => {}),
          fetch(`${claimUrlBase}/email_${emailHash}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                claimKey: toFirestoreValue(`email_${emailHash}`),
                type: toFirestoreValue('email'),
                claimedByUid: toFirestoreValue(uid),
                claimedAt: toFirestoreValue(nowIso),
              },
            }),
          }).catch(() => {}),
        ]);
      }
    }
  } catch (err) {
    console.warn('[DeleteAccount] Pre-cleanup entitlement warning:', err);
  }

  // 2. Delete all user-owned Firestore collections & profile documents
  const deletedCounts: Record<string, number> = {};
  for (const col of OWNED_COLLECTIONS) {
    deletedCounts[col] = await deleteOwnedCollectionDocs(creds, googleToken, col, uid);
  }
  deletedCounts.privateSettings = await deleteProfilePrivateSubcollection(creds, googleToken, uid);

  await Promise.all([
    deleteFirestoreDoc(creds, googleToken, `profiles/${uid}`),
    deleteFirestoreDoc(creds, googleToken, `public_profiles/${uid}`),
    deleteFirestoreDoc(creds, googleToken, `entitlements/${uid}`),
    deleteFirestoreDoc(creds, googleToken, `subscriptions/${uid}`),
  ]);

  // 3. Permanently delete the Firebase Auth account
  await deleteFirebaseAuthAccount(creds, googleToken, uid);

  return jsonResponse({
    success: true,
    uid,
    deletedCounts,
    message: 'Your account and all associated workspace data have been permanently deleted.',
  });
}
