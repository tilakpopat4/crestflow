import { Env, ServiceAccountCredentials } from '../types';
import { getFirestoreDoc, parseServiceAccount, setFirestoreDoc } from '../firestore';
import { requireEntitlement } from '../entitlements';
import { verifyFirebaseIdToken } from '../auth';
import { constantTimeCompare } from '../razorpay';
import { hashIdentifier } from '../trialLedger';
import { checkRateLimit } from './notifications';
import { getBearerToken, jsonResponse } from './subscription';

const NOINDEX_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store',
};

function generateShareToken(): string {
  const bytes = new Uint8Array(24); // 192 bits >= 128 bits
  crypto.getRandomValues(bytes);
  const bin = String.fromCharCode(...Array.from(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hashShareToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildPublicInvoiceSnapshot(invoice: Record<string, any>, profile: Record<string, any> | null) {
  const safeReels = Array.isArray(invoice.reels)
    ? invoice.reels.map((r: any) => ({
        title: String(r?.title || ''),
        quantity: Number(r?.quantity || 0),
        rate: Number(r?.rate || 0),
        subClientName: r?.subClientName ? String(r.subClientName) : undefined,
      }))
    : [];
  const safeDeliverables = Array.isArray(invoice.deliverables)
    ? invoice.deliverables.map((d: any) => ({
        title: String(d?.title || ''),
        quantity: Number(d?.quantity || 0),
        subClientName: d?.subClientName ? String(d.subClientName) : undefined,
        date: d?.date || undefined,
      }))
    : [];

  return {
    invoiceNumber: String(invoice.invoiceNumber || ''),
    date: invoice.date || Date.now(),
    billingMonth: invoice.billingMonth ? String(invoice.billingMonth) : null,
    invoiceType: String(invoice.invoiceType || 'per_item'),
    clientName: String(invoice.clientName || ''),
    payeeName: String(invoice.payeeName || profile?.name || 'Freelancer'),
    payeeUpiId: String(invoice.payeeUpiId || profile?.upiId || ''),
    professionalTitle: String(profile?.professionalTitle || ''),
    currency: String(invoice.currency || 'INR'),
    reels: safeReels,
    deliverables: safeDeliverables,
    discountAmount: typeof invoice.discountAmount === 'number' ? invoice.discountAmount : null,
    discountDescription: invoice.discountDescription ? String(invoice.discountDescription) : null,
    extraCostAmount: typeof invoice.extraCostAmount === 'number' ? invoice.extraCostAmount : null,
    extraCostDescription: invoice.extraCostDescription ? String(invoice.extraCostDescription) : null,
    totalAmount: Number(invoice.totalAmount || 0),
    status: String(invoice.status || 'Pending'),
  };
}

/**
 * POST /api/invoices/share
 * Protected & entitlement-gated: mints or rotates a 192-bit token for an owned invoice,
 * stores only its SHA-256 hash in `invoice_shares/{invoiceId}`, and returns the share URL.
 */
export async function handleCreateInvoiceShare(request: Request, env: Env): Promise<Response> {
  const gate = await requireEntitlement(request, env);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as { invoiceId?: string };
  const invoiceId = typeof body.invoiceId === 'string' ? body.invoiceId.trim() : '';
  if (!invoiceId || !/^[a-zA-Z0-9_-]{1,128}$/.test(invoiceId)) {
    return jsonResponse({ error: 'Valid invoiceId is required.' }, 400, request, env);
  }

  const invoice = await getFirestoreDoc(gate.creds, `invoices/${invoiceId}`);
  if (!invoice || invoice.userId !== gate.user.uid) {
    return jsonResponse({ error: 'Invoice not found.' }, 404, request, env);
  }

  const profile = await getFirestoreDoc(gate.creds, `profiles/${gate.user.uid}`).catch(() => null);
  const effectiveUpi = String(invoice.payeeUpiId || profile?.upiId || '').trim();
  if (!effectiveUpi) {
    return jsonResponse(
      { error: 'UPI ID is required in Settings before creating a payable invoice link.', code: 'UPI_REQUIRED' },
      400,
      request,
      env
    );
  }

  const rawToken = generateShareToken();
  const tokenHash = await hashShareToken(rawToken);
  const now = Date.now();
  const snapshot = buildPublicInvoiceSnapshot({ ...invoice, payeeUpiId: effectiveUpi }, profile);

  await setFirestoreDoc(gate.creds, `invoice_shares/${invoiceId}`, {
    invoiceId,
    ownerUid: gate.user.uid,
    tokenHash,
    revoked: false,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    paymentClaim: invoice.paymentClaim || null,
    invoiceSnapshot: snapshot,
  });

  const origin = env.BASE_URL || new URL(request.url).origin;
  const shareUrl = `${origin}/invoice/${encodeURIComponent(invoiceId)}?t=${encodeURIComponent(rawToken)}`;

  return jsonResponse({ success: true, invoiceId, shareUrl }, 200, request, env, NOINDEX_HEADERS);
}

/**
 * POST /api/invoices/revoke
 * Protected (owner only): revokes any existing share link for an invoice (allowed even if expired).
 */
export async function handleRevokeInvoiceShare(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return jsonResponse({ error: 'Authentication required.' }, 401, request, env);

  let creds: ServiceAccountCredentials;
  let user;
  try {
    creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    user = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID || creds.project_id);
  } catch {
    return jsonResponse({ error: 'Authentication failed.' }, 401, request, env);
  }

  const body = (await request.json().catch(() => ({}))) as { invoiceId?: string };
  const invoiceId = typeof body.invoiceId === 'string' ? body.invoiceId.trim() : '';
  if (!invoiceId || !/^[a-zA-Z0-9_-]{1,128}$/.test(invoiceId)) {
    return jsonResponse({ error: 'Valid invoiceId is required.' }, 400, request, env);
  }

  const share = await getFirestoreDoc(creds, `invoice_shares/${invoiceId}`);
  if (!share || share.ownerUid !== user.uid) {
    return jsonResponse({ error: 'Share link not found.' }, 404, request, env);
  }

  const now = Date.now();
  await setFirestoreDoc(creds, `invoice_shares/${invoiceId}`, {
    revoked: true,
    revokedAt: now,
    updatedAt: now,
  });

  return jsonResponse({ success: true, invoiceId, revoked: true }, 200, request, env, NOINDEX_HEADERS);
}

async function resolveVerifiedShare(
  request: Request,
  env: Env,
  invoiceId: string,
  token: string,
  rateKeyPrefix: string,
  maxPerMin: number
) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipKey = await hashIdentifier(`${rateKeyPrefix}_${ip}`, 'pub_inv_rl');
  if (!checkRateLimit(ipKey, maxPerMin, 60000)) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'Too many requests.' }, 429, request, env, NOINDEX_HEADERS),
    };
  }

  if (!invoiceId || !token || !/^[a-zA-Z0-9_-]{1,128}$/.test(invoiceId) || token.length < 16) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'Invoice link unavailable or expired.' }, 404, request, env, NOINDEX_HEADERS),
    };
  }

  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const share = await getFirestoreDoc(creds, `invoice_shares/${invoiceId}`);
  if (!share || share.revoked || !share.tokenHash) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'Invoice link unavailable or expired.' }, 404, request, env, NOINDEX_HEADERS),
    };
  }

  const candidateHash = await hashShareToken(token);
  if (!constantTimeCompare(candidateHash, String(share.tokenHash))) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'Invoice link unavailable or expired.' }, 404, request, env, NOINDEX_HEADERS),
    };
  }

  // Pull latest status (Paid/Pending) & printed fields if invoice still exists, falling back cleanly to snapshot
  const liveInvoice = await getFirestoreDoc(creds, `invoices/${invoiceId}`).catch(() => null);
  const liveStatus = liveInvoice?.status || share.invoiceSnapshot?.status || 'Pending';
  const paymentClaim = liveInvoice?.paymentClaim || share.paymentClaim || null;

  return {
    ok: true as const,
    creds,
    share,
    publicInvoice: {
      ...(share.invoiceSnapshot || {}),
      status: liveStatus,
      paymentClaim,
    },
  };
}

