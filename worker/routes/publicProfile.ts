import { Env } from '../types';
import { jsonResponse } from './subscription';
import { parseServiceAccount, getGoogleAccessToken, fromFirestoreValue } from '../firestore';
import { getEntitlementFromFirestore, resolveEffectiveStatus } from '../entitlements';
import { INACTIVE_REQUEST_PAUSE_DAYS } from '../../src/shared/pricing';

/**
 * GET /api/public-profile?handle=<identifier>
 * Public endpoint returning sanitized freelancer profile + onboarding availability.
 * After 30 days expired/inactive, flags `acceptingRequests: false` so new intake pauses.
 */
export async function handleGetPublicProfile(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle')?.trim().toLowerCase();

  if (!handle) {
    return jsonResponse({ error: 'Missing handle parameter' }, 400, request, env);
  }

  const rawCreds = env.FIREBASE_SERVICE_ACCOUNT;
  const creds = rawCreds ? parseServiceAccount(rawCreds) : null;
  const projectId = creds?.project_id || env.FIREBASE_PROJECT_ID || 'crestflow-14f4b';

  let foundProfile: Record<string, any> | null = null;

  try {
    const publicUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/public_profiles/${encodeURIComponent(handle)}`;
    const res = await fetch(publicUrl);
    if (res.ok) {
      const doc = (await res.json()) as { fields?: Record<string, any> };
      if (doc.fields) {
        const profile: Record<string, any> = { id: handle };
        for (const [k, v] of Object.entries(doc.fields)) {
          profile[k] = fromFirestoreValue(v);
        }
        foundProfile = profile;
      }
    }
  } catch (err) {
    console.warn('[PublicProfile] public_profiles fetch error:', err);
  }

  if (!foundProfile && creds) {
    try {
      const token = await getGoogleAccessToken(creds);
      const directUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/profiles/${encodeURIComponent(handle)}`;
      const directRes = await fetch(directUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (directRes.ok) {
        const doc = (await directRes.json()) as { fields?: Record<string, any> };
        if (doc.fields) {
          const raw: Record<string, any> = {};
          for (const [k, v] of Object.entries(doc.fields)) {
            raw[k] = fromFirestoreValue(v);
          }
          foundProfile = {
            id: handle,
            userId: raw.userId || handle,
            username: raw.username || handle,
            name: raw.name || 'Freelancer',
            professionalTitle: raw.professionalTitle || '',
            servicesDescription: raw.servicesDescription || '',
            workExperienceBio: raw.workExperienceBio || '',
            photoURL: raw.photoURL || '',
            freelanceStartDate: raw.freelanceStartDate || null,
            phone: raw.phone || '',
            sampleWorks: raw.sampleWorks || [],
          };
        }
      }
    } catch (err) {
      console.warn('[PublicProfile] fallback failed:', err);
    }
  }

  if (!foundProfile) {
    return jsonResponse({ error: 'Profile not found' }, 404, request, env);
  }

  let acceptingRequests = true;
  if (creds && foundProfile.userId) {
    try {
      const ent = await getEntitlementFromFirestore(creds, String(foundProfile.userId));
      const effective = resolveEffectiveStatus(ent);
      if (effective === 'suspended') {
        acceptingRequests = false;
      } else if (effective === 'expired' && ent?.validUntil) {
        const expiredMs = Date.now() - new Date(ent.validUntil).getTime();
        if (expiredMs > INACTIVE_REQUEST_PAUSE_DAYS * 86400 * 1000) {
          acceptingRequests = false;
        }
      }
    } catch {}
  }

  return jsonResponse({ success: true, profile: foundProfile, acceptingRequests }, 200, request, env);
}
