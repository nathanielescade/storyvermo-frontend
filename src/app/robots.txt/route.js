const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';

export async function GET() {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Allow public pages',
    'Allow: /stories',
    'Allow: /verses',
    'Allow: /tags',
    'Allow: /about',
    'Allow: /contact',
    'Allow: /privacy',
    'Allow: /terms',
    '',
    '# Disallow sensitive or internal endpoints',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /api/publish-webhook',
    'Disallow: /api/publish-proxy',
    'Disallow: /api/private',
    '',
    '# Disallow user-specific pages (require authentication)',
    'Disallow: /notifications',
    'Disallow: /settings',
    'Disallow: /dashboard',
    'Disallow: /create',
    'Disallow: /edit',
    'Disallow: /[username]/settings',
    'Disallow: /[username]/dashboard',
    'Disallow: /[username]/stories/create',
    'Disallow: /[username]/stories/edit',
    
    '',
    '# Disallow developer/test utilities and script endpoints',
    'Disallow: /scripts',
    'Disallow: /node',
    'Disallow: /_next',
    'Disallow: /static',
    '',
    '# Crawl settings',
    'Crawl-delay: 5',
    '',
    '# Sitemap location',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
    '# Host declaration',
    `Host: ${SITE_URL.replace(/^https?:\/\//, '')}`,
  ];

  const txt = lines.join('\n');
  
  return new Response(txt, { 
    headers: { 
      'Content-Type': 'text/plain; charset=utf-8', 
      'Cache-Control': 'public, max-age=86400, s-maxage=86400' // Cache for 24 hours
    } 
  });
}