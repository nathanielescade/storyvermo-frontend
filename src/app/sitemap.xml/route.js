const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com';

function formatDate(d) {
  if (!d) return null;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StoryVermo-Sitemap-Generator',
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Sitemap fetch failed: ${url} (${response.status})`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Sitemap fetch error: ${url}`, error.message);
    return null;
  }
}

export async function GET() {
  try {
    const urls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'hourly' },
      { loc: `${SITE_URL}/pricing`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${SITE_URL}/about`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${SITE_URL}/contact`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${SITE_URL}/privacy`, priority: '0.1', changefreq: 'yearly' },
      { loc: `${SITE_URL}/terms`, priority: '0.1', changefreq: 'yearly' },
      { loc: `${SITE_URL}/tags`, priority: '0.7', changefreq: 'daily' },
      { loc: `${SITE_URL}/verses`, priority: '0.6', changefreq: 'weekly' },
      { loc: `${SITE_URL}/login`, priority: '0.2', changefreq: 'monthly' },
      { loc: `${SITE_URL}/signup`, priority: '0.2', changefreq: 'monthly' },
      { loc: `${SITE_URL}/saved`, priority: '0.3', changefreq: 'weekly' },
      { loc: `${SITE_URL}/search`, priority: '0.5', changefreq: 'weekly' },
    ];

    const seen = new Set(urls.map(u => u.loc));

    const extractIdentifier = (obj, fields = ['slug', 'url_slug', 'public_id', 'id', 'username']) => {
      if (!obj) return null;
      for (const field of fields) {
        const val = obj[field];
        if (val) {
          const str = String(val).trim();
          if (str) return str;
        }
      }
      return null;
    };

    // Helper: safely add a profile URL, returns true if added
    const addProfile = (username, creatorObj = null) => {
      if (!username || typeof username !== 'string' || !username.trim()) return false;
      const clean = username.trim();
      const profileUrl = `${SITE_URL}/${encodeURIComponent(clean)}`;
      if (seen.has(profileUrl)) return false;

      urls.push({
        loc: profileUrl,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: creatorObj ? formatDate(creatorObj.updated_at || creatorObj.date_joined) : null,
      });
      seen.add(profileUrl);
      console.log(`Added profile: /${clean}`);
      return true;
    };

    // ============================================================================
    // FETCH TAGS
    // ============================================================================
    try {
      console.log('Fetching tags from sitemap...');
      let tags = await safeFetch(`${API_URL}/api/tags/trending/`);

      if (Array.isArray(tags) && tags.length > 0) {
        tags.slice(0, 200).forEach((t) => {
          const tagSlug = extractIdentifier(t, ['slug', 'name']);
          if (tagSlug) {
            const tagUrl = `${SITE_URL}/tags/${encodeURIComponent(tagSlug)}`;
            if (!seen.has(tagUrl)) {
              urls.push({ loc: tagUrl, priority: '0.7', changefreq: 'daily' });
              seen.add(tagUrl);
            }
          }
        });
      }
    } catch (tagError) {
      console.warn('Tag fetch failed for sitemap:', tagError.message);
    }

    // ============================================================================
    // FETCH PROFILES DIRECTLY (dedicated endpoint)
    // ============================================================================
    try {
      console.log('Fetching profiles from sitemap...');

      // Try common profile listing endpoints — hit whichever your API exposes
      const profileEndpoints = [
        `${API_URL}/api/profiles/`,
        `${API_URL}/api/users/`,
        `${API_URL}/api/creators/`,
      ];

      for (const endpoint of profileEndpoints) {
        let page = 1;
        let profilesFetched = 0;
        const MAX_PROFILES = 2000;

        while (profilesFetched < MAX_PROFILES) {
          const data = await safeFetch(`${endpoint}?page=${page}`);

          // If this endpoint doesn't exist or returns nothing, skip to next
          if (!data) break;

          // Handle both paginated { results: [...] } and plain array responses
          const items = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : null);
          if (!items || items.length === 0) break;

          for (const profile of items) {
            // Pull username from every possible field name
            const username =
              profile.username ||
              profile.user_name ||
              profile.slug ||
              profile.url_slug ||
              (profile.user && profile.user.username) ||
              null;

            if (username) {
              addProfile(username, profile);
              profilesFetched++;
            }
          }

          // Plain array means no pagination
          if (Array.isArray(data)) break;
          // Paginated but no next page
          if (!data.next) break;

          page++;
        }

        // If we actually got profiles from this endpoint, no need to try others
        if (profilesFetched > 0) {
          console.log(`Profiles fetched from ${endpoint}: ${profilesFetched}`);
          break;
        }
      }
    } catch (profileError) {
      console.warn('Profile fetch failed for sitemap:', profileError.message);
    }

    // ============================================================================
    // FETCH STORIES
    // ============================================================================
    try {
      console.log('Fetching stories from sitemap...');

      let page = 1;
      let totalFetched = 0;
      const MAX_STORIES = 5000;
      const MAX_PAGES = 50;

      while (page <= MAX_PAGES && totalFetched < MAX_STORIES) {
        const data = await safeFetch(`${API_URL}/api/stories/paginated_stories/?page=${page}`);

        if (!data || !data.results || data.results.length === 0) {
          console.log(`Stories pagination stopped at page ${page}`);
          break;
        }

        console.log(`Sitemap: Fetched ${data.results.length} stories from page ${page}`);

        for (const story of data.results) {
          const slug = extractIdentifier(story, ['slug', 'url_slug', 'public_id']);
          if (!slug) continue;

          const storyUrl = `${SITE_URL}/stories/${encodeURIComponent(slug)}`;
          if (seen.has(storyUrl)) continue;

          const lastmod = formatDate(story?.updated_at || story?.created_at);

          urls.push({
            loc: storyUrl,
            lastmod,
            priority: '0.9',
            changefreq: 'daily',
          });
          seen.add(storyUrl);

          // ── Extract creator profile from story ──
          // Check every possible shape the API might return creator data in
          const creator = story.creator || story.author || story.user || null;
          if (creator) {
            const username =
              creator.username ||
              creator.user_name ||
              creator.slug ||
              (creator.user && creator.user.username) ||
              null;

            if (username) {
              addProfile(username, creator);
            }
          }

          // Also check top-level fields in case creator isn't nested
          if (!story.creator && !story.author) {
            const topLevelUsername = story.creator_username || story.author_username || story.username;
            if (topLevelUsername) {
              addProfile(topLevelUsername);
            }
          }

          // ── Verses ──
          if (Array.isArray(story.verses)) {
            for (const verse of story.verses) {
              const verseId = extractIdentifier(verse, ['slug', 'id', 'public_id']);
              if (verseId) {
                const verseUrl = `${SITE_URL}/verses/${encodeURIComponent(verseId)}`;
                if (!seen.has(verseUrl)) {
                  urls.push({ loc: verseUrl, priority: '0.5', changefreq: 'weekly' });
                  seen.add(verseUrl);
                }
              }
            }
          }

          // ── Tags ──
          if (Array.isArray(story.tags)) {
            for (const tag of story.tags) {
              const tagSlug = extractIdentifier(tag, ['slug', 'name']);
              if (tagSlug) {
                const tagUrl = `${SITE_URL}/tags/${encodeURIComponent(tagSlug)}`;
                if (!seen.has(tagUrl)) {
                  urls.push({ loc: tagUrl, priority: '0.6', changefreq: 'weekly' });
                  seen.add(tagUrl);
                }
              }
            }
          }

          totalFetched++;
        }

        if (!data.next) {
          console.log(`No more pages. Total stories: ${totalFetched}`);
          break;
        }

        page++;
      }

      console.log(`Sitemap generated with ${totalFetched} stories and ${urls.length} total URLs`);

    } catch (storyError) {
      console.error('Story fetch failed for sitemap:', storyError.message);
    }

    // ============================================================================
    // BUILD XML SITEMAP
    // ============================================================================
    const xmlParts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    for (const u of urls) {
      xmlParts.push('  <url>');
      xmlParts.push(`    <loc>${escapeXml(u.loc)}</loc>`);
      if (u.lastmod) xmlParts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      xmlParts.push(`    <changefreq>${u.changefreq || 'weekly'}</changefreq>`);
      xmlParts.push(`    <priority>${u.priority || '0.5'}</priority>`);
      xmlParts.push('  </url>');
    }

    xmlParts.push('</urlset>');

    const xml = xmlParts.join('\n');

    console.log(`Sitemap generated: ${urls.length} URLs, ${xml.length} bytes`);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200',
      }
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);

    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>${SITE_URL}/pricing</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>${SITE_URL}/tags</loc>
    <priority>0.7</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>${SITE_URL}/verses</loc>
    <priority>0.6</priority>
    <changefreq>weekly</changefreq>
  </url>
</urlset>`;

    return new Response(minimalXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      }
    });
  }
}