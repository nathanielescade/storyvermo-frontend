import { revalidateTag } from 'next/cache';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';
const SECRET = process.env.SITEMAP_WEBHOOK_SECRET || null;
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null;

// Service-account JWT -> access token helper (no external deps)
async function getAccessTokenFromServiceAccount() {
  let raw = GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  let keyJson;
  try {
    keyJson = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.warn('Invalid GOOGLE_SERVICE_ACCOUNT_JSON content:', e);
    return null;
  }

  const { client_email, private_key } = keyJson;
  if (!client_email || !private_key) return null;

  // Create JWT
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const toBase64Url = (obj) => {
    const s = JSON.stringify(obj);
    return Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const unsigned = `${toBase64Url(header)}.${toBase64Url(payload)}`;

  // Sign using Node crypto
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${unsigned}.${signature}`;

  // Exchange JWT for access token
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', jwt);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn('Service account token exchange failed', res.status, txt);
      return null;
    }

    const json = await res.json();
    return json?.access_token || null;
  } catch (e) {
    console.warn('Service account token exchange error', e);
    return null;
  }
}

async function pingSearchEngines(sitemapUrl) {
  const results = [];
  try {
    const g = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { method: 'GET' });
    results.push({ engine: 'google', ok: g.ok, status: g.status });
  } catch (e) {
    results.push({ engine: 'google', ok: false, error: String(e) });
  }

  try {
    const b = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { method: 'GET' });
    results.push({ engine: 'bing', ok: b.ok, status: b.status });
  } catch (e) {
    results.push({ engine: 'bing', ok: false, error: String(e) });
  }

  return results;
}

async function callGoogleIndexingApi(url) {
  try {
    const token = await getAccessTokenFromServiceAccount();
    if (!token) return { ok: false, reason: 'no-access-token' };

    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url, type: 'URL_UPDATED' })
    });

    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function POST(req) {
  try {
    // Security: require secret header
    const incomingSecret = req.headers.get('x-sitemap-secret') || req.headers.get('x-secret');
    if (SECRET && (!incomingSecret || incomingSecret !== SECRET)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_secret' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const payload = await req.json().catch(() => ({}));
    const slug = payload?.slug || payload?.story_slug || null;
    const url = payload?.url || (slug ? `${SITE_URL}/stories/${slug}` : null);

    // Revalidate relevant cache tags
    try {
      await Promise.all([
        revalidateTag('stories'),
        revalidateTag('feed'),
        revalidateTag('tags'),
      ]);
      if (slug) {
        try { await revalidateTag(`story-${slug}`); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('Revalidation failed', e);
    }

    const sitemapUrl = `${SITE_URL}/sitemap.xml`;

    // Ping search engines
    const pingResults = await pingSearchEngines(sitemapUrl);

    // Call Google Indexing API
    let indexingResult = null;
    if (url) {
      indexingResult = await callGoogleIndexingApi(url);
    }

    return new Response(JSON.stringify({ ok: true, pingResults, indexingResult }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err) {
    console.error('publish-webhook error', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}