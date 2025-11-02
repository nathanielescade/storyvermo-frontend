const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';

export async function GET() {
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/private',
    'Disallow: /admin',
    'Crawl-delay: 5',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${SITE_URL.replace(/^https?:\/\//, '')}`,
  ];

  const txt = lines.join('\n');
  return new Response(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
}
