import { NextResponse } from 'next/server';
import deletedPaths from '../data/deleted-paths.json';

// Middleware runs on the Edge — keep this tiny and fast.
// It returns 410 Gone for any path listed in data/deleted-paths.json
// so crawlers will see the resource is permanently removed and drop it from the index.

export function middleware(req) {
  try {
    const url = req.nextUrl;
    const path = url.pathname.replace(/\/+$|^\s+|\s+$/g, '') || '/';
    const search = (url.search || '').replace(/^\?/, '');

    // Support deletedPaths entries that include optional query strings.
    // Entry examples:
    // "/stories/aye-m2oH3uM8"
    // "/auth/login?next=%2Fnotifications%2Fget_unread_count%2F"
    if (deletedPaths && Array.isArray(deletedPaths)) {
      for (const entry of deletedPaths) {
        if (!entry) continue;
        const s = String(entry).trim();
        // split path and optional search
        const [rawPathPart, rawSearchPart] = s.split('?');
        const normEntryPath = String(rawPathPart || '').replace(/\/+$|^\s+|\s+$/g, '') || '/';

        // path match (allow trailing slash differences)
        const pathMatches = (normEntryPath === path) || (normEntryPath === '/' && path === '/') || (normEntryPath === path.replace(/\/$/, '')) || (normEntryPath.replace(/\/$/, '') === path);

        if (rawSearchPart == null) {
          // entry only specified path — match path and return 410
          if (pathMatches) return new Response('', { status: 410, statusText: 'Gone' });
        } else {
          // entry specified a query string — compare decoded values for robustness
          const entrySearch = rawSearchPart || '';
          // compare decoded versions (both entry and actual request)
          let decodedEntrySearch = '';
          let decodedReqSearch = '';
          try { decodedEntrySearch = decodeURIComponent(entrySearch); } catch (e) { decodedEntrySearch = entrySearch; }
          try { decodedReqSearch = decodeURIComponent(search || ''); } catch (e) { decodedReqSearch = search || ''; }

          if (pathMatches && decodedEntrySearch === decodedReqSearch) {
            return new Response('', { status: 410, statusText: 'Gone' });
          }
        }
      }
    }
  } catch (e) {
    // swallow errors to avoid breaking normal request flow
  }

  return NextResponse.next();
}

// Apply to all pages except Next internals and static assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data|static|favicon.ico).*)'],
};
