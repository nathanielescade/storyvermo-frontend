import { getPaginatedStories, getTrendingTags } from "../../../lib/api.server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';

function formatDate(d) {
  if (!d) return null;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString();
  } catch (e) {
    return null;
  }
}

export async function GET() {
  try {
    // Static important routes
    const urls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'hourly' },
      { loc: `${SITE_URL}/tags`, priority: '0.7', changefreq: 'daily' },
      { loc: `${SITE_URL}/login`, priority: '0.2', changefreq: 'monthly' },
      { loc: `${SITE_URL}/signup`, priority: '0.2', changefreq: 'monthly' },
    ];

    // Include trending tags (if any)
    try {
      const tags = await getTrendingTags();
      if (Array.isArray(tags) && tags.length > 0) {
        tags.slice(0, 200).forEach((t) => {
          const tag = typeof t === 'string' ? t : (t && t.name) ? t.name : String(t);
          urls.push({ loc: `${SITE_URL}/tags/${encodeURIComponent(tag)}`, priority: '0.6', changefreq: 'daily' });
        });
      }
    } catch (e) {
      // non-fatal
      console.warn('Failed to fetch trending tags for sitemap:', e);
    }

    // Paginate through stories. Cap pages to avoid runaway generation.
    const MAX_PAGES = 500; // safety cap
    let page = 1;
    let fetched = 0;
    const seen = new Set();
    const extractSlug = (s) => {
      if (!s) return null;
      const candidates = [
        s.slug,
        s.url_slug,
        s.public_id,
        s.id,
        s.pk,
        s.serialized_slug,
        s.attributes && s.attributes.slug,
        s.data && s.data.slug,
        s.fields && s.fields.slug,
      ];
      for (const c of candidates) {
        if (!c) continue;
        const str = String(c).trim();
        if (str) return str;
      }
      // attempt deeper nested shapes
      if (s.story && s.story.slug) return String(s.story.slug);
      if (s.node && s.node.slug) return String(s.node.slug);
      return null;
    };

    while (page <= MAX_PAGES) {
      let data = null;
      try {
        // Request the unfiltered/all stories listing by explicitly passing a non-'for-you' tag
        data = await getPaginatedStories({ page, tag: 'all' });
      } catch (err) {
        console.warn('Failed to fetch paginated stories on page', page, err);
        break;
      }

      const results = data?.results || (Array.isArray(data) ? data : []);
      if (!results || results.length === 0) break;

      for (const s of results) {
        const slug = extractSlug(s);
        if (!slug) continue;
        if (seen.has(slug)) continue;
        seen.add(slug);
        const loc = `${SITE_URL}/stories/${encodeURIComponent(slug)}`;
        const lastmod = formatDate(s?.updated_at || s?.modified || s?.published_at || s?.created_at || s?.date || s?.updatedAt);
        urls.push({ loc, lastmod, priority: '0.9', changefreq: 'daily' });

        // Add author/profile page when available
        const author = s?.creator || s?.author || s?.user || (s.story && s.story.creator);
        const username = author && (author.username || author.public_id || author.id || author.name);
        if (username) {
          const pu = `${SITE_URL}/${encodeURIComponent(username)}`;
          if (!seen.has(pu)) {
            urls.push({ loc: pu, priority: '0.5', changefreq: 'weekly' });
            // mark to avoid exact duplicate locs
            seen.add(pu);
          }
        }

        fetched += 1;
        // Respect sitemap size limits (50k URLs). Stop early if too large.
        if (fetched >= 45000) break;
      }

      if (!data?.next) break;
      if (fetched >= 45000) break;
      page += 1;
    }

    // Build XML
    const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
    for (const u of urls) {
      xmlParts.push('<url>');
      xmlParts.push(`<loc>${u.loc}</loc>`);
      if (u.lastmod) xmlParts.push(`<lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) xmlParts.push(`<changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) xmlParts.push(`<priority>${u.priority}</priority>`);
      xmlParts.push('</url>');
    }
    xmlParts.push('</urlset>');

    const xml = xmlParts.join('\n');

    return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
  } catch (err) {
    console.error('Sitemap generation error', err);
    return new Response('Sitemap generation failed', { status: 500 });
  }
}
