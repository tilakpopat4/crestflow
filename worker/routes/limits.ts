import { Env } from '../types';
import { setFirestoreDoc } from '../firestore';
import { isEntitledRecord, requireEntitlement } from '../entitlements';
import { jsonResponse } from './subscription';

/**
 * Legacy helper retained only for IST calendar utilities in billing tests.
 * Free tier limits (2 clients / 3 invoices) are permanently retired.
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

export function isUserEntitled(entitlement: any, nowMs = Date.now()): boolean {
  return isEntitledRecord(entitlement, nowMs);
}

/**
 * POST /api/create-client
 * Entitlement-gated: active trial, paid, or grace users only (no free tier).
 */
export async function handleCreateClient(request: Request, env: Env): Promise<Response> {
  const gate = await requireEntitlement(request, env);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => null)) as Record<string, any> | null;
  if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400, request, env);

  const clientId = body.id || body.clientId;
  if (!clientId || typeof clientId !== 'string') {
    return jsonResponse({ error: 'Missing client id' }, 400, request, env);
  }

  const clientData = {
    ...body,
    id: clientId,
    userId: gate.user.uid,
    createdAt: body.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  await setFirestoreDoc(gate.creds, `clients/${clientId}`, clientData);
  return jsonResponse({ success: true, clientId, client: clientData }, 201, request, env);
}

/**
 * POST /api/create-invoice
 * Entitlement-gated: active trial, paid, or grace users only (no free tier).
 */
export async function handleCreateInvoice(request: Request, env: Env): Promise<Response> {
  const gate = await requireEntitlement(request, env);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => null)) as Record<string, any> | null;
  if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400, request, env);

  const invoiceId = body.id || body.invoiceId;
  if (!invoiceId || typeof invoiceId !== 'string') {
    return jsonResponse({ error: 'Missing invoice id' }, 400, request, env);
  }

  const invoiceData = {
    ...body,
    id: invoiceId,
    userId: gate.user.uid,
    createdAt: body.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  await setFirestoreDoc(gate.creds, `invoices/${invoiceId}`, invoiceData);
  return jsonResponse({ success: true, invoiceId, invoice: invoiceData }, 201, request, env);
}
