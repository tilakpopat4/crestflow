import { ServiceAccountCredentials, TrialLedgerEntry } from './types';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

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

function base64UrlEncode(data: Uint8Array | string): string {
  const binary =
    typeof data === 'string'
      ? data
      : String.fromCharCode.apply(null, Array.from(data));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getGoogleAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 300) {
    return cachedAccessToken.token;
  }

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

/**
 * Normalises Google email address by trimming, lowercasing, and stripping dots and +subaddressing tags.
 */
export function normalizeGoogleEmail(email: string): string {
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return trimmed;

  const [localPart, domain] = parts;
  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';

  if (isGmail) {
    // Strip everything after '+'
    const baseLocal = localPart.split('+')[0];
    // Strip all dots
    const cleanLocal = baseLocal.replace(/\./g, '');
    return `${cleanLocal}@gmail.com`;
  }

  // Generic domains: strip subaddress tags
  const cleanLocal = localPart.split('+')[0];
  return `${cleanLocal}@${domain}`;
}

/**
 * Normalises a UPI VPA (e.g. 'user@okaxis').
 */
export function normalizeUpiVpa(vpa: string): string {
  return vpa.toLowerCase().trim();
}

/**
 * Computes salted SHA-256 hash using the Worker secret pepper.
 */
export async function hashIdentifier(
  identifier: string,
  pepper = 'crestflow_default_trial_pepper'
): Promise<string> {
  const text = `${pepper}:${identifier}`;
  const data = new TextEncoder().encode(text);
  const digestBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digestBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Reads a trial ledger entry from Firestore `trial_ledger/{hash}`.
 */
export async function getTrialLedgerEntry(
  creds: ServiceAccountCredentials,
  hash: string
): Promise<TrialLedgerEntry | null> {
  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/trial_ledger/${hash}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to read trial ledger: ${res.status} ${text}`);
  }

  const docData = (await res.json()) as { fields?: Record<string, any> };
  if (!docData.fields) return null;

  const f = docData.fields;
  return {
    hash,
    type: f.type?.stringValue || 'email',
    status: f.status?.stringValue || 'reserved',
    claimedByUid: f.claimedByUid?.stringValue || '',
    reservedAt: parseInt(f.reservedAt?.integerValue || '0', 10),
    expiresAt: f.expiresAt ? parseInt(f.expiresAt.integerValue || '0', 10) : undefined,
    usedAt: f.usedAt ? parseInt(f.usedAt.integerValue || '0', 10) : undefined,
    subscriptionId: f.subscriptionId?.stringValue,
  };
}

/**
 * Reserves an entry in `trial_ledger/{hash}` for 30 minutes.
 * Releases expired unpaid reservations automatically.
 */
export async function reserveTrialLedgerEntry(
  creds: ServiceAccountCredentials,
  hash: string,
  type: 'email' | 'vpa',
  uid: string,
  subscriptionId?: string
): Promise<{ success: boolean; reason?: string }> {
  const existing = await getTrialLedgerEntry(creds, hash);
  const now = Date.now();

  if (existing) {
    // 1. If already confirmed & used -> Deny trial
    if (existing.status === 'used') {
      return {
        success: false,
        reason: 'Free trial already claimed for this Google account or payment method.',
      };
    }

    // 2. If reserved: check 30-minute expiry window
    if (existing.status === 'reserved') {
      const isExpired = existing.expiresAt ? existing.expiresAt < now : false;

      if (!isExpired) {
        // Active reservation: allow if same user (idempotent), block if different user (double-click/race)
        if (existing.claimedByUid !== uid) {
          return {
            success: false,
            reason: 'Trial reservation already in progress by another account.',
          };
        }
      }
      // If expired (>30 minutes unpaid), proceed to overwrite and re-reserve
    }
  }

  // 3. Write reservation with 30-minute expiration
  const token = await getGoogleAccessToken(creds);
  const expiresAt = now + 30 * 60 * 1000; // 30 minutes
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/trial_ledger/${hash}`;

  const fields: Record<string, any> = {
    hash: { stringValue: hash },
    type: { stringValue: type },
    status: { stringValue: 'reserved' },
    claimedByUid: { stringValue: uid },
    reservedAt: { integerValue: String(now) },
    expiresAt: { integerValue: String(expiresAt) },
  };

  if (subscriptionId) {
    fields.subscriptionId = { stringValue: subscriptionId };
  }

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
    throw new Error(`Failed to write trial ledger reservation: ${res.status} ${text}`);
  }

  return { success: true };
}

/**
 * Marks a trial ledger entry as permanently 'used' upon payment confirmation.
 * Returns alreadyUsedByOther: true if another user already claimed this hash.
 */
export async function markTrialLedgerUsed(
  creds: ServiceAccountCredentials,
  hash: string,
  type: 'email' | 'vpa',
  uid: string,
  subscriptionId?: string
): Promise<{ success: boolean; alreadyUsedByOther?: boolean }> {
  const existing = await getTrialLedgerEntry(creds, hash);
  const now = Date.now();

  if (existing && existing.status === 'used' && existing.claimedByUid !== uid) {
    return { success: false, alreadyUsedByOther: true };
  }

  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/trial_ledger/${hash}`;

  const fields: Record<string, any> = {
    hash: { stringValue: hash },
    type: { stringValue: type },
    status: { stringValue: 'used' },
    claimedByUid: { stringValue: uid },
    usedAt: { integerValue: String(now) },
  };

  if (subscriptionId) {
    fields.subscriptionId = { stringValue: subscriptionId };
  }

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
    throw new Error(`Failed to mark trial ledger entry as used: ${res.status} ${text}`);
  }

  return { success: true, alreadyUsedByOther: false };
}
