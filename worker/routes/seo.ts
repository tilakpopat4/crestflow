/**
 * Serves SEO crawler files (robots.txt, sitemap.xml) directly with proper headers.
 */
export function handleSeoRoutes(url: URL, baseUrl: string): Response | null {
  if (url.pathname === '/robots.txt') {
    const robots = `# CrestFlow robots.txt
User-agent: *
Allow: /
Allow: /pricing
Allow: /billing
Allow: /contact
Allow: /privacy
Allow: /terms
Allow: /refund
Allow: /*/onboarding
Allow: /*/publicprofile
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
    <lastmod>2026-11-02</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/pricing</loc>
    <lastmod>2026-11-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/billing</loc>
    <lastmod>2026-11-02</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>2026-11-02</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/refund</loc>
    <lastmod>2026-11-02</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>2026-11-02</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>2026-11-02</lastmod>
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

  return null;
}
