import { Env } from './types';
import { fromFirestoreValue, parseServiceAccount, getGoogleAccessToken } from './firestore';

export interface PublicFreelancerMeta {
  userId: string;
  username?: string;
  name: string;
  professionalTitle?: string;
  servicesDescription?: string;
  workExperienceBio?: string;
  photoURL?: string;
  freelanceStartDate?: string | null;
}

/**
 * Extracts username from onboarding routes:
 * - /:username/onboarding
 * - /onboarding/:username
 */
export function extractOnboardingHandle(pathname: string): string | null {
  const clean = pathname.toLowerCase().replace(/\/+$/, '');
  const userMatch = clean.match(/^\/([a-z0-9_-]+)\/onboarding$/);
  if (userMatch) return userMatch[1];

  const legacyMatch = clean.match(/^\/(?:onboarding|client-onboarding)\/([a-z0-9_-]+)$/);
  if (legacyMatch) return legacyMatch[1];

  return null;
}

/**
 * Calculates human-readable experience duration like "9 months", "1 yr, 4 mos", or "2 years".
 */
export function calculateExperienceText(startDateStr?: string | null): string {
  if (!startDateStr || typeof startDateStr !== 'string') return 'verified professional';

  const parts = startDateStr.split('-');
  let start: Date;
  if (parts.length === 3) {
    start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    start = new Date(startDateStr);
  }

  if (isNaN(start.getTime())) return 'verified professional';

  const now = new Date();
  const diffDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays < 30) return `${diffDays} days`;

  const years = Math.floor(diffDays / 365.25);
  const remainingDays = diffDays % 365.25;
  const months = Math.floor(remainingDays / 30.4375);

  if (years > 0) {
    if (months > 0) return `${years} ${years === 1 ? 'yr' : 'yrs'}, ${months} ${months === 1 ? 'mo' : 'mos'}`;
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Fetches public freelancer data for link preview personalization.
 */
export async function fetchFreelancerPublicMeta(handle: string, env: Env): Promise<PublicFreelancerMeta | null> {
  const projectId = env.FIREBASE_PROJECT_ID || 'crestflow-14f4b';

  // 1. Fetch from public_profiles
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/public_profiles/${encodeURIComponent(handle)}`;
    const res = await fetch(url);
    if (res.ok) {
      const doc = await res.json() as { fields?: Record<string, any> };
      if (doc.fields) {
        const raw: Record<string, any> = {};
        for (const [k, v] of Object.entries(doc.fields)) {
          raw[k] = fromFirestoreValue(v);
        }
        return {
          userId: raw.userId || handle,
          username: raw.username || handle,
          name: raw.name || 'Freelancer',
          professionalTitle: raw.professionalTitle || '',
          servicesDescription: raw.servicesDescription || '',
          workExperienceBio: raw.workExperienceBio || '',
          photoURL: raw.photoURL || '',
          freelanceStartDate: raw.freelanceStartDate || null,
        };
      }
    }
  } catch (err) {
    console.warn('[OnboardingMeta] public_profiles fetch error:', err);
  }

  // 2. Fallback via service account
  const rawCreds = env.FIREBASE_SERVICE_ACCOUNT;
  if (rawCreds) {
    try {
      const creds = parseServiceAccount(rawCreds);
      const token = await getGoogleAccessToken(creds);
      const directUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/profiles/${encodeURIComponent(handle)}`;
      const res = await fetch(directUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const doc = await res.json() as { fields?: Record<string, any> };
        if (doc.fields) {
          const raw: Record<string, any> = {};
          for (const [k, v] of Object.entries(doc.fields)) {
            raw[k] = fromFirestoreValue(v);
          }
          return {
            userId: raw.userId || handle,
            username: raw.username || handle,
            name: raw.name || 'Freelancer',
            professionalTitle: raw.professionalTitle || '',
            servicesDescription: raw.servicesDescription || '',
            workExperienceBio: raw.workExperienceBio || '',
            photoURL: raw.photoURL || '',
            freelanceStartDate: raw.freelanceStartDate || null,
          };
        }
      }
    } catch (err) {
      console.warn('[OnboardingMeta] service account fallback failed:', err);
    }
  }

  return null;
}

/**
 * Injects personalized Open Graph and Twitter Card tags into HTML template.
 */
export function injectPersonalizedOnboardingMeta(
  html: string,
  profile: PublicFreelancerMeta,
  canonicalUrl: string
): string {
  const name = profile.name || 'Freelancer';
  const expText = calculateExperienceText(profile.freelanceStartDate);
  const title = `Claim The Service of ${name}`;

  const serviceSnippet = profile.servicesDescription ? ` in ${profile.servicesDescription}` : '';
  const description = `Having ${expText} experience${serviceSnippet}. Submit your project brief and onboard directly with ${name} on CrestFlow.`;
  const photoUrl = profile.photoURL || 'https://crestflow.space/app_logo_icon.png';

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safePhoto = escapeHtml(photoUrl);
  const safeUrl = escapeHtml(canonicalUrl);

  let updated = html;

  // Replace <title>
  updated = updated.replace(/<title>.*?<\/title>/i, `<title>${safeTitle} | CrestFlow</title>`);

  // Replace meta title & description
  updated = updated.replace(/<meta\s+name=["']title["'][^>]*>/i, `<meta name="title" content="${safeTitle}" />`);
  updated = updated.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${safeDesc}" />`);

  // Replace Open Graph tags
  updated = updated.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${safeTitle}" />`);
  updated = updated.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${safeDesc}" />`);
  updated = updated.replace(/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${safePhoto}" />`);
  updated = updated.replace(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${safeUrl}" />`);

  // Replace Twitter Card tags
  updated = updated.replace(/<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  updated = updated.replace(/<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  updated = updated.replace(/<meta\s+name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" content="${safePhoto}" />`);
  updated = updated.replace(/<meta\s+name=["']twitter:url["'][^>]*>/i, `<meta name="twitter:url" content="${safeUrl}" />`);

  return updated;
}
