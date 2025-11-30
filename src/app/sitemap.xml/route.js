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

    // Include trending tags (if any)
    try {
      const tags = await (globalThis.tagsApi 
        ? globalThis.tagsApi.getTrending() 
        : (await import('../../lib/api.js')).tagsApi.getTrending()
      );
      
      if (Array.isArray(tags) && tags.length > 0) {
        tags.slice(0, 200).forEach((t) => {
          const tag = typeof t === 'string' ? t : (t && t.name) ? t.name : String(t);
          urls.push({ 
            loc: `${SITE_URL}/tags/${encodeURIComponent(tag)}`, 
            priority: '0.6', 
            changefreq: 'daily' 
          });
        });
      }
    } catch (e) {
      console.error('Failed to fetch tags for sitemap:', e.message);
      // Non-fatal - continue without tags
    }

    // Paginate through stories
    const MAX_PAGES = 500;
    let page = 1;
    let fetched = 0;
    const seen = new Set();
    
    const extractSlug = (s) => {
      if (!s) return null;
      const candidates = [
        s.slug, s.url_slug, s.public_id, s.id, s.pk,
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
      if (s.story && s.story.slug) return String(s.story.slug);
      if (s.node && s.node.slug) return String(s.node.slug);
      return null;
    };

    const escapeXml = (str) => {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // 🔥 FIX: Safely import API and handle errors
    try {
      const { storiesApi } = await import('../../lib/api.js');
      
      while (page <= MAX_PAGES && fetched < 45000) {
        let data = null;
        
        try {
          data = await storiesApi.getPaginatedStories({ page });
          
          // 🔥 FIX: Handle empty database gracefully
          if (!data || (Array.isArray(data?.results) && data.results.length === 0)) {
            if (page === 1) {
              console.log('No stories found - database might be empty');
              // Try one more fallback
              try {
                const fallback = await storiesApi.getPaginatedStories({ page, tag: 'all' });
                if (fallback && fallback.results && fallback.results.length > 0) {
                  data = fallback;
                } else {
                  break; // Empty database - break out
                }
              } catch (fbErr) {
                break; // Empty database
              }
            } else {
              break; // No more pages
            }
          }
        } catch (err) {
          console.error(`Failed to fetch stories page ${page}:`, err.message);
          break; // Stop pagination on error
        }

        const results = data?.results || (Array.isArray(data) ? data : []);
        if (!results || results.length === 0) break;

        for (const s of results) {
          const slug = extractSlug(s);
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);
          
          const loc = `${SITE_URL}/stories/${encodeURIComponent(slug)}`;
          const lastmod = formatDate(
            s?.updated_at || s?.modified || s?.published_at || 
            s?.created_at || s?.date || s?.updatedAt
          );
          const isBad = s?.is_flagged || s?.is_bad || s?.flagged || false;
          
          urls.push({ 
            loc, 
            lastmod, 
            priority: isBad ? '0.1' : '0.9', 
            changefreq: 'daily' 
          });

          // Add author profile
          const author = s?.creator || s?.author || s?.user || 
                        (s.story && s.story.creator);
          const username = author && (
            author.username || author.public_id || 
            author.id || author.name
          );
          
          if (username) {
            const pu = `${SITE_URL}/${encodeURIComponent(username)}`;
            if (!seen.has(pu)) {
              urls.push({ 
                loc: pu, 
                priority: '0.5', 
                changefreq: 'weekly' 
              });
              seen.add(pu);
            }
          }

          // Add verse URLs
          const verses = Array.isArray(s.verses) ? s.verses : [];
          for (const v of verses) {
            const verseId = v.id || v.public_id || v.slug;
            if (!verseId) continue;
            const verseLoc = `${SITE_URL}/verses/${encodeURIComponent(verseId)}`;
            if (!seen.has(verseLoc)) {
              urls.push({ 
                loc: verseLoc, 
                priority: '0.4', 
                changefreq: 'monthly' 
              });
              seen.add(verseLoc);
            }
          }

          fetched += 1;
          if (fetched >= 45000) break;
        }

        if (!data?.next || fetched >= 45000) break;
        page += 1;
      }
      
      console.log(`✅ Sitemap generated with ${fetched} stories`);
      
    } catch (apiError) {
      console.error('Failed to load stories API:', apiError.message);
      // Continue with just static routes if API fails
    }

    // Build XML
    const xmlParts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
    ];
    
    for (const u of urls) {
      xmlParts.push('<url>');
      xmlParts.push(`  <loc>${escapeXml(u.loc)}</loc>`);
      if (u.lastmod) xmlParts.push(`  <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) xmlParts.push(`  <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) xmlParts.push(`  <priority>${u.priority}</priority>`);
      
      // Images (if any)
      if (Array.isArray(u.images) && u.images.length > 0) {
        for (const img of u.images) {
          try {
            const loc = img.loc || img.url || img.src;
            if (!loc) continue;
            xmlParts.push('  <image:image>');
            xmlParts.push(`    <image:loc>${escapeXml(loc)}</image:loc>`);
            if (img.caption) xmlParts.push(`    <image:caption>${escapeXml(img.caption)}</image:caption>`);
            if (img.title) xmlParts.push(`    <image:title>${escapeXml(img.title)}</image:title>`);
            xmlParts.push('  </image:image>');
          } catch (e) {
            // Ignore image errors
          }
        }
      }
      
      xmlParts.push('</url>');
    }
    
    xmlParts.push('</urlset>');

    const xml = xmlParts.join('\n');

    return new Response(xml, { 
      headers: { 
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=3600' 
      } 
    });
    
  } catch (err) {
    console.error('Sitemap generation error:', err);
    
    // 🔥 FIX: Return minimal valid sitemap instead of error
    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>
</urlset>`;

    return new Response(minimalXml, { 
      headers: { 
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300' 
      },
      status: 200 // Return 200 with minimal sitemap instead of 500
    });
  }
}