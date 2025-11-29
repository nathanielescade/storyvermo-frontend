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
      { loc: `${SITE_URL}/about`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${SITE_URL}/contact`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${SITE_URL}/privacy`, priority: '0.1', changefreq: 'yearly' },
      { loc: `${SITE_URL}/terms`, priority: '0.1', changefreq: 'yearly' },
      { loc: `${SITE_URL}/tags`, priority: '0.7', changefreq: 'daily' },
      { loc: `${SITE_URL}/verses`, priority: '0.6', changefreq: 'weekly' },
      { loc: `${SITE_URL}/login`, priority: '0.2', changefreq: 'monthly' },
      { loc: `${SITE_URL}/signup`, priority: '0.2', changefreq: 'monthly' },
    ];

    // Include trending tags (if any) and add /tags/[tag] dynamic pages
    try {
      const tags = await (globalThis.tagsApi ? globalThis.tagsApi.getTrending() : (await import('../../lib/api.js')).tagsApi.getTrending());
      if (Array.isArray(tags) && tags.length > 0) {
        tags.slice(0, 200).forEach((t) => {
          const tag = typeof t === 'string' ? t : (t && t.name) ? t.name : String(t);
          urls.push({ loc: `${SITE_URL}/tags/${encodeURIComponent(tag)}`, priority: '0.6', changefreq: 'daily' });
        });
      }
    } catch (e) {
      // non-fatal
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

    const makeAbsoluteImage = (img) => {
      if (!img) return null;
      if (typeof img !== 'string') return null;
      const trimmed = img.trim();
      if (!trimmed) return null;
      // Ignore data URLs and blobs
      if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;
      try {
        // If absolute, return as-is
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        // Otherwise resolve relative to SITE_URL
        return new URL(trimmed, SITE_URL).toString();
      } catch (e) {
        return trimmed;
      }
    };

    const extractStoryImage = (s) => {
      if (!s) return null;
      // prefer story.cover_image
      const ci = s.cover_image;
      if (ci) {
        if (typeof ci === 'string') return makeAbsoluteImage(ci);
        if (ci.file_url) return makeAbsoluteImage(ci.file_url);
        if (ci.url) return makeAbsoluteImage(ci.url);
      }
      // try first verse/moment image
      const verses = Array.isArray(s.verses) ? s.verses : (Array.isArray(s.moments) ? s.moments : []);
      for (const v of verses || []) {
        const moments = v.moments || v.images || [];
        if (Array.isArray(moments) && moments.length > 0) {
          const first = moments[0];
          if (!first) continue;
          if (typeof first === 'string') return makeAbsoluteImage(first);
          if (first.file_url) return makeAbsoluteImage(first.file_url);
          if (first.url) return makeAbsoluteImage(first.url);
          if (first.image) {
            if (typeof first.image === 'string') return makeAbsoluteImage(first.image);
            if (first.image.file_url) return makeAbsoluteImage(first.image.file_url);
            if (first.image.url) return makeAbsoluteImage(first.image.url);
          }
        }
      }
      return null;
    };

    // XML escape helper for caption/title
    const escapeXml = (str) => {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // Add /stories/[slug] dynamic routes
    const { storiesApi } = await import('../../lib/api.js');
    while (page <= MAX_PAGES) {
      let data = null;
      try {
        data = await storiesApi.getPaginatedStories({ page });
        if ((!data || (Array.isArray(data?.results) && data.results.length === 0)) && page === 1) {
          try {
            const fallback = await storiesApi.getPaginatedStories({ page, tag: 'all' });
            if (fallback) data = fallback;
          } catch (fbErr) {
          }
        }
      } catch (err) {
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
        // If the story is flagged as bad, set lower priority
        const isBad = s?.is_flagged || s?.is_bad || s?.flagged || false;
        urls.push({ loc, lastmod, priority: isBad ? '0.1' : '0.9', changefreq: 'daily' });

        // Add author/profile page when available
        const author = s?.creator || s?.author || s?.user || (s.story && s.story.creator);
        const username = author && (author.username || author.public_id || author.id || author.name);
        if (username) {
          const pu = `${SITE_URL}/${encodeURIComponent(username)}`;
          if (!seen.has(pu)) {
            urls.push({ loc: pu, priority: '0.5', changefreq: 'weekly' });
            seen.add(pu);
          }
        }

        // Add individual verse URLs for SEO
        const verses = Array.isArray(s.verses) ? s.verses : [];
        for (const v of verses) {
          const verseId = v.id || v.public_id || v.slug;
          if (!verseId) continue;
          const verseLoc = `${SITE_URL}/verses/${encodeURIComponent(verseId)}`;
          if (!seen.has(verseLoc)) {
            urls.push({ loc: verseLoc, priority: '0.4', changefreq: 'monthly' });
            seen.add(verseLoc);
          }
        }

        fetched += 1;
        if (fetched >= 45000) break;
      }

      if (!data?.next) break;
      if (fetched >= 45000) break;
      page += 1;
    }

    // Build XML
    const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'];
    for (const u of urls) {
      xmlParts.push('<url>');
      xmlParts.push(`<loc>${u.loc}</loc>`);
      if (u.lastmod) xmlParts.push(`<lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) xmlParts.push(`<changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) xmlParts.push(`<priority>${u.priority}</priority>`);
      // include image entries when available
      if (Array.isArray(u.images) && u.images.length > 0) {
        for (const img of u.images) {
          try {
            const loc = img.loc || img.url || img.src;
            if (!loc) continue;
            xmlParts.push('<image:image>');
            xmlParts.push(`<image:loc>${loc}</image:loc>`);
            if (img.caption) xmlParts.push(`<image:caption>${escapeXml(img.caption)}</image:caption>`);
            if (img.title) xmlParts.push(`<image:title>${escapeXml(img.title)}</image:title>`);
            xmlParts.push('</image:image>');
          } catch (e) {
            // ignore image serialization errors
          }
        }
      }
      xmlParts.push('</url>');
    }
    xmlParts.push('</urlset>');

    const xml = xmlParts.join('\n');

    return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
  } catch (err) {
    return new Response('Sitemap generation failed', { status: 500 });
  }
}
