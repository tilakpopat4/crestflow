import { Env } from './types';
import { verifyFirebaseIdToken } from './auth';
import {
  parseServiceAccount,
  getSubscriptionFromFirestore,
  updateSubscriptionInFirestore,
  isEventProcessed,
  markEventProcessed,
} from './firestore';
import {
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  verifyRazorpayWebhookSignature,
} from './razorpay';

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-razorpay-signature',
        },
      });
    }

    // Google Search Console Site Verification
    if (url.pathname === '/google8efa91a9e5ebef0d.html') {
      return new Response('google-site-verification: google8efa91a9e5ebef0d.html', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Serve SEO crawler files directly with correct Content-Type headers
    if (url.pathname === '/robots.txt') {
      const robots = `# CrestFlow robots.txt
User-agent: *
Allow: /
Allow: /privacy
Allow: /terms
Allow: /refund
Allow: /contact
Allow: /onboarding/

Disallow: /admin
Disallow: /api/

Sitemap: ${url.origin}/sitemap.xml
`;
      return new Response(robots, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (url.pathname === '/sitemap.xml') {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url.origin}/</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${url.origin}/contact</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${url.origin}/refund</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${url.origin}/terms</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${url.origin}/privacy</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;
      return new Response(sitemap, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Only intercept /api/* routes; everything else serves static assets
    if (!url.pathname.startsWith('/api/')) {
      const response = await env.ASSETS.fetch(request);

      // 1. Missing JS/CSS Chunk Handling:
      // When single-page-application mode is enabled in wrangler.jsonc, missing assets return 200 with index.html.
      // If a browser tries to dynamic import a deleted/stale chunk and receives text/html instead of javascript,
      // it throws a SyntaxError and fails hard.
      // By returning a 404 for missing /assets/* files, Vite and lazyWithRetry immediately detect the missing chunk
      // and perform a clean automatic reload to fetch the latest deployment.
      if (url.pathname.startsWith('/assets/')) {
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('text/html') || response.status === 404) {
          return new Response('Asset not found', {
            status: 404,
            headers: {
              'Content-Type': 'text/plain',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        }
        return response;
      }

      // 2. Prevent Stale index.html Caching:
      // index.html contains hashed links to all lazy chunks. It must NEVER be cached by browsers
      // so clients always discover newly deployed chunks immediately upon reload.
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('text/html') || url.pathname === '/' || !url.pathname.includes('.')) {
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('Expires', '0');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    }

    try {
      // -----------------------------------------------------------------------
      // 1. POST /api/create-subscription
      // -----------------------------------------------------------------------
      if (url.pathname === '/api/create-subscription' && request.method === 'POST') {
        const idToken = getBearerToken(request);
        if (!idToken) {
          return jsonResponse({ error: 'Missing Authorization header' }, 401);
        }

        const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
        const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
        const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);

        const body = (await request.json().catch(() => ({}))) as {
          plan?: 'monthly' | 'yearly';
        };
        const requestedCycle = body.plan === 'yearly' ? 'yearly' : 'monthly';

        const planId =
          requestedCycle === 'yearly'
            ? env.RAZORPAY_PLAN_YEARLY
            : env.RAZORPAY_PLAN_MONTHLY;

        if (!planId) {
          return jsonResponse(
            { error: `Razorpay plan ID for ${requestedCycle} is not configured on the Worker` },
            500
          );
        }

        // Create subscription in Razorpay
        const rzpSub = await createRazorpaySubscription(
          env,
          planId,
          verifiedUser.uid,
          verifiedUser.email,
          verifiedUser.name
        );

        // Record pending subscription in Firestore
        await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
          userId: verifiedUser.uid,
          plan: 'free', // stays free until webhook confirms activation/charge
          billingCycle: requestedCycle,
          status: 'pending',
          razorpaySubscriptionId: rzpSub.id,
          razorpayPlanId: planId,
          cancelAtPeriodEnd: false,
          updatedAt: Date.now(),
        });

        return jsonResponse({
          subscriptionId: rzpSub.id,
          keyId: env.RAZORPAY_KEY_ID,
          shortUrl: rzpSub.shortUrl,
        });
      }

      // -----------------------------------------------------------------------
      // 2. POST /api/razorpay-webhook
      // -----------------------------------------------------------------------
      if (url.pathname === '/api/razorpay-webhook' && request.method === 'POST') {
        const rawBody = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        // Verify cryptographic HMAC-SHA256 signature
        const isValid = await verifyRazorpayWebhookSignature(
          rawBody,
          signature,
          env.RAZORPAY_WEBHOOK_SECRET
        );

        if (!isValid) {
          return jsonResponse({ error: 'Invalid webhook signature' }, 400);
        }

        let eventPayload: any;
        try {
          eventPayload = JSON.parse(rawBody);
        } catch {
          return jsonResponse({ error: 'Invalid JSON payload' }, 400);
        }

        const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);

        // Event Deduplication
        const eventId = eventPayload.event_id || `${eventPayload.event}_${Date.now()}`;
        if (await isEventProcessed(creds, eventId)) {
          return jsonResponse({ status: 'ok', duplicate: true }, 200);
        }
        await markEventProcessed(creds, eventId);

        const eventType = eventPayload.event;
        const subEntity =
          eventPayload.payload?.subscription?.entity ||
          eventPayload.payload?.payment?.entity?.subscription;

        const userId = subEntity?.notes?.userId;
        const subId = subEntity?.id;

        if (userId) {
          if (
            eventType === 'subscription.activated' ||
            eventType === 'subscription.charged' ||
            eventType === 'payment.captured'
          ) {
            // Determine period end timestamp from Razorpay entity
            const periodEnd = subEntity?.current_end
              ? subEntity.current_end * 1000
              : Date.now() + 30 * 24 * 60 * 60 * 1000;

            const periodStart = subEntity?.current_start
              ? subEntity.current_start * 1000
              : Date.now();

            await updateSubscriptionInFirestore(creds, userId, {
              userId,
              plan: 'pro',
              status: 'active',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              razorpaySubscriptionId: subId || subEntity?.id,
              cancelAtPeriodEnd: false,
              updatedAt: Date.now(),
            });
          } else if (
            eventType === 'subscription.pending' ||
            eventType === 'subscription.halted'
          ) {
            // Grace period: keep access until current_period_end
            await updateSubscriptionInFirestore(creds, userId, {
              status: 'halted',
              updatedAt: Date.now(),
            });
          } else if (
            eventType === 'subscription.cancelled' ||
            eventType === 'subscription.completed'
          ) {
            // Cancelled: Access remains valid only until current period end
            const existing = await getSubscriptionFromFirestore(creds, userId);
            const isExpired = existing?.currentPeriodEnd
              ? existing.currentPeriodEnd <= Date.now()
              : true;

            await updateSubscriptionInFirestore(creds, userId, {
              status: 'cancelled',
              cancelAtPeriodEnd: true,
              plan: isExpired ? 'free' : (existing?.plan || 'pro'),
              updatedAt: Date.now(),
            });
          }
        }

        return jsonResponse({ status: 'ok' }, 200);
      }

      // -----------------------------------------------------------------------
      // 3. POST /api/cancel-subscription
      // -----------------------------------------------------------------------
      if (url.pathname === '/api/cancel-subscription' && request.method === 'POST') {
        const idToken = getBearerToken(request);
        if (!idToken) {
          return jsonResponse({ error: 'Missing Authorization header' }, 401);
        }

        const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
        const projectId = env.FIREBASE_PROJECT_ID || creds.project_id;
        const verifiedUser = await verifyFirebaseIdToken(idToken, projectId);

        const currentSub = await getSubscriptionFromFirestore(creds, verifiedUser.uid);
        if (!currentSub || !currentSub.razorpaySubscriptionId) {
          return jsonResponse({ error: 'No active recurring subscription found to cancel' }, 404);
        }

        // Cancel in Razorpay at end of cycle
        await cancelRazorpaySubscription(env, currentSub.razorpaySubscriptionId);

        // Update Firestore subscription record
        await updateSubscriptionInFirestore(creds, verifiedUser.uid, {
          cancelAtPeriodEnd: true,
          status: 'cancelled',
          updatedAt: Date.now(),
        });

        return jsonResponse({
          success: true,
          message: 'Subscription will cancel automatically at the end of the current billing cycle',
        });
      }

      return jsonResponse({ error: 'Endpoint not found' }, 404);
    } catch (err: any) {
      console.error('[Worker Error]', err);
      return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
    }
  },
};
