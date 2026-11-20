import { Env } from './types';
import {
  extractOnboardingHandle,
  fetchFreelancerPublicMeta,
  injectPersonalizedOnboardingMeta,
} from './onboardingMeta';

export function isKnownAppRoute(pathname: string): boolean {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const known = new Set([
    '/',
    '/dashboard',
    '/clients',
    '/work',
    '/work-log',
    '/invoices',
    '/invoice',
    '/reviews',
    '/onboarding',
    '/client-onboarding',
    '/profile',
    '/settings',
    '/pricing',
    '/plans',
    '/billing',
    '/subscription',
    '/admin',
    '/sitemap',
    '/privacy',
    '/privacy-policy',
    '/terms',
    '/terms-of-service',
    '/contact',
    '/refund',
    '/refund-policy',
    '/cancellation',
    '/login',
    '/signin',
    '/signup',
    '/register',
    '/404',
  ]);

  if (known.has(clean)) return true;
  if (/^\/[a-z0-9_-]+\/(?:onboarding|publicprofile|public-profile)$/.test(clean)) return true;
  if (/^\/(?:onboarding|client-onboarding|publicprofile|public-profile)\/[a-z0-9_-]+$/.test(clean)) return true;
  return false;
}

export async function handleStaticAsset(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const response = await env.ASSETS.fetch(request);

  // PWA Service Worker & Manifest headers
  if (url.pathname === '/sw.js') {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Content-Type', 'application/javascript; charset=utf-8');
    newHeaders.set('Service-Worker-Allowed', '/');
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }

  if (url.pathname === '/manifest.json') {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Content-Type', 'application/manifest+json; charset=utf-8');
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }

  // 1. Missing JS/CSS Chunk Handling:
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

  // 2. Prevent Stale index.html Caching & Return Real 404 on Unknown HTML Routes:
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('text/html') || url.pathname === '/' || !url.pathname.includes('.')) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    const isKnown = isKnownAppRoute(url.pathname);
    if (!isKnown) {
      return new Response(response.body, {
        status: 404,
        statusText: 'Not Found',
        headers,
      });
    }

    // Check for personalized onboarding link previews
    const onboardingHandle = extractOnboardingHandle(url.pathname);
    if (onboardingHandle) {
      try {
        const rawHtml = await response.text();
        const profile = await fetchFreelancerPublicMeta(onboardingHandle, env);
        if (profile) {
          const personalizedHtml = injectPersonalizedOnboardingMeta(rawHtml, profile, url.toString());
          headers.set('Content-Type', 'text/html; charset=utf-8');
          return new Response(personalizedHtml, {
            status: 200,
            statusText: 'OK',
            headers,
          });
        }
        return new Response(rawHtml, {
          status: 200,
          statusText: 'OK',
          headers,
        });
      } catch (err) {
        console.warn('[handleStaticAsset] Onboarding meta injection failed:', err);
      }
    }

    // SSR Canonical URL injection for public marketing & legal routes
    const cleanPath = url.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const publicSupportingRoutes = new Set(['/pricing', '/terms', '/privacy', '/refund', '/contact']);
    if (publicSupportingRoutes.has(cleanPath)) {
      try {
        const rawHtml = await response.text();
        const fullCanonical = `https://crestflow.space${cleanPath}`;
        const updatedHtml = rawHtml
          .replace(
            '<link rel="canonical" href="https://crestflow.space/" />',
            `<link rel="canonical" href="${fullCanonical}" />`
          )
          .replace(
            '<meta property="og:url" content="https://crestflow.space/" />',
            `<meta property="og:url" content="${fullCanonical}" />`
          );
        headers.set('Content-Type', 'text/html; charset=utf-8');
        return new Response(updatedHtml, {
          status: 200,
          statusText: 'OK',
          headers,
        });
      } catch (err) {
        console.warn('[handleStaticAsset] Canonical injection failed:', err);
      }
    }

    return new Response(response.body, {
      status: 200,
      statusText: 'OK',
      headers,
    });
  }

  return response;
}
