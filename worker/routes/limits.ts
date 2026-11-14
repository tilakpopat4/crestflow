import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { jsonResponse, getBearerToken } from './subscription';
import {
  parseServiceAccount,
  getSubscriptionFromFirestore,
  getFirestoreDoc,
  setFirestoreDoc,
  getGoogleAccessToken,
  toFirestoreValue,
} from '../firestore';

export const FREE_TIER_LIMITS = {
  maxClients: 2,
  maxInvoicesPerMonth: 3,
};

/**
 * Returns year, month, and formatted key in Asia/Kolkata timezone.
 */
export function getIstYearMonth(date: Date = new Date()): { year: number; month: number; key: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
  const key = `${year}_${String(month).padStart(2, '0')}`;
  return { year, month, key };
}

/**
 * Checks if a subscription record has active Pro entitlements.
 */
export function isUserPro(sub: any): boolean {
  if (!sub) return false;
  if (sub.status === 'active' || sub.status === 'trialing') return true;
  if (sub.accessUntil) {
    const accessTime = new Date(sub.accessUntil).getTime();
    if (!isNaN(accessTime) && accessTime > Date.now()) return true;
  }
  return false;
}

/**
 * Counts existing clients owned by a specific userId in Firestore via structuredQuery.
 */
async function countUserClients(creds: any, userId: string): Promise<number> {
  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents:runQuery`;

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'clients' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'userId' },
          op: 'EQUAL',
          value: { stringValue: userId },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to count user clients: ${res.status} ${text}`);
  }

  const results = (await res.json()) as any[];
  // Firestore runQuery returns array of objects with document property
  const count = results.filter((r) => r.document).length;
  return count;
}

/**
 * POST /api/create-client
 * Enforces free tier maximum 2 clients quota.
 */
export async function handleCreateClient(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  let creds;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }

  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  let user;
  try {
    user = await verifyFirebaseIdToken(token, projectId);
  } catch (err: any) {
    return jsonResponse({ error: `Authentication failed: ${err.message}` }, 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const clientId = body.id || body.clientId;
  if (!clientId || typeof clientId !== 'string') {
    return jsonResponse({ error: 'Missing client id' }, 400);
  }

  const sub = await getSubscriptionFromFirestore(creds, user.uid);
  const pro = isUserPro(sub);

  if (!pro) {
    const clientCount = await countUserClients(creds, user.uid);
    if (clientCount >= FREE_TIER_LIMITS.maxClients) {
      return jsonResponse(
        {
          error: `Free tier limit reached: Maximum ${FREE_TIER_LIMITS.maxClients} clients allowed. Upgrade to Pro for unlimited clients.`,
          limitReached: true,
          limit: FREE_TIER_LIMITS.maxClients,
          current: clientCount,
        },
        403
      );
    }
  }

  const clientData = {
    ...body,
    id: clientId,
    userId: user.uid,
    createdAt: body.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  await setFirestoreDoc(creds, `clients/${clientId}`, clientData);
  return jsonResponse({ success: true, clientId, client: clientData }, 201);
}

/**
 * POST /api/create-invoice
 * Enforces free tier maximum 3 invoices per calendar month in Asia/Kolkata.
 */
export async function handleCreateInvoice(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  let creds;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }

  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  let user;
  try {
    user = await verifyFirebaseIdToken(token, projectId);
  } catch (err: any) {
    return jsonResponse({ error: `Authentication failed: ${err.message}` }, 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const invoiceId = body.id || body.invoiceId;
  if (!invoiceId || typeof invoiceId !== 'string') {
    return jsonResponse({ error: 'Missing invoice id' }, 400);
  }

  const sub = await getSubscriptionFromFirestore(creds, user.uid);
  const pro = isUserPro(sub);

  if (!pro) {
    const { key: istMonthKey } = getIstYearMonth();
    const ledgerDocPath = `usage_ledger/${user.uid}_${istMonthKey}`;
    const ledger = await getFirestoreDoc(creds, ledgerDocPath);
    const currentCount = typeof ledger?.count === 'number' ? ledger.count : 0;

    if (currentCount >= FREE_TIER_LIMITS.maxInvoicesPerMonth) {
      return jsonResponse(
        {
          error: `Free tier monthly limit reached: Maximum ${FREE_TIER_LIMITS.maxInvoicesPerMonth} invoices per calendar month (IST) allowed. Upgrade to Pro for unlimited invoices.`,
          limitReached: true,
          limit: FREE_TIER_LIMITS.maxInvoicesPerMonth,
          current: currentCount,
        },
        403
      );
    }

    // Atomic ledger increment
    await setFirestoreDoc(creds, ledgerDocPath, {
      count: currentCount + 1,
      userId: user.uid,
      month: istMonthKey,
      updatedAt: Date.now(),
    });
  }

  const invoiceData = {
    ...body,
    id: invoiceId,
    userId: user.uid,
    createdAt: body.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  await setFirestoreDoc(creds, `invoices/${invoiceId}`, invoiceData);
  return jsonResponse({ success: true, invoiceId, invoice: invoiceData }, 201);
}
