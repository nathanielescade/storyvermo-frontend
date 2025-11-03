import { NextResponse } from 'next/server';

// Server-side media proxy: fetches media from the backend and streams it to the client
// Keeps the backend host hidden from frontend markup.

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Ensure path starts with '/'
    const decoded = decodeURIComponent(path);
    const normalizedPath = decoded.startsWith('/') ? decoded : `/${decoded}`;
    const target = BACKEND.replace(/\/$/, '') + normalizedPath;

    const resp = await fetch(target, {
      // server-side fetch should include credentials if backend requires them
      // but avoid forwarding client cookies to keep proxy simple/public.
      method: 'GET',
      headers: {
        // Indicate we're a server proxy when fetching
        'x-proxy-via': 'storyvermo-frontend'
      }
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `Upstream returned ${resp.status}` }, { status: 502 });
    }

    // Stream response body back to client and copy content-type
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const cacheControl = resp.headers.get('cache-control') || 'public, max-age=86400, stale-while-revalidate=3600';

    const body = await resp.arrayBuffer();
    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      }
    });
  } catch (err) {
    console.error('[media-proxy] error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
