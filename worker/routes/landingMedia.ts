import { Env } from '../types';
import { verifyFirebaseIdToken } from '../auth';
import { getBearerToken } from './subscription';
import { parseServiceAccount, getFirestoreDoc, setFirestoreDoc } from '../firestore';

function jsonResponse(data: any, status = 200, corsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(corsHeaders || {}),
    },
  });
}

const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_POSTER_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_ORIGINS = new Set([
  'https://crestflow.space',
  'https://www.crestflow.space',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const uploadRateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = uploadRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    uploadRateMap.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 15) return false;
  entry.count++;
  return true;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://crestflow.space';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    'X-Content-Type-Options': 'nosniff',
  };
}

async function verifyAdminUser(request: Request, env: Env) {
  const token = getBearerToken(request);
  if (!token) throw new Error('Missing Authorization header');
  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
  const user = await verifyFirebaseIdToken(token, projectId);
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  const isSuperAdmin = normalizedEmail === 'tilakpopat2007@gmail.com';
  const hasAdminClaim = (user as any).admin === true;
  let isDbAdmin = false;
  if (!isSuperAdmin && !hasAdminClaim && normalizedEmail) {
    try {
      const adminDoc = await getFirestoreDoc(creds, `admin_users/${encodeURIComponent(normalizedEmail)}`);
      isDbAdmin = Boolean(adminDoc);
    } catch {}
  }
  if (!isSuperAdmin && !hasAdminClaim && !isDbAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
  return { user, creds };
}

/**
 * Validates actual binary file signatures (magic bytes) to prevent extension spoofing.
 */
function detectVideoMime(bytes: Uint8Array): 'video/mp4' | 'video/webm' | null {
  if (bytes.length < 12) return null;
  // 1. WebM EBML header: 0x1A 0x45 0xDF 0xA3
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'video/webm';
  }
  // 2. MP4 ftyp box: bytes 4-7 are 'ftyp'
  const isFtyp =
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  if (isFtyp) return 'video/mp4';
  return null;
}

function detectImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  // WebP: RIFF....WEBP
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) return 'image/webp';
  return null;
}

/**
 * POST /api/admin/landing-media/upload
 * Securely uploads admin video (MP4/WebM <= 25MB) and/or poster to Cloudflare R2.
 */
export async function handleLandingMediaUpload(request: Request, env: Env): Promise<Response> {
  const cors = getCorsHeaders(request);
  let adminContext;
  try {
    adminContext = await verifyAdminUser(request, env);
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : 401;
    return jsonResponse({ error: err.message }, status, cors);
  }

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(`upload_${adminContext.user.uid}_${clientIp}`)) {
    return jsonResponse({ error: 'Too many upload requests. Please wait a few minutes.' }, 429, cors);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ error: 'Invalid multipart/form-data payload' }, 400, cors);
  }

  const videoFile = formData.get('video') as File | null;
  const posterFile = formData.get('poster') as File | null;
  if (!videoFile && !posterFile) {
    return jsonResponse({ error: 'No video or poster file provided' }, 400, cors);
  }

  let detectedVideoType: 'video/mp4' | 'video/webm' | null = null;
  let videoBytes: ArrayBuffer | null = null;
  if (videoFile) {
    if (videoFile.size > MAX_VIDEO_BYTES) {
      return jsonResponse({ error: `Video exceeds the 25 MB limit (${(videoFile.size / (1024 * 1024)).toFixed(1)} MB)` }, 400, cors);
    }
    videoBytes = await videoFile.arrayBuffer();
    detectedVideoType = detectVideoMime(new Uint8Array(videoBytes));
    if (!detectedVideoType) {
      return jsonResponse({ error: 'Invalid file signature. Only valid H.264 MP4 and WebM videos are accepted.' }, 400, cors);
    }
  }

  let detectedImageType: 'image/jpeg' | 'image/png' | 'image/webp' | null = null;
  let posterBytes: ArrayBuffer | null = null;
  if (posterFile) {
    if (posterFile.size > MAX_POSTER_BYTES) {
      return jsonResponse({ error: 'Poster exceeds 5 MB limit' }, 400, cors);
    }
    posterBytes = await posterFile.arrayBuffer();
    detectedImageType = detectImageMime(new Uint8Array(posterBytes));
    if (!detectedImageType) {
      return jsonResponse({ error: 'Invalid poster image signature. JPG, PNG, or WebP accepted.' }, 400, cors);
    }
  }

  // Upload to R2 Bucket
  if (env.VIDEOS_BUCKET) {
    if (videoBytes && detectedVideoType) {
      await env.VIDEOS_BUCKET.put('landing-video', videoBytes, {
        httpMetadata: { contentType: detectedVideoType },
        customMetadata: { uploadedBy: adminContext.user.uid, uploadedAt: String(Date.now()) },
      });
    }
    if (posterBytes && detectedImageType) {
      await env.VIDEOS_BUCKET.put('landing-poster', posterBytes, {
        httpMetadata: { contentType: detectedImageType },
        customMetadata: { uploadedBy: adminContext.user.uid, uploadedAt: String(Date.now()) },
      });
    }
  }

  // Update Firestore metadata
  const existingConfig = (await getFirestoreDoc(adminContext.creds, 'system_settings/hero_config')) || {};
  const updatedData = {
    ...existingConfig,
    backgroundType: 'video',
    backgroundVideoUrl: videoBytes ? '/api/media/landing-video' : (existingConfig.backgroundVideoUrl || '/api/media/landing-video'),
    posterUrl: posterBytes ? '/api/media/landing-poster' : (existingConfig.posterUrl || ''),
    videoEnabled: true,
    fileSize: videoBytes ? videoBytes.byteLength : existingConfig.fileSize || 0,
    mimeType: detectedVideoType || existingConfig.mimeType || 'video/mp4',
    updatedAt: Date.now(),
    updatedBy: adminContext.user.email || adminContext.user.uid,
  };

  try {
    await setFirestoreDoc(adminContext.creds, 'system_settings/hero_config', updatedData);
  } catch (err: any) {
    return jsonResponse({ error: `Failed to persist hero metadata: ${err.message}` }, 500, cors);
  }

  return jsonResponse({
    success: true,
    videoUrl: updatedData.backgroundVideoUrl,
    posterUrl: updatedData.posterUrl,
    videoEnabled: true,
    fileSize: updatedData.fileSize,
  }, 200, cors);
}

