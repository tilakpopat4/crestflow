import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { jsonResponse, getBearerToken } from './subscription';
import { parseServiceAccount, getFirestoreDoc, setFirestoreDoc } from '../firestore';

const ALLOWED_SETTINGS = new Set(['subscriptions', 'footer_config', 'ai_config', 'pricing_config']);

/**
 * Public read endpoint for subscription wall & pricing plans configuration.
 * Reads `system_settings/pricing_config` via service account since direct client reads are blocked.
 */
export async function handleGetPricingConfig(env: Env): Promise<Response> {
  try {
    const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    const data = await getFirestoreDoc(creds, 'system_settings/pricing_config');
    return new Response(JSON.stringify({ config: data || null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return jsonResponse({ config: null, error: err?.message || 'Failed to read pricing config' }, 200);
  }
}

/**
 * Trusted server path for writing system and global settings.
 * Verifies Firebase Auth ID token and requires admin custom claim, admin_users entry, or Super Admin identity.
 * Denies direct browser/client Firestore writes to system_settings.
 */
export async function handleAdminSettings(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  let creds;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }

  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  let user;
  try {
    user = await verifyFirebaseIdToken(token, projectId);
  } catch (err: any) {
    return jsonResponse({ error: `Authentication failed: ${err.message}` }, 401);
  }

  const normalizedEmail = (user.email || '').trim().toLowerCase();
  const isSuperAdmin = normalizedEmail === 'tilakpopat2007@gmail.com';
  const hasAdminClaim = user.admin === true;
  let isDbAdmin = false;

  if (!isSuperAdmin && !hasAdminClaim && normalizedEmail) {
    try {
      const adminDoc = await getFirestoreDoc(creds, `admin_users/${encodeURIComponent(normalizedEmail)}`);
      isDbAdmin = Boolean(adminDoc);
    } catch {}
  }

  if (!isSuperAdmin && !hasAdminClaim && !isDbAdmin) {
    return jsonResponse({ error: 'Forbidden: Admin access required' }, 403);
  }

  let body: { settingId?: string; data?: any };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const { settingId, data } = body;
  if (!settingId || !ALLOWED_SETTINGS.has(settingId)) {
    return jsonResponse({ error: `Invalid settingId. Allowed: ${Array.from(ALLOWED_SETTINGS).join(', ')}` }, 400);
  }

  if (!data || typeof data !== 'object') {
    return jsonResponse({ error: 'Invalid or missing data payload' }, 400);
  }

  try {
    await setFirestoreDoc(creds, `system_settings/${settingId}`, {
      ...data,
      updatedAt: Date.now(),
      updatedBy: user.email || user.uid,
    });
    return jsonResponse({ success: true, settingId });
  } catch (err: any) {
    return jsonResponse({ error: `Failed to update ${settingId}: ${err.message}` }, 500);
  }
}