/**
 * GET /api/public-invoice?id=<invoiceId>&t=<token>
 * Public, token-scoped, rate-limited, noindex, returns printed fields only.
 * Explicitly works after freelancer expiry so client payments aren't disrupted.
 */
export async function handleGetPublicInvoice(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const invoiceId = url.searchParams.get('id')?.trim() || '';
  const token = url.searchParams.get('t')?.trim() || '';
  const resolved = await resolveVerifiedShare(request, env, invoiceId, token, 'read_pub_inv', 25);
  if (!resolved.ok) return resolved.response;
  return jsonResponse({ success: true, invoice: resolved.publicInvoice }, 200, request, env, NOINDEX_HEADERS);
}

/** POST /api/public-invoice/claim-paid: records a client "I've paid" claim without marking invoice Paid. */
export async function handleClaimPublicInvoicePaid(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    invoiceId?: string; id?: string; token?: string; t?: string;
    referenceNote?: string; reference?: string; claimedBy?: string; note?: string;
  };
  const invoiceId = typeof (body.invoiceId || body.id) === 'string' ? (body.invoiceId || body.id || '').trim() : '';
  const token = typeof (body.token || body.t) === 'string' ? (body.token || body.t || '').trim() : '';
  const reference = typeof (body.referenceNote || body.reference) === 'string'
    ? (body.referenceNote || body.reference || '').trim().slice(0, 120) : '';
  const claimedBy = typeof body.claimedBy === 'string' ? body.claimedBy.trim().slice(0, 100) : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';
  const resolved = await resolveVerifiedShare(request, env, invoiceId, token, 'claim_pub_inv', 5);
  if (!resolved.ok) return resolved.response;
  if (resolved.publicInvoice.status === 'Paid') {
    return jsonResponse({ success: true, alreadyPaid: true, status: 'Paid' }, 200, request, env, NOINDEX_HEADERS);
  }
  const now = Date.now();
  const claimPayload = {
    status: 'claimed', claimedAt: now,
    ...(claimedBy ? { claimedBy } : {}),
    ...(reference ? { reference, referenceNote: reference } : {}),
    ...(note ? { note } : {}),
  };
  await Promise.all([
    setFirestoreDoc(resolved.creds, `invoice_shares/${invoiceId}`, { paymentClaim: claimPayload, updatedAt: now }),
    setFirestoreDoc(resolved.creds, `invoices/${invoiceId}`, { paymentClaim: claimPayload, updatedAt: now }).catch(() => {}),
  ]);
  return jsonResponse(
    { success: true, status: 'Pending', paymentClaim: claimPayload, message: 'Payment claim recorded. Awaiting freelancer confirmation.' },
    200, request, env, NOINDEX_HEADERS
  );
}