/**
 * GET /api/media/landing-video
 * Streams video directly from R2 with Range header support and no-sniff protection.
 */
export async function handleGetLandingVideo(request: Request, env: Env): Promise<Response> {
  const cors = getCorsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!env.VIDEOS_BUCKET) return jsonResponse({ error: 'Video storage not configured' }, 404, cors);

  const range = request.headers.get('Range');
  const object = await env.VIDEOS_BUCKET.get('landing-video', range ? { range: request.headers } : undefined);
  if (!object) return jsonResponse({ error: 'No custom landing video uploaded' }, 404, cors);

  const headers = new Headers(cors);
  if (object.writeHttpMetadata) {
    object.writeHttpMetadata(headers);
  }
  if (object.httpEtag || object.etag) {
    headers.set('etag', object.httpEtag || object.etag);
  }
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (!headers.get('Content-Type')) headers.set('Content-Type', 'video/mp4');

  const status = range ? 206 : 200;
  return new Response(object.body, { status, headers });
}

/**
 * GET /api/media/landing-poster
 * Streams poster image directly from R2.
 */
export async function handleGetLandingPoster(request: Request, env: Env): Promise<Response> {
  const cors = getCorsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!env.VIDEOS_BUCKET) return jsonResponse({ error: 'Poster storage not configured' }, 404, cors);

  const object = await env.VIDEOS_BUCKET.get('landing-poster');
  if (!object) return jsonResponse({ error: 'No poster uploaded' }, 404, cors);

  const headers = new Headers(cors);
  if (object.writeHttpMetadata) {
    object.writeHttpMetadata(headers);
  }
  if (object.httpEtag || object.etag) {
    headers.set('etag', object.httpEtag || object.etag);
  }
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (!headers.get('Content-Type')) headers.set('Content-Type', 'image/jpeg');

  return new Response(object.body, { status: 200, headers });
}

/**
 * DELETE /api/admin/landing-media
 * Admin-only removal of video and poster from R2 and metadata reset.
 */
export async function handleDeleteLandingMedia(request: Request, env: Env): Promise<Response> {
  const cors = getCorsHeaders(request);
  let adminContext;
  try {
    adminContext = await verifyAdminUser(request, env);
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : 401;
    return jsonResponse({ error: err.message }, status, cors);
  }

  if (env.VIDEOS_BUCKET) {
    try {
      await env.VIDEOS_BUCKET.delete(['landing-video', 'landing-poster']);
    } catch {}
  }

  const existingConfig = (await getFirestoreDoc(adminContext.creds, 'system_settings/hero_config')) || {};
  await setFirestoreDoc(adminContext.creds, 'system_settings/hero_config', {
    ...existingConfig,
    backgroundType: 'color',
    backgroundVideoUrl: '',
    posterUrl: '',
    videoEnabled: false,
    fileSize: 0,
    updatedAt: Date.now(),
    updatedBy: adminContext.user.email || adminContext.user.uid,
  });

  return jsonResponse({ success: true, message: 'Landing media removed' }, 200, cors);
}
