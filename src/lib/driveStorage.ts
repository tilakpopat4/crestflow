import { auth } from '../firebase';

const LEGACY_SESSION_KEY = 'crestflow_drive_token';
const LOCAL_STORAGE_PREFIX = 'crestflow_drive_conn_';
export const DEFAULT_TOKEN_TTL_MS = 55 * 60 * 1000;
const EXPIRY_BUFFER_MS = 60 * 1000;

export interface DriveConnectionCache {
  token: string | null;
  expiresAt: number;
  connected: boolean;
  permanent: boolean;
  email: string | null;
}

let memoryCacheUid: string | null = null;
let memoryCache: DriveConnectionCache | null = null;

/**
 * Returns the UID-scoped localStorage key for the active user's Drive connection.
 */
function getStorageKey(): string {
  const uid = auth.currentUser?.uid || 'default';
  return `${LOCAL_STORAGE_PREFIX}${uid}`;
}

/**
 * Reads the persisted Drive connection record from memory or localStorage.
 */
export function readDriveCache(): DriveConnectionCache | null {
  const uid = auth.currentUser?.uid || 'default';
  if (memoryCache && memoryCacheUid === uid) {
    return memoryCache;
  }
  if (typeof window === 'undefined') return null;

  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DriveConnectionCache>;
    memoryCacheUid = uid;
    memoryCache = {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      expiresAt: Number(parsed.expiresAt) || 0,
      connected: Boolean(parsed.connected),
      permanent: Boolean(parsed.permanent),
      email: typeof parsed.email === 'string' ? parsed.email : null,
    };
    return memoryCache;
  } catch {
    return null;
  }
}

/**
 * Persists Drive connection metadata and token to memory and UID-scoped localStorage.
 */
export function writeDriveCache(next: DriveConnectionCache): void {
  const uid = auth.currentUser?.uid || 'default';
  memoryCacheUid = uid;
  memoryCache = next;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Clears the cached Drive connection for the active user.
 */
export function clearDriveCache(): void {
  memoryCache = null;
  memoryCacheUid = null;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    localStorage.removeItem(getStorageKey());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Stores or clears the active Drive OAuth access token with expiry metadata.
 */
export function setDriveAccessToken(
  token: string | null,
  expiresAt?: number,
  email?: string | null,
  permanent?: boolean
): void {
  if (!token) {
    clearDriveCache();
    return;
  }
  const existing = readDriveCache();
  writeDriveCache({
    token,
    expiresAt: expiresAt && expiresAt > Date.now() ? expiresAt : Date.now() + DEFAULT_TOKEN_TTL_MS,
    connected: true,
    permanent: permanent ?? existing?.permanent ?? false,
    email: email ?? existing?.email ?? auth.currentUser?.email ?? null,
  });
}

/**
 * Returns the cached Drive access token if it has not yet expired.
 */
export function getDriveAccessToken(): string | null {
  const cache = readDriveCache();
  if (!cache?.token) return null;
  if (cache.expiresAt && cache.expiresAt <= Date.now() + EXPIRY_BUFFER_MS) {
    return null;
  }
  return cache.token;
}

/**
 * Returns true if the active user has a persisted Drive connection on this device.
 */
export function hasPersistedDriveConnection(): boolean {
  const cache = readDriveCache();
  return Boolean(cache?.connected || getDriveAccessToken());
}
