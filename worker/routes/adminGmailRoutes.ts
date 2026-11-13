import { Env } from '../types';
import { jsonResponse } from './subscription';
import { verifyAdminCaller } from './adminSubscriptions';
import { getGoogleAccessToken, toFirestoreValue, fromFirestoreValue } from '../firestore';
import { sendGmailDirect, GmailConfig } from '../gmail';

/**
 * Fetches Gmail configuration stored in Firestore system_settings/gmail_config or environment variables.
 */
export async function getAuthoritativeGmailConfig(creds: any, env: Env): Promise<GmailConfig> {
  const config: GmailConfig = {
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    senderEmail: env.GMAIL_USER_EMAIL || 'support.crestflow@gmail.com',
  };

  // Only query Firestore if any required credentials are not in environment secrets
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    try {
      const token = await getGoogleAccessToken(creds);
      const docUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/system_settings/gmail_config`;
      const res = await fetch(docUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = (await res.json()) as { fields?: Record<string, any> };
        const raw = data.fields || {};
        if (!config.clientId && raw.clientId?.stringValue) config.clientId = raw.clientId.stringValue;
        if (!config.clientSecret && raw.clientSecret?.stringValue) config.clientSecret = raw.clientSecret.stringValue;
        if (!config.refreshToken && raw.refreshToken?.stringValue) config.refreshToken = raw.refreshToken.stringValue;
        if (!config.senderEmail && raw.senderEmail?.stringValue) config.senderEmail = raw.senderEmail.stringValue;
      }
    } catch (err) {
      console.warn('[GmailConfig] Firestore read fallback to env:', err);
    }
  }

  return config;
}

/**
 * Handles GET /api/admin/gmail/config
 */
export async function handleGetGmailConfig(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const config = await getAuthoritativeGmailConfig(creds, env);

    const isConnected = Boolean(config.clientId && config.clientSecret && config.refreshToken);

    return jsonResponse({
      success: true,
      isConnected,
      senderEmail: config.senderEmail || 'support.crestflow@gmail.com',
      clientId: config.clientId ? `${config.clientId.slice(0, 12)}...` : null,
      hasClientSecret: Boolean(config.clientSecret),
      hasRefreshToken: Boolean(config.refreshToken),
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Unauthorized' }, 401);
  }
}

/**
 * Handles POST /api/admin/gmail/config
 * Saves Client ID, Client Secret, and Refresh Token in Firestore system_settings/gmail_config.
 */
export async function handleSaveGmailConfig(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const body = (await request.json().catch(() => ({}))) as GmailConfig;

    const token = await getGoogleAccessToken(creds);
    const docUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/system_settings/gmail_config`;

    const existing = await getAuthoritativeGmailConfig(creds, env);
    const updated = {
      clientId: body.clientId || existing.clientId || '',
      clientSecret: body.clientSecret || existing.clientSecret || '',
      refreshToken: body.refreshToken || existing.refreshToken || '',
      senderEmail: body.senderEmail || existing.senderEmail || 'support.crestflow@gmail.com',
      updatedAt: Date.now(),
    };

    const firestoreFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(updated)) {
      firestoreFields[key] = toFirestoreValue(value);
    }

    const patchRes = await fetch(`${docUrl}?updateMask.fieldPaths=clientId&updateMask.fieldPaths=clientSecret&updateMask.fieldPaths=refreshToken&updateMask.fieldPaths=senderEmail&updateMask.fieldPaths=updatedAt`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: firestoreFields }),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return jsonResponse({ error: `Firestore update failed: ${errText}` }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Direct Gmail API settings saved successfully.',
      isConnected: Boolean(updated.clientId && updated.clientSecret && updated.refreshToken),
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Unauthorized' }, 401);
  }
}

/**
 * Handles POST /api/admin/clear-email-history
 * Completely wipes out previous dummy and test dispatch records from Firestore emailJobs.
 */
export async function handleClearAdminEmailHistory(request: Request, env: Env): Promise<Response> {
  try {
    const { creds } = await verifyAdminCaller(request, env);
    const token = await getGoogleAccessToken(creds);

    const listUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/emailJobs?pageSize=300`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok) {
      return jsonResponse({ error: 'Failed to retrieve email jobs for cleanup' }, 500);
    }

    const data = (await listRes.json()) as { documents?: Array<{ name: string }> };
    const docs = data.documents || [];

    // Delete in parallel batches
    let deletedCount = 0;
    await Promise.all(
      docs.map(async (d) => {
        const delRes = await fetch(`https://firestore.googleapis.com/v1/${d.name}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (delRes.ok) deletedCount++;
      })
    );

    return jsonResponse({
      success: true,
      cleared: deletedCount,
      message: `Successfully cleared ${deletedCount} previous email records. History is now clean.`,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Unauthorized' }, 401);
  }
}

