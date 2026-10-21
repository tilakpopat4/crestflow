import { VerifiedUser } from './types';

interface JwkKey {
  kty: string;
  alg: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

interface JwksResponse {
  keys: JwkKey[];
}

let cachedJwks: { keys: JwkKey[]; expiresAt: number } | null = null;

function base64UrlDecode(str: string): Uint8Array {
  // Convert from base64url to standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeToString(str: string): string {
  const bytes = base64UrlDecode(str);
  return new TextDecoder().decode(bytes);
}

/**
 * Fetches Google's public JWK keys for Firebase Auth ID token verification.
 * Keys are cached in memory for up to 1 hour.
 */
async function getGoogleJwks(): Promise<JwkKey[]> {
  const now = Date.now();
  if (cachedJwks && cachedJwks.expiresAt > now) {
    return cachedJwks.keys;
  }

  const res = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Google public keys: ${res.status}`);
  }

  const data = (await res.json()) as JwksResponse;
  cachedJwks = {
    keys: data.keys || [],
    expiresAt: now + 60 * 60 * 1000, // 1 hour TTL
  };
  return cachedJwks.keys;
}

/**
 * Verifies a Firebase Auth ID token against Google's public keys.
 * Validates cryptographic signature, project ID audience, expiration, and issuer.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  expectedProjectId: string
): Promise<VerifiedUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Decode header and payload
  let header: { alg: string; kid: string };
  let payload: {
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    sub: string;
    email?: string;
    name?: string;
  };

  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64));
    payload = JSON.parse(base64UrlDecodeToString(payloadB64));
  } catch {
    throw new Error('Failed to parse JWT header or payload');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing kid header');
  }

  // 2. Fetch matching public key from Google
  const jwks = await getGoogleJwks();
  const matchingKey = jwks.find((k) => k.kid === header.kid);
  if (!matchingKey) {
    throw new Error('No matching Google public key found for token kid');
  }

  // 3. Import public key and verify RS256 signature using Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: matchingKey.kty,
      alg: 'RS256',
      n: matchingKey.n,
      e: matchingKey.e,
      ext: true,
    },
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    signedData
  );

  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  // 4. Validate claims
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (payload.exp <= nowSeconds) {
    throw new Error('Firebase ID token has expired');
  }

  if (payload.iat > nowSeconds + 300) {
    throw new Error('Firebase ID token issued in the future');
  }

  if (payload.aud !== expectedProjectId) {
    throw new Error(
      `Invalid audience: expected ${expectedProjectId}, received ${payload.aud}`
    );
  }

  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(
      `Invalid issuer: expected ${expectedIssuer}, received ${payload.iss}`
    );
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Invalid token subject UID');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}
