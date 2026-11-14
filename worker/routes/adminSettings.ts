import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { jsonResponse, getBearerToken } from './subscription';
import { parseServiceAccount, setFirestoreDoc } from '../firestore';

const ALLOWED_SETTINGS = new Set(['subscriptions', 'footer_config', 'ai_config']);

/**
 * Trusted server path for writing system and global settings.
 * Verifies Firebase Auth ID token and requires admin custom claim or permanent Super Admin identity.
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

  const isSuperAdmin = (user.email || '').trim().toLowerCase() === 'tilakpopat2007@gmail.com';
  const hasAdminClaim = user.admin === true;

  if (!isSuperAdmin && !hasAdminClaim) {
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
