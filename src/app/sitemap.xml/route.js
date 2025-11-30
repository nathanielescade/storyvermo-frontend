const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com';

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

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper to safely fetch from API with error handling
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      console.error(`API fetch failed: ${url} - Status: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API fetch error: ${url}`, error.message);
    return null;
  }
}

export async function GET() {
  try {
    console.log('🗺️  Starting sitemap generation...');
    
    // Static important routes (ALWAYS included)
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

    const seen = new Set();
    
    // Helper to extract slug from story object
    const extractSlug = (s) => {
      if (!s) return null;
      const candidates = [
        s.slug, s.url_slug, s.public_id, 
        s.id, s.pk, s.serialized_slug,
      ];
      for (const c of candidates) {
        if (c) {
          const str = String(c).trim();
          if (str) return str;
        }
      }
      return null;
    };

    // ============================================================================
    // FETCH TAGS (Trending + Recent)
    // ============================================================================
    console.log('📌 Fetching tags...');
    
    try {
      // Fetch trending tags
      const trendingTags = await safeFetch(`${API_URL}/api/tags/trending/`);
      
      if (Array.isArray(trendingTags) && trendingTags.length > 0) {
        console.log(`✅ Found ${trendingTags.length} trending tags`);
        
        trendingTags.slice(0, 100).forEach((t) => {
          const tag = t?.slug || t?.name || (typeof t === 'string' ? t : null);
          if (tag) {
            const tagUrl = `${SITE_URL}/tags/${encodeURIComponent(tag)}`;
            if (!seen.has(tagUrl)) {
              urls.push({ 
                loc: tagUrl, 
                priority: '0.7', 
                changefreq: 'daily' 
              });
              seen.add(tagUrl);
            }
          }
        });
      } else {
        console.log('⚠️  No trending tags found');
      }

      // Fetch recent tags
      const recentTags = await safeFetch(`${API_URL}/api/tags/recent/`);
      
      if (Array.isArray(recentTags) && recentTags.length > 0) {
        console.log(`✅ Found ${recentTags.length} recent tags`);
        
        recentTags.slice(0, 100).forEach((t) => {
          const tag = t?.slug || t?.name || (typeof t === 'string' ? t : null);
          if (tag) {
            const tagUrl = `${SITE_URL}/tags/${encodeURIComponent(tag)}`;
            if (!seen.has(tagUrl)) {
              urls.push({ 
                loc: tagUrl, 
                priority: '0.6', 
                changefreq: 'weekly' 
              });
              seen.add(tagUrl);
            }
          }
        });
      }
    } catch (tagError) {
      console.error('❌ Tag fetch error:', tagError.message);
    }

    // ============================================================================
    // FETCH ALL USERS/CREATORS (NEW!)
    // ============================================================================
    console.log('👥 Fetching all users...');
    
    try {
      // Option 1: Try to get leaderboard (contains all active users)
      const leaderboard = await safeFetch(`${API_URL}/api/profiles/leaderboard/`);
      
      if (leaderboard && Array.isArray(leaderboard.leaderboard)) {
        console.log(`✅ Found ${leaderboard.leaderboard.length} users from leaderboard`);
        
        leaderboard.leaderboard.forEach((entry) => {
          const username = entry?.user?.username;
          if (username) {
            const profileUrl = `${SITE_URL}/${encodeURIComponent(username)}`;
            if (!seen.has(profileUrl)) {
              urls.push({ 
                loc: profileUrl, 
                priority: '0.6', 
                changefreq: 'weekly',
                lastmod: formatDate(entry?.user?.date_joined || entry?.user?.created_at)
              });
              seen.add(profileUrl);
            }
          }
        });
      } else {
        console.log('⚠️  No leaderboard data found');
      }

      // Option 2: Try to get recommended creators (backup)
      const creators = await safeFetch(`${API_URL}/api/stories/recommended_creators/`);
      
      if (Array.isArray(creators) && creators.length > 0) {
        console.log(`✅ Found ${creators.length} recommended creators`);
        
        creators.forEach((creator) => {
          const username = creator?.username;
          if (username) {
            const profileUrl = `${SITE_URL}/${encodeURIComponent(username)}`;
            if (!seen.has(profileUrl)) {
              urls.push({ 
                loc: profileUrl, 
                priority: '0.5', 
                changefreq: 'weekly' 
              });
              seen.add(profileUrl);
            }
          }
        });
      }
    } catch (userError) {
      console.error('❌ User fetch error:', userError.message);
    }

    // ============================================================================
    // FETCH STORIES (Paginated)
    // ============================================================================
    console.log('📚 Fetching stories...');
    
    const MAX_PAGES = 500;
    let page = 1;
    let totalStories = 0;
    
    while (page <= MAX_PAGES && totalStories < 45000) {
      const data = await safeFetch(
        `${API_URL}/api/stories/paginated_stories/?page=${page}`
      );
      
      // Break if no data or empty results
      if (!data || !data.results || data.results.length === 0) {
        if (page === 1) {
          console.log('⚠️  No stories found - database might be empty');
        }
        break;
      }

      console.log(`📄 Page ${page}: ${data.results.length} stories`);

      for (const story of data.results) {
        const slug = extractSlug(story);
        if (!slug) continue;

        const storyUrl = `${SITE_URL}/stories/${encodeURIComponent(slug)}`;
        if (seen.has(storyUrl)) continue;
        seen.add(storyUrl);

        const lastmod = formatDate(
          story?.updated_at || story?.created_at
        );

        urls.push({ 
          loc: storyUrl, 
          lastmod, 
          priority: '0.9', 
          changefreq: 'daily' 
        });

        // Add creator profile (in case they weren't in leaderboard)
        const creator = story?.creator;
        const username = creator?.username;
        
        if (username) {
          const profileUrl = `${SITE_URL}/${encodeURIComponent(username)}`;
          if (!seen.has(profileUrl)) {
            urls.push({ 
              loc: profileUrl, 
              priority: '0.5', 
              changefreq: 'weekly',
              lastmod: formatDate(creator?.date_joined || creator?.created_at)
            });
            seen.add(profileUrl);
          }
        }

        // Add verses
        const verses = Array.isArray(story.verses) ? story.verses : [];
        for (const verse of verses) {
          const verseId = verse?.slug || verse?.id || verse?.public_id;
          if (verseId) {
            const verseUrl = `${SITE_URL}/verses/${encodeURIComponent(verseId)}`;
            if (!seen.has(verseUrl)) {
              urls.push({ 
                loc: verseUrl, 
                priority: '0.4', 
                changefreq: 'monthly' 
              });
              seen.add(verseUrl);
            }
          }

          // Add verse author (in case they're different from story creator)
          const verseAuthor = verse?.author;
          const verseAuthorUsername = verseAuthor?.username;
          
          if (verseAuthorUsername) {
            const authorUrl = `${SITE_URL}/${encodeURIComponent(verseAuthorUsername)}`;
            if (!seen.has(authorUrl)) {
              urls.push({ 
                loc: authorUrl, 
                priority: '0.5', 
                changefreq: 'weekly' 
              });
              seen.add(authorUrl);
            }
          }
        }

        // Add story tags
        const tags = Array.isArray(story.tags) ? story.tags : [];
        for (const tag of tags) {
          const tagName = tag?.slug || tag?.name;
          if (tagName) {
            const tagUrl = `${SITE_URL}/tags/${encodeURIComponent(tagName)}`;
            if (!seen.has(tagUrl)) {
              urls.push({ 
                loc: tagUrl, 
                priority: '0.6', 
                changefreq: 'weekly' 
              });
              seen.add(tagUrl);
            }
          }
        }

        totalStories++;
      }

      // Break if no more pages
      if (!data.next) break;
      page++;
    }

    console.log(`✅ Total stories: ${totalStories}`);
    console.log(`✅ Total URLs: ${urls.length}`);

    // Count each type for logging
    const counts = {
      stories: urls.filter(u => u.loc.includes('/stories/')).length,
      users: urls.filter(u => !u.loc.includes('/stories/') && !u.loc.includes('/tags/') && !u.loc.includes('/verses/') && u.loc.match(/\/[^\/]+$/)).length,
      tags: urls.filter(u => u.loc.includes('/tags/')).length,
      verses: urls.filter(u => u.loc.includes('/verses/')).length,
      static: urls.filter(u => u.loc.match(/\/(about|contact|privacy|terms|login|signup|^$)/)).length,
    };
    
    console.log('📊 URL breakdown:');
    console.log(`   - Stories: ${counts.stories}`);
    console.log(`   - Users: ${counts.users}`);
    console.log(`   - Tags: ${counts.tags}`);
    console.log(`   - Verses: ${counts.verses}`);
    console.log(`   - Static pages: ${counts.static}`);

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
      if (u.changefreq) xmlParts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) xmlParts.push(`    <priority>${u.priority}</priority>`);
      xmlParts.push('  </url>');
    }

    xmlParts.push('</urlset>');

    const xml = xmlParts.join('\n');

    console.log('🎉 Sitemap generated successfully!');

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200',
      }
    });

  } catch (error) {
    console.error('❌ Sitemap generation error:', error);

    // Return minimal valid sitemap on error
    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
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
