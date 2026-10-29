import { Env } from './types';
import {
  jsonResponse,
  getBearerToken,
  handleCreateSubscription,
  handleGetMe,
  handleCancelSubscription,
  handleChangePlan,
} from './routes/subscription';
import { handleRazorpayWebhook } from './routes/webhook';
import { handleCronReconciliation } from './reconcile';
import { constantTimeCompare } from './razorpay';
import {
  handleNotifyContact,
  handleNotifyWelcome,
  handleNotifyNewClientRequest,
  handleNotifyMilestone,
  handleNotifyPaymentDueToday,
  handleScheduleEmail,
  handleCancelEmail,
  handleProcessEmailQueue,
} from './routes/notifications';
import { processDueEmailJobs } from './emailDispatcher';

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
    const baseUrl = env.BASE_URL || url.origin;
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

Sitemap: ${baseUrl}/sitemap.xml
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
    <loc>${baseUrl}/</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/refund</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>2026-10-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
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

    // Only intercept /api/* routes; everything else serves static SPA assets
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
      // 1. POST /api/create-subscription
      if (url.pathname === '/api/create-subscription' && request.method === 'POST') {
        return await handleCreateSubscription(request, env);
      }

      // 2. GET /api/me
      if (url.pathname === '/api/me' && request.method === 'GET') {
        return await handleGetMe(request, env);
      }

      // 3. POST /api/cancel-subscription
      if (url.pathname === '/api/cancel-subscription' && request.method === 'POST') {
        return await handleCancelSubscription(request, env);
      }

      // 4. POST /api/change-plan
      if (url.pathname === '/api/change-plan' && request.method === 'POST') {
        return await handleChangePlan(request, env);
      }

      // 5. POST /api/razorpay-webhook
      if (url.pathname === '/api/razorpay-webhook' && request.method === 'POST') {
        return await handleRazorpayWebhook(request, env);
      }

      // 6. POST /api/reconcile-cron (Cron reconciliation trigger, protected by CRON_SECRET)
      if (
        (url.pathname === '/api/reconcile-cron' || url.pathname === '/api/admin/reconcile') &&
        request.method === 'POST'
      ) {
        const authHeaderToken = getBearerToken(request);
        const customHeaderSecret = request.headers.get('x-cron-secret');
        const providedSecret = customHeaderSecret || authHeaderToken || '';
        const expectedSecret = env.CRON_SECRET || '';

        if (!expectedSecret || !providedSecret || !constantTimeCompare(providedSecret, expectedSecret)) {
          return jsonResponse({ error: 'Unauthorized: Invalid or missing CRON_SECRET' }, 401);
        }

        const stats = await handleCronReconciliation(env);
        return jsonResponse({ success: true, stats });
      }

      // 7. POST /api/notify/contact
      if (url.pathname === '/api/notify/contact' && request.method === 'POST') {
        return await handleNotifyContact(request, env);
      }

      // 8. POST /api/notify/welcome
      if (url.pathname === '/api/notify/welcome' && request.method === 'POST') {
        return await handleNotifyWelcome(request, env);
      }

      // 9. POST /api/notify/new-client-request
      if (url.pathname === '/api/notify/new-client-request' && request.method === 'POST') {
        return await handleNotifyNewClientRequest(request, env);
      }

      // 10. POST /api/notify/milestone
      if (url.pathname === '/api/notify/milestone' && request.method === 'POST') {
        return await handleNotifyMilestone(request, env);
      }

      // 11. POST /api/notify/payment-due-today
      if (url.pathname === '/api/notify/payment-due-today' && request.method === 'POST') {
        return await handleNotifyPaymentDueToday(request, env);
      }

      // 11. POST /api/email/schedule
      if (url.pathname === '/api/email/schedule' && request.method === 'POST') {
        return await handleScheduleEmail(request, env);
      }

      // 12. POST /api/email/cancel
      if (url.pathname === '/api/email/cancel' && request.method === 'POST') {
        return await handleCancelEmail(request, env);
      }

      // 13. POST /api/email/process-queue
      if (url.pathname === '/api/email/process-queue' && request.method === 'POST') {
        return await handleProcessEmailQueue(request, env);
      }

      return jsonResponse({ error: 'Endpoint not found' }, 404);
    } catch (err: any) {
      console.error('[Worker API Error]', err);
      return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
    }
  },

  /**
   * Daily Cron Trigger execution
   */
  async scheduled(controller: any, env: Env, ctx: any): Promise<void> {
    const runCron = async () => {
      await handleCronReconciliation(env);
      await processDueEmailJobs(env, 10);
    };

    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(runCron());
    } else {
      await runCron();
    }
  },
};
