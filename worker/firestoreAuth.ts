import { ServiceAccountCredentials } from './types';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(data: Uint8Array | string): string {
  const binary =
    typeof data === 'string'
      ? data
      : String.fromCharCode.apply(null, Array.from(data));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): Uint8Array {
  const cleanPem = pem
    .replace(/-----BEGIN[ A-Z_-]+-----/g, '')
    .replace(/-----END[ A-Z_-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(cleanPem);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses and validates the service account credentials from worker secrets.
 */
export function parseServiceAccount(rawJson?: string): ServiceAccountCredentials {
  if (!rawJson || rawJson === 'undefined' || typeof rawJson !== 'string' || !rawJson.trim()) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT secret is missing or empty in the Cloudflare Worker environment. Please configure it using `npx wrangler secret put FIREBASE_SERVICE_ACCOUNT`.'
    );
  }
  try {
    const creds = JSON.parse(rawJson);
    if (!creds.client_email || !creds.private_key || !creds.project_id) {
      throw new Error('Service account missing required fields (client_email, private_key, project_id)');
    }
    return creds;
  } catch (err: any) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT secret: ${err.message}`);
  }
}

/**
 * Generates an OAuth2 access token for Google Cloud Firestore REST API using Web Crypto.
 */
export async function getGoogleAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 300) {
    return cachedAccessToken.token;
  }

  // 1. Construct JWT Header and Claims
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const stringToSign = `${encodedHeader}.${encodedPayload}`;

  // 2. Import PKCS#8 private key and sign with RSASSA-PKCS1-v1_5
  const derKey = pemToDer(creds.private_key);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    derKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(stringToSign)
  );

  const signedJwt = `${stringToSign}.${base64UrlEncode(new Uint8Array(signature))}`;

  // 3. Exchange JWT assertion for OAuth2 token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`OAuth2 token exchange failed: ${tokenRes.status} ${errorText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600),
  };

  return cachedAccessToken.token;
}
