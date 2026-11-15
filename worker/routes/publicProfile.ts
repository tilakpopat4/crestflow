import { Env } from '../types';
import { jsonResponse } from './subscription';
import { parseServiceAccount, getGoogleAccessToken, fromFirestoreValue } from '../firestore';

/**
 * GET /api/public-profile?handle=<identifier>
 * Serves sanitized public freelancer profile for onboarding intake without requiring login.
 */
export async function handleGetPublicProfile(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle')?.trim().toLowerCase();

  if (!handle) {
    return jsonResponse({ error: 'Missing handle parameter' }, 400);
  }

  const rawCreds = env.FIREBASE_SERVICE_ACCOUNT;
  const creds = rawCreds ? parseServiceAccount(rawCreds) : null;
  const projectId = creds?.project_id || env.FIREBASE_PROJECT_ID || 'crestflow-14f4b';

  // 1. Direct fetch from public_profiles in Firestore
  try {
    const publicUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/public_profiles/${encodeURIComponent(handle)}`;
    const res = await fetch(publicUrl);
    if (res.ok) {
      const doc = await res.json() as { fields?: Record<string, any> };
      if (doc.fields) {
        const profile: Record<string, any> = { id: handle };
        for (const [k, v] of Object.entries(doc.fields)) {
          profile[k] = fromFirestoreValue(v);
        }
        return jsonResponse({ success: true, profile }, 200);
      }
    }
  } catch (err) {
    console.warn('[PublicProfile] direct public_profiles fetch error:', err);
  }

  // 2. Fallback via service account query on profiles collection
  if (creds) {
    try {
      const token = await getGoogleAccessToken(creds);
      // Try direct doc ID
      const directUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/profiles/${encodeURIComponent(handle)}`;
      const directRes = await fetch(directUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (directRes.ok) {
        const doc = await directRes.json() as { fields?: Record<string, any> };
        if (doc.fields) {
          const raw: Record<string, any> = {};
          for (const [k, v] of Object.entries(doc.fields)) {
            raw[k] = fromFirestoreValue(v);
          }
          const sanitized = {
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
          return jsonResponse({ success: true, profile: sanitized }, 200);
        }
      }
    } catch (err) {
      console.warn('[PublicProfile] service account fallback failed:', err);
    }
  }

  return jsonResponse({ error: 'Profile not found' }, 404);
}
