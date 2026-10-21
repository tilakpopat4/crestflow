import { ServiceAccountCredentials, SubscriptionRecord } from './types';

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
export function parseServiceAccount(rawJson: string): ServiceAccountCredentials {
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
async function getGoogleAccessToken(creds: ServiceAccountCredentials): Promise<string> {
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

// Helpers to serialize JS values to Firestore Value objects
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

/**
 * Gets a user's subscription record from Firestore `subscriptions/{userId}`.
 */
export async function getSubscriptionFromFirestore(
  creds: ServiceAccountCredentials,
  userId: string
): Promise<SubscriptionRecord | null> {
  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/subscriptions/${userId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to read subscription: ${res.status} ${text}`);
  }

  const docData = (await res.json()) as { fields?: Record<string, any> };
  if (!docData.fields) return null;

  const result: any = { userId };
  for (const [k, v] of Object.entries(docData.fields)) {
    result[k] = fromFirestoreValue(v);
  }
  return result as SubscriptionRecord;
}

/**
 * Updates or creates a user's subscription record in Firestore `subscriptions/{userId}`.
 */
export async function updateSubscriptionInFirestore(
  creds: ServiceAccountCredentials,
  userId: string,
  record: Partial<SubscriptionRecord>
): Promise<void> {
  const token = await getGoogleAccessToken(creds);
  const fieldPaths: string[] = [];
  const fields: Record<string, any> = {};

  for (const [key, value] of Object.entries(record)) {
    fieldPaths.push(key);
    fields[key] = toFirestoreValue(value);
  }

  const updateMask = fieldPaths.map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/subscriptions/${userId}?${updateMask}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to write subscription to Firestore: ${res.status} ${text}`);
  }
}

/**
 * Checks if a webhook event ID was already processed (deduplication).
 */
export async function isEventProcessed(
  creds: ServiceAccountCredentials,
  eventId: string
): Promise<boolean> {
  const token = await getGoogleAccessToken(creds);
  const cleanId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/processed_events/${cleanId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.status === 200;
}

/**
 * Marks a webhook event ID as processed in Firestore.
 */
export async function markEventProcessed(
  creds: ServiceAccountCredentials,
  eventId: string
): Promise<void> {
  const token = await getGoogleAccessToken(creds);
  const cleanId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/processed_events/${cleanId}`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        processedAt: toFirestoreValue(Date.now()),
      },
    }),
  });
}
