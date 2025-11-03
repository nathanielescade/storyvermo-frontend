const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';

export async function GET() {
  const lines = [
    'User-agent: *',
    'Allow: /',
    // Disallow sensitive or internal endpoints and webhook/proxy routes
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /api/publish-webhook',
    'Disallow: /api/publish-proxy',
    'Disallow: /api/private',
    // Disallow developer/test utilities and script endpoints (not public content)
    'Disallow: /scripts',
    'Disallow: /node',
    'Crawl-delay: 5',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${SITE_URL.replace(/^https?:\/\//, '')}`,
  ];

  const txt = lines.join('\n');
  return new Response(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
}
