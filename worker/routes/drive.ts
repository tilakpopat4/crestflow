import { Env } from '../types';
import { getFirestoreDoc, setFirestoreDoc } from '../firestore';
import { requireEntitlement } from '../entitlements';
import { jsonResponse } from './subscription';
import {
  GOOGLE_TOKEN_URL,
  GOOGLE_REVOKE_URL,
  TOKEN_REFRESH_BUFFER_MS,
  StoredDriveDoc,
  getDriveOAuthClient,
  authenticateDriveUser,
  getDriveDocPath,
  fetchGoogleAccountEmail,
} from '../driveOAuth';

/**
 * Handles GET /api/drive/status
 */
export async function handleDriveStatus(request: Request, env: Env): Promise<Response> {
  try {
    const { creds, user } = await authenticateDriveUser(request, env);
    const [oauth, driveDoc] = await Promise.all([
      getDriveOAuthClient(creds, env),
      getFirestoreDoc(creds, getDriveDocPath(user.uid)) as Promise<StoredDriveDoc | null>,
    ]);

    const hasRefresh = Boolean(driveDoc?.refreshToken);
    const hasValidAccess = Boolean(
      driveDoc?.accessToken && Number(driveDoc.expiresAt || 0) > Date.now() + 60_000
    );

    return jsonResponse({
      connected: Boolean(driveDoc?.connected || hasRefresh || hasValidAccess),
      permanent: hasRefresh,
      hasActiveToken: hasRefresh || hasValidAccess,
      email: driveDoc?.connectedEmail || null,
      connectedAt: driveDoc?.connectedAt || null,
      oauthClientId: oauth.clientId || null,
      supportsOfflineRefresh: Boolean(oauth.clientId && oauth.clientSecret),
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Unauthorized' }, 401);
  }
}

/**
 * Handles POST /api/drive/session
 * Persists a Firebase Google OAuth Drive connection across tabs, reloads, and devices.
 */
export async function handleDriveSaveSession(request: Request, env: Env): Promise<Response> {
  try {
    const gate = await requireEntitlement(request, env);
    if (!gate.ok) return gate.response;
    const { creds, user } = gate;
    const body = (await request.json().catch(() => ({}))) as {
      accessToken?: string;
      expiresAt?: number;
      email?: string;
    };

    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    if (!accessToken) {
      return jsonResponse({ error: 'Missing accessToken' }, 400);
    }

    const docPath = getDriveDocPath(user.uid);
    const existing = (await getFirestoreDoc(creds, docPath)) as StoredDriveDoc | null;
    const now = Date.now();
    const expiresAt = Number(body.expiresAt) > now ? Number(body.expiresAt) : now + 55 * 60 * 1000;
    const connectedEmail =
      (typeof body.email === 'string' && body.email.trim()) ||
      existing?.connectedEmail ||
      user.email ||
      '';

    await setFirestoreDoc(creds, docPath, {
      connected: true,
      accessToken,
      expiresAt,
      connectedEmail,
      connectedAt: existing?.connectedAt || now,
      updatedAt: now,
    });

    return jsonResponse({
      success: true,
      connected: true,
      permanent: Boolean(existing?.refreshToken),
      expiresAt,
      email: connectedEmail || null,
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Unauthorized' }, 401);
  }
}

/**
 * Handles POST /api/drive/exchange
 * Exchanges a GIS authorization code (redirect_uri=postmessage) for a persistent refresh_token.
 */
export async function handleDriveExchange(request: Request, env: Env): Promise<Response> {
  try {
    const gate = await requireEntitlement(request, env);
    if (!gate.ok) return gate.response;
    const { creds, user } = gate;
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) return jsonResponse({ error: 'Missing authorization code' }, 400);

    const oauth = await getDriveOAuthClient(creds, env);
    if (!oauth.clientId || !oauth.clientSecret) {
      return jsonResponse({ error: 'Google OAuth client is not configured on the server' }, 503);
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = (await tokenRes.json().catch(() => ({}))) as Record<string, any>;
    if (!tokenRes.ok || !tokenData.access_token) {
      return jsonResponse({ error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code', code: tokenData.error || 'EXCHANGE_FAILED' }, 400);
    }

    const docPath = getDriveDocPath(user.uid);
    const existing = (await getFirestoreDoc(creds, docPath)) as StoredDriveDoc | null;
    const refreshToken = String(tokenData.refresh_token || existing?.refreshToken || '');
    const expiresAt = Date.now() + (Number(tokenData.expires_in) || 3600) * 1000;
    const connectedEmail = await fetchGoogleAccountEmail(tokenData.access_token, user.email);
    const now = Date.now();

    await setFirestoreDoc(creds, docPath, {
      connected: true, refreshToken, accessToken: tokenData.access_token, expiresAt,
      connectedEmail, connectedAt: existing?.connectedAt || now, updatedAt: now,
    });

    return jsonResponse({
      success: true, connected: true, permanent: Boolean(refreshToken),
      accessToken: tokenData.access_token, expiresAt, email: connectedEmail || null,
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Unauthorized' }, 401);
  }
}

/**
 * Handles GET /api/drive/token
 * Returns a valid Drive access token, silently refreshing via refresh_token when needed.
 */
export async function handleDriveToken(request: Request, url: URL, env: Env): Promise<Response> {
  try {
    const { creds, user } = await authenticateDriveUser(request, env);
    const docPath = getDriveDocPath(user.uid);
    const driveDoc = (await getFirestoreDoc(creds, docPath)) as StoredDriveDoc | null;

    if (!driveDoc || (!driveDoc.refreshToken && !driveDoc.accessToken)) {
      return jsonResponse({ connected: Boolean(driveDoc?.connected), accessToken: null });
    }

    const forceRefresh = url.searchParams.get('force') === '1';
    const cachedExpiresAt = Number(driveDoc.expiresAt || 0);
    if (!forceRefresh && driveDoc.accessToken && cachedExpiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
      return jsonResponse({
        connected: true,
        permanent: Boolean(driveDoc.refreshToken),
        accessToken: driveDoc.accessToken,
        expiresAt: cachedExpiresAt,
        email: driveDoc.connectedEmail || null,
      });
    }

    if (!driveDoc.refreshToken) {
      return jsonResponse({
        connected: Boolean(driveDoc.connected),
        permanent: false,
        accessToken: null,
        email: driveDoc.connectedEmail || null,
      });
    }

    const oauth = await getDriveOAuthClient(creds, env);
    if (!oauth.clientId || !oauth.clientSecret) {
      return jsonResponse({ connected: Boolean(driveDoc.connected), accessToken: null });
    }

    const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: driveDoc.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const refreshData = (await refreshRes.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!refreshRes.ok || !refreshData.access_token) {
      if (refreshData.error === 'invalid_grant') {
        await setFirestoreDoc(creds, docPath, {
          connected: false,
          refreshToken: '',
          accessToken: '',
          expiresAt: 0,
          updatedAt: Date.now(),
        });
        return jsonResponse({ connected: false, revoked: true, accessToken: null });
      }
      return jsonResponse({ connected: false, accessToken: null, error: refreshData.error || 'Refresh failed' }, 502);
    }

    const expiresAt = Date.now() + (Number(refreshData.expires_in) || 3600) * 1000;
    await setFirestoreDoc(creds, docPath, {
      connected: true,
      accessToken: refreshData.access_token,
      expiresAt,
      updatedAt: Date.now(),
    });

    return jsonResponse({
      connected: true,
      permanent: true,
      accessToken: refreshData.access_token,
      expiresAt,
      email: driveDoc.connectedEmail || null,
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Unauthorized' }, 401);
  }
}

/**
 * Handles POST /api/drive/disconnect
 */
export async function handleDriveDisconnect(request: Request, env: Env): Promise<Response> {
  try {
    const { creds, user } = await authenticateDriveUser(request, env);
    const docPath = getDriveDocPath(user.uid);
    const driveDoc = (await getFirestoreDoc(creds, docPath)) as StoredDriveDoc | null;

    const tokenToRevoke = driveDoc?.refreshToken || driveDoc?.accessToken;
    if (tokenToRevoke) {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(tokenToRevoke)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => {});
    }

    await setFirestoreDoc(creds, docPath, {
      connected: false,
      refreshToken: '',
      accessToken: '',
      expiresAt: 0,
      connectedEmail: '',
      disconnectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return jsonResponse({ success: true, connected: false });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Unauthorized' }, 401);
  }
}

/**
 * Dispatches all /api/drive/* endpoints.
 */
export async function handleDriveRoutes(request: Request, url: URL, env: Env): Promise<Response | null> {
  if (url.pathname === '/api/drive/status' && request.method === 'GET') return handleDriveStatus(request, env);
  if (url.pathname === '/api/drive/session' && request.method === 'POST') return handleDriveSaveSession(request, env);
  if (url.pathname === '/api/drive/exchange' && request.method === 'POST') return handleDriveExchange(request, env);
  if (url.pathname === '/api/drive/token' && request.method === 'GET') return handleDriveToken(request, url, env);
  if (url.pathname === '/api/drive/disconnect' && request.method === 'POST') return handleDriveDisconnect(request, env);
  return null;
}
