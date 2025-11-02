import { revalidateTag } from '../../../../lib/api.server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SECRET = process.env.SITEMAP_WEBHOOK_SECRET || null;

function parseCookie(cookieHeader = '') {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    if (!k) continue;
    out[k.trim()] = rest.join('=').trim();
  }
  return out;
}

export async function POST(req) {
  try {
    // Basic CSRF protection: require X-CSRFToken header that matches cookie value
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookie(cookieHeader);
    const cookieCsrf = cookies['csrftoken'] || cookies['csrf-token'] || cookies['csrf'];
    const headerCsrf = req.headers.get('x-csrf-token') || req.headers.get('x-csrftoken') || req.headers.get('x-csrf');

    if (!headerCsrf || !cookieCsrf || headerCsrf !== cookieCsrf) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_csrf' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = await req.json().catch(() => ({}));
    const slug = payload?.slug || payload?.story_slug || null;
    const url = payload?.url || (slug ? `${SITE_URL}/stories/${slug}` : null);

    // Revalidate cache tags server-side safely
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
      console.warn('Revalidation failed in proxy', e);
    }

    // Forward to the internal publish-webhook endpoint server-side (use secret from env)
    const forwardHeaders = { 'Content-Type': 'application/json' };
    if (SECRET) forwardHeaders['x-sitemap-secret'] = SECRET;

    try {
      const res = await fetch(`${SITE_URL}/api/publish-webhook`, {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ slug, url })
      });
      const body = await res.text().catch(() => '');
      return new Response(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
    } catch (e) {
      console.warn('Forward to publish-webhook failed', e);
      // Still return success for client UX; admin can check logs for forwarding issues
      return new Response(JSON.stringify({ ok: true, forwarded: false, error: String(e) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    console.error('publish-proxy error', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
