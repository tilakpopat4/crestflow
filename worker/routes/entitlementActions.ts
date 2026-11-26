import { Env } from '../types';
import { setFirestoreDoc } from '../firestore';
import { requireEntitlement } from '../entitlements';
import { jsonResponse } from './subscription';

/**
 * POST /api/portal/publish
 * Protected + entitlement-gated: publishes sanitized public profile / sample works to `public_profiles`.
 */
export async function handlePublishPortal(request: Request, env: Env): Promise<Response> {
  const gate = await requireEntitlement(request, env);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, any>;
  const uid = gate.user.uid;
  const cleanHandle = typeof body.username === 'string' ? body.username.toLowerCase().trim() : '';

  const publicDoc: Record<string, any> = {
    userId: uid,
    name: String(body.name || gate.user.name || 'Freelancer').slice(0, 200),
    professionalTitle: String(body.professionalTitle || '').slice(0, 200),
    servicesDescription: String(body.servicesDescription || '').slice(0, 2000),
    workExperienceBio: String(body.workExperienceBio || '').slice(0, 5000),
    photoURL: typeof body.photoURL === 'string' ? body.photoURL.slice(0, 250000) : '',
    phone: String(body.phone || '').slice(0, 50),
    freelanceStartDate: typeof body.freelanceStartDate === 'string' ? body.freelanceStartDate.slice(0, 50) : null,
    sampleWorks: Array.isArray(body.sampleWorks) ? body.sampleWorks.slice(0, 24) : [],
    updatedAt: Date.now(),
  };

  if (cleanHandle) {
    publicDoc.username = cleanHandle;
  }

  await setFirestoreDoc(gate.creds, `public_profiles/${uid}`, publicDoc);
  if (cleanHandle && /^[a-z0-9_-]{3,30}$/.test(cleanHandle)) {
    await setFirestoreDoc(gate.creds, `public_profiles/${cleanHandle}`, publicDoc);
  }

  return jsonResponse({ success: true, uid, handle: cleanHandle || uid }, 200, request, env);
}

/**
 * POST /api/ai/authorize
 * Protected + entitlement-gated: validates active entitlement before running AI summary generation.
 */
export async function handleAuthorizeAiAction(request: Request, env: Env): Promise<Response> {
  const gate = await requireEntitlement(request, env);
  if (!gate.ok) return gate.response;

  return jsonResponse(
    {
      authorized: true,
      status: gate.effectiveStatus,
      plan: gate.entitlement.plan,
    },
    200,
    request,
    env
  );
}

/**
 * POST /api/invoices/authorize-send
 * Protected + entitlement-gated: server authorization check for invoice send / PDF export triggers.
 */
export async function handleAuthorizeInvoiceSend(request: Request, env: Env): Promise<Response> {
  const gate = await requireEntitlement(request, env);
  if (!gate.ok) return gate.response;

  return jsonResponse(
    {
      authorized: true,
      status: gate.effectiveStatus,
      plan: gate.entitlement.plan,
    },
    200,
    request,
    env
  );
}
