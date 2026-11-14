import { ServiceAccountCredentials, SubscriptionRecord } from './types';
import { parseServiceAccount, getGoogleAccessToken } from './firestoreAuth';
export { parseServiceAccount, getGoogleAccessToken };

// Helpers to serialize JS values to Firestore Value objects
export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      return { timestampValue: val };
    }
    return { stringValue: val };
  }
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

export function fromFirestoreValue(val: any): any {
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

/**
 * Reads any document by relative path from Firestore.
 */
export async function getFirestoreDoc(
  creds: ServiceAccountCredentials,
  docPath: string
): Promise<Record<string, any> | null> {
  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/${docPath}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to read ${docPath}: ${res.status} ${text}`);
  }

  const docData = (await res.json()) as { fields?: Record<string, any> };
  if (!docData.fields) return null;
  return fromFirestoreValue({ mapValue: { fields: docData.fields } });
}

/**
 * Writes or merges any document by relative path to Firestore.
 */
export async function setFirestoreDoc(
  creds: ServiceAccountCredentials,
  docPath: string,
  data: Record<string, any>
): Promise<void> {
  const token = await getGoogleAccessToken(creds);
  const fields: Record<string, any> = {};
  const fieldPaths: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    fieldPaths.push(key);
    fields[key] = toFirestoreValue(value);
  }

  const updateMask = fieldPaths.map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/${docPath}?${updateMask}`;

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
    throw new Error(`Failed to write to ${docPath}: ${res.status} ${text}`);
  }
}
