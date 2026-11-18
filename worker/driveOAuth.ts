import { Env, ServiceAccountCredentials, VerifiedUser } from './types';
import { verifyFirebaseIdToken } from './auth';
import { parseServiceAccount, getFirestoreDoc } from './firestore';
import { getBearerToken } from './routes/subscription';

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const TOKEN_REFRESH_BUFFER_MS = 120_000;

export interface DriveOAuthClient {
  clientId: string;
  clientSecret: string;
}

export interface StoredDriveDoc {
  connected?: boolean;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
  connectedEmail?: string;
  connectedAt?: number;
  updatedAt?: number;
}

/**
 * Resolves dedicated Google Drive OAuth Web Client credentials from Worker env
 * or Firestore `system_settings/drive_config`.
 */
export async function getDriveOAuthClient(
  creds: ServiceAccountCredentials,
  env: Env
): Promise<DriveOAuthClient> {
  if (env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET) {
    return {
      clientId: env.GOOGLE_DRIVE_CLIENT_ID.trim(),
      clientSecret: env.GOOGLE_DRIVE_CLIENT_SECRET.trim(),
    };
  }
  try {
    const doc = await getFirestoreDoc(creds, 'system_settings/drive_config');
    if (doc?.clientId && doc?.clientSecret) {
      return {
        clientId: String(doc.clientId).trim(),
        clientSecret: String(doc.clientSecret).trim(),
      };
    }
  } catch {
    // Dedicated Drive OAuth config not set; Firebase session persistence will be used
  }
  return { clientId: '', clientSecret: '' };
}

/**
 * Verifies Firebase Auth Bearer token and returns service account creds + user.
 */
export async function authenticateDriveUser(
  request: Request,
  env: Env
): Promise<{ creds: ServiceAccountCredentials; user: VerifiedUser }> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    throw new Error('Missing Authorization header');
  }
  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const user = await verifyFirebaseIdToken(idToken, projectId);
  return { creds, user };
}

/**
 * Returns the Firestore private document path for a user's Google Drive credentials.
 */
export function getDriveDocPath(uid: string): string {
  return `profiles/${uid}/private/drive`;
}

/**
 * Best-effort lookup of the connected Google account email using a fresh access token.
 */
export async function fetchGoogleAccountEmail(
  accessToken: string,
  fallbackEmail?: string
): Promise<string> {
  try {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const info = (await res.json()) as { email?: string };
      if (info.email) return info.email;
    }
  } catch {
    // Non-critical metadata lookup
  }
  return fallbackEmail || '';
}
