import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { parseServiceAccount, updateSubscriptionInFirestore, getSubscriptionFromFirestore, getGoogleAccessToken, toFirestoreValue } from '../firestore';
import { jsonResponse, getBearerToken } from './subscription';

const SUPER_ADMIN_EMAIL = 'tilakpopat2007@gmail.com';

async function verifyAdminCaller(request: Request, env: Env) {
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

async function updateProfileDoc(creds: any, userId: string, fields: Record<string, any>) {
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
    console.warn('[adminSubscriptions] Profile doc update warning:', err);
  }
}

export async function handleAdminGrantSubscription(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const body = (await request.json().catch(() => ({}))) as any;
    const { userId, days = 30 } = body;
    if (!userId) return jsonResponse({ error: 'Missing userId parameter' }, 400);

    const now = Date.now();
    const existing = await getSubscriptionFromFirestore(creds, userId).catch(() => null);
    const currentEnd = existing?.accessUntil ? new Date(existing.accessUntil).getTime() : 0;
    const base = currentEnd > now ? currentEnd : now;
    const newEndMs = base + Number(days) * 24 * 60 * 60 * 1000;
    const accessUntil = new Date(newEndMs).toISOString();

    // 1. Authoritative subscription write with full Service Account privileges
    await updateSubscriptionInFirestore(creds, userId, {
      userId,
      status: 'active',
      plan: 'pro',
      billingCycle: 'monthly',
      accessUntil,
      currentPeriodStart: now,
      currentPeriodEnd: newEndMs,
      cancelAtPeriodEnd: false,
      hasHadSubscription: true,
      updatedAt: now,
    });

    // 2. Mirror status to profiles document for admin UI listing
    await updateProfileDoc(creds, userId, {
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro',
      currentPeriodEnd: newEndMs,
      updatedAt: now,
    });

    return jsonResponse({ success: true, userId, status: 'active', accessUntil, currentPeriodEnd: newEndMs });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Failed to grant subscription' }, 403);
  }
}

export async function handleAdminRevokeSubscription(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const body = (await request.json().catch(() => ({}))) as any;
    const { userId } = body;
    if (!userId) return jsonResponse({ error: 'Missing userId parameter' }, 400);

    const now = Date.now();
    const accessUntil = new Date(now).toISOString();

    await updateSubscriptionInFirestore(creds, userId, {
      userId,
      status: 'expired',
      accessUntil,
      cancelAtPeriodEnd: false,
      updatedAt: now,
    });

    await updateProfileDoc(creds, userId, {
      subscriptionStatus: 'expired',
      currentPeriodEnd: now,
      updatedAt: now,
    });

    return jsonResponse({ success: true, userId, status: 'expired' });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Failed to revoke subscription' }, 403);
  }
}
