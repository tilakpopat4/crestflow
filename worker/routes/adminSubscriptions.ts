import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount, getGoogleAccessToken, toFirestoreValue } from '../firestore';
import {
  buildLifetimeEntitlement,
  getEntitlementFromFirestore,
  writeEntitlement,
} from '../entitlements';
import { jsonResponse, getBearerToken } from './subscription';

const SUPER_ADMIN_EMAIL = 'tilakpopat2007@gmail.com';

export async function verifyAdminCaller(request: Request, env: Env) {
  const idToken = getBearerToken(request);
  if (!idToken) throw new Error('Missing Authorization header');
  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);
  const callerEmail = (verifiedUser.email || '').trim().toLowerCase();

  let isAuthorized = callerEmail === SUPER_ADMIN_EMAIL;
  if (!isAuthorized) {
    try {
      const token = await getGoogleAccessToken(creds);
      const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/admin_users/${encodeURIComponent(callerEmail)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      isAuthorized = res.status === 200;
    } catch {
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    throw new Error('Unauthorized: Admin access required');
  }
  return { verifiedUser, creds };
}

async function updateProfileMirror(creds: any, userId: string, fields: Record<string, any>) {
  try {
    const token = await getGoogleAccessToken(creds);
    const fieldPaths = Object.keys(fields);
    const firestoreFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      firestoreFields[k] = toFirestoreValue(v);
    }
    const updateMask = fieldPaths.map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/profiles/${userId}?${updateMask}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: firestoreFields }),
    });
  } catch (err) {
    console.warn('[adminSubscriptions] Profile mirror warning:', err);
  }
}

export async function handleAdminGrantSubscription(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const body = (await request.json().catch(() => ({}))) as any;
    const { userId, days = 30, lifetime = false } = body;
    if (!userId) return jsonResponse({ error: 'Missing userId parameter' }, 400, request, env);

    const now = Date.now();
    const existing = await getEntitlementFromFirestore(creds, userId).catch(() => null);

    if (lifetime === true) {
      const rec = buildLifetimeEntitlement(userId, existing?.userEmail, existing?.userName);
      await writeEntitlement(creds, userId, rec);
      await updateProfileMirror(creds, userId, {
        subscriptionStatus: 'active',
        subscriptionPlan: 'lifetime',
        updatedAt: now,
      });
      return jsonResponse({ success: true, userId, status: 'active', plan: 'lifetime', validUntil: rec.validUntil }, 200, request, env);
    }

    const currentEnd = existing?.validUntil ? new Date(existing.validUntil).getTime() : 0;
    const base = currentEnd > now ? currentEnd : now;
    const newEndMs = base + Number(days) * 86400 * 1000;
    const validUntil = new Date(newEndMs).toISOString();

    await writeEntitlement(creds, userId, {
      userId,
      status: 'active',
      plan: 'pro_monthly',
      billingCycle: 'monthly',
      validUntil,
      graceUntil: null,
      cancelAtPeriodEnd: false,
      trialUsed: Boolean(existing?.trialUsed),
      updatedAt: new Date(now).toISOString(),
    });

    await updateProfileMirror(creds, userId, {
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro_monthly',
      currentPeriodEnd: newEndMs,
      updatedAt: now,
    });

    return jsonResponse({ success: true, userId, status: 'active', validUntil }, 200, request, env);
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Failed to grant entitlement' }, 403, request, env);
  }
}

export async function handleAdminRevokeSubscription(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const body = (await request.json().catch(() => ({}))) as any;
    const { userId, suspend = false } = body;
    if (!userId) return jsonResponse({ error: 'Missing userId parameter' }, 400, request, env);

    const now = Date.now();
    const validUntil = new Date(now - 1000).toISOString();
    const nextStatus = suspend ? 'suspended' : 'expired';

    await writeEntitlement(creds, userId, {
      userId,
      status: nextStatus,
      validUntil,
      graceUntil: null,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(now).toISOString(),
    });

    await updateProfileMirror(creds, userId, {
      subscriptionStatus: nextStatus,
      currentPeriodEnd: now,
      updatedAt: now,
    });

    return jsonResponse({ success: true, userId, status: nextStatus }, 200, request, env);
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Failed to revoke entitlement' }, 403, request, env);
  }
}
