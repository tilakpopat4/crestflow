import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import {
  DEFAULT_TOKEN_TTL_MS,
  readDriveCache,
  writeDriveCache,
  clearDriveCache,
  setDriveAccessToken,
  getDriveAccessToken,
  hasPersistedDriveConnection,
} from './driveStorage';
import { requestGisDriveAuthCode } from './driveGis';

export {
  setDriveAccessToken,
  getDriveAccessToken,
  hasPersistedDriveConnection,
  clearDriveCache,
};

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface DriveConnectionStatus {
  connected: boolean;
  permanent: boolean;
  email: string | null;
  oauthClientId: string | null;
  supportsOfflineRefresh: boolean;
}

let lastServerStatus: DriveConnectionStatus | null = null;

/**
 * Returns the Firebase ID token header for authenticated /api/drive/* requests.
 */
async function getAuthHeader(): Promise<Record<string, string> | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const idToken = await user.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  } catch {
    return null;
  }
}

/**
 * Queries GET /api/drive/status and synchronizes local connection state with Firestore.
 */
export async function checkDriveConnectionStatus(): Promise<DriveConnectionStatus> {
  const headers = await getAuthHeader();
  const local = readDriveCache();

  if (!headers) {
    return {
      connected: Boolean(local?.connected),
      permanent: Boolean(local?.permanent),
      email: local?.email || null,
      oauthClientId: null,
      supportsOfflineRefresh: false,
    };
  }

  try {
    const res = await fetch('/api/drive/status', { headers });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = (await res.json()) as Partial<DriveConnectionStatus>;
    const status: DriveConnectionStatus = {
      connected: Boolean(data.connected || local?.connected),
      permanent: Boolean(data.permanent),
      email: data.email || local?.email || auth.currentUser?.email || null,
      oauthClientId: data.oauthClientId || null,
      supportsOfflineRefresh: Boolean(data.supportsOfflineRefresh),
    };
    lastServerStatus = status;

    if (data.connected) {
      writeDriveCache({
        token: local?.token || null,
        expiresAt: local?.expiresAt || 0,
        connected: true,
        permanent: Boolean(data.permanent || local?.permanent),
        email: status.email,
      });
    }
    return status;
  } catch {
    return {
      connected: Boolean(local?.connected),
      permanent: Boolean(local?.permanent),
      email: local?.email || null,
      oauthClientId: lastServerStatus?.oauthClientId || null,
      supportsOfflineRefresh: Boolean(lastServerStatus?.supportsOfflineRefresh),
    };
  }
}

/**
 * Fetches a valid Drive access token silently from GET /api/drive/token.
 */
export async function fetchServerDriveToken(forceRefresh = false): Promise<string | null> {
  const headers = await getAuthHeader();
  if (!headers) return null;

  try {
    const url = forceRefresh ? '/api/drive/token?force=1' : '/api/drive/token';
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      permanent?: boolean;
      revoked?: boolean;
      accessToken?: string | null;
      expiresAt?: number;
      email?: string | null;
    };

    if (data.revoked) {
      clearDriveCache();
      lastServerStatus = null;
      return null;
    }

    if (data.accessToken) {
      setDriveAccessToken(data.accessToken, data.expiresAt, data.email, Boolean(data.permanent));
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Best-effort sync of a Firebase Google OAuth Drive token to Firestore for cross-tab persistence.
 */
async function saveDriveSessionToServer(
  accessToken: string,
  expiresAt: number,
  email: string | null
): Promise<void> {
  const headers = await getAuthHeader();
  if (!headers) return;
  try {
    await fetch('/api/drive/session', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, expiresAt, email }),
    });
  } catch {
    // Local persistence still works even if network sync fails
  }
}

/**
 * Disconnects Google Drive both on the server and locally.
 */
export async function disconnectGoogleDrive(): Promise<void> {
  const headers = await getAuthHeader();
  if (headers) {
    await fetch('/api/drive/disconnect', { method: 'POST', headers }).catch(() => {});
  }
  lastServerStatus = null;
  clearDriveCache();
}

/**
 * Requests a permanent offline Google Drive authorization code via GIS and exchanges it on the Worker.
 */
async function requestDriveOfflineCode(clientId: string, hintEmail?: string | null): Promise<string> {
  const code = await requestGisDriveAuthCode(clientId, hintEmail);
  const headers = await getAuthHeader();
  if (!headers) throw new Error('Please sign in to connect Google Drive.');

  const exchangeRes = await fetch('/api/drive/exchange', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const data = (await exchangeRes.json().catch(() => ({}))) as {
    accessToken?: string;
    expiresAt?: number;
    email?: string | null;
    permanent?: boolean;
    error?: string;
  };

  if (!exchangeRes.ok || !data.accessToken) {
    throw Object.assign(new Error(data.error || 'Failed to save Google Drive connection'), {
      fallbackAllowed: true,
    });
  }

  setDriveAccessToken(data.accessToken, data.expiresAt, data.email, Boolean(data.permanent));
  return data.accessToken;
}

/**
 * Authorizes Google Drive via Firebase GoogleAuthProvider (drive.file scope only, with login_hint).
 */
async function requestDriveFirebaseToken(): Promise<string> {
  try {
    const driveProvider = new GoogleAuthProvider();
    driveProvider.addScope(DRIVE_FILE_SCOPE);
    const hintEmail = readDriveCache()?.email || auth.currentUser?.email;
    if (hintEmail) {
      driveProvider.setCustomParameters({ login_hint: hintEmail });
    }

    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error('Google OAuth sign-in did not return an access token for Google Drive. Please try again.');
    }

    const expiresAt = Date.now() + DEFAULT_TOKEN_TTL_MS;
    const email = result.user?.email || hintEmail || null;
    setDriveAccessToken(token, expiresAt, email, false);
    void saveDriveSessionToServer(token, expiresAt, email);
    return token;
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup')) {
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      throw new Error(
        isIframe
          ? 'Google OAuth popup was blocked because this app is running in an embedded preview iframe. Please open the app in a new browser tab to connect Google Drive.'
          : 'Google OAuth popup was blocked by your browser. Please allow popups for this site (look for the popup-blocked icon in your browser address bar) and try again.'
      );
    }
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      throw new Error('Google sign-in popup was closed before completion. Please try again.');
    }
    throw err;
  }
}

/**
 * Ensures a valid Google Drive access token is available, preferring cached and silent backend refresh.
 */
export async function acquireDriveAccessToken(forcePrompt = false): Promise<string> {
  if (!forcePrompt) {
    const localToken = getDriveAccessToken();
    if (localToken) return localToken;

    const serverToken = await fetchServerDriveToken(false);
    if (serverToken) return serverToken;
  }

  const status = lastServerStatus || (await checkDriveConnectionStatus());
  if (status.supportsOfflineRefresh && status.oauthClientId) {
    try {
      return await requestDriveOfflineCode(status.oauthClientId, status.email || auth.currentUser?.email);
    } catch (err: any) {
      if (!err?.fallbackAllowed) throw err;
      console.warn('[DriveAuth] Falling back to Firebase Drive authorization:', err?.message);
    }
  }

  return await requestDriveFirebaseToken();
}
