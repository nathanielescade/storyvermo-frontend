// src/app/tags/page.js
import Link from 'next/link';
import { absoluteUrl } from '../../../lib/api';

export async function generateMetadata() {
  const title = 'Tags — StoryVermo';
  const description = 'Browse tags to explore creative journeys, trending ideas, and unique stories from StoryVermo creators.';

  const url = absoluteUrl('/tags/');
  const defaultImage = absoluteUrl('/og-tags.png');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [defaultImage],
      siteName: 'StoryVermo',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [defaultImage],
    },
    alternates: { canonical: url }
  };
}

export default async function TagsPage() {
  let tags = [];
  let error = null;
  
  try {
    // Try to fetch tags but handle any errors gracefully
  const response = await fetch(absoluteUrl('/api/tags/trending/'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      tags = await response.json();
      
      // If no trending tags, try recent tags
      if (!Array.isArray(tags) || tags.length === 0) {
  const recentResponse = await fetch(absoluteUrl('/api/tags/recent/'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (recentResponse.ok) {
          tags = await recentResponse.json();
        }
      }
    } else {
      error = `Failed to fetch tags: ${response.status}`;
    }
  } catch (e) {
    console.warn('[tags page] failed to fetch tags', e);
    error = e.message;
    tags = [];
  }

  return (
    <div className="min-h-screen py-12 bg-black/60" style={{ paddingTop: '96px' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="relative">
          <div className="w-full rounded-3xl bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 p-6 shadow-2xl overflow-hidden">

            <header className="relative mb-6 z-10 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500">Tags</h1>
                <p className="text-sm text-gray-300 mt-2">Explore tags and discover stories. Click a tag to open its SEO-friendly page.</p>
                {error && (
                  <p className="text-sm text-red-400 mt-2">Unable to load tags: {error}</p>
                )}
              </div>
            </header>

            <section className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.isArray(tags) && tags.length > 0 ? (
                tags.map((t) => {
                  const name = t?.name || String(t);
                  const slug = t?.slug || String(name).toLowerCase().replace(/\s+/g, '-');
                  const count = t?.story_count || t?.count || null;

                  return (
                    <Link
                      key={t?.id || slug}
                      href={`/tags/${encodeURIComponent(slug)}/`}
                      className="flex items-center justify-between space-x-3 px-4 py-3 bg-slate-900/60 hover:bg-slate-900/70 rounded-2xl transition-shadow duration-200"
                    >
                      <span className="font-semibold text-white truncate">#{name}</span>
                      {count !== null && <span className="text-xs text-gray-400">{count}</span>}
                    </Link>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-gray-400">
                  {error ? 'Unable to load tags at this time.' : 'No tags found.'}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* JSON-LD structured data for tags to improve SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Tags",
        description: "List of tags on StoryVermo",
        url: absoluteUrl('/tags/'),
        itemListElement: (Array.isArray(tags) ? tags : []).map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(`/tags/${encodeURIComponent(t?.slug || (t?.name || '').toLowerCase().replace(/\s+/g, '-'))}/`),
          name: t?.name || t
        }))
      }) }} />
    </div>
  );
}