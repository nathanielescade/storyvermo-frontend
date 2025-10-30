// src/app/verses/page.js
import Link from 'next/link';
import { absoluteUrl } from '../../../lib/api';

export async function generateMetadata() {
  const title = 'Verses — StoryVermo';
  const description = 'Browse recent verses from stories on StoryVermo.';
  const url = absoluteUrl('/verses/');
  return { title, description, alternates: { canonical: url } };
}

export default async function VersesPage() {
  let verses = [];
  let error = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verses/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (res.ok) {
      verses = await res.json();
    } else {
      error = `Failed to fetch verses: ${res.status}`;
    }
  } catch (e) {
    console.warn('[verses page] failed to fetch verses', e);
    error = e.message;
    verses = [];
  }

  return (
    <div className="min-h-screen py-12 bg-black/60" style={{ paddingTop: '96px' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="w-full rounded-3xl bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 p-6 shadow-2xl overflow-hidden">
          <header className="mb-6">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500">Verses</h1>
            <p className="text-sm text-gray-300 mt-2">Browse verses from stories. Click a verse to open its story and jump to that verse.</p>
            {error && <p className="text-sm text-red-400 mt-2">Unable to load verses: {error}</p>}
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.isArray(verses) && verses.length > 0 ? (
              verses.map((v) => {
                const id = v.id || v.public_id || v.slug || '';
                const storyObj = v.story || {};
                const storySlug = (typeof storyObj === 'string' ? storyObj : (storyObj.slug || storyObj.story_slug)) || v.story_slug || '';
                const storyTitle = (typeof storyObj === 'object' && storyObj) ? (storyObj.title || storyObj.story_title) : (v.story_title || 'Story');
                const excerpt = v.content ? v.content.slice(0, 120) : '';

                // Helper: extract first moment image for use as thumbnail
                const getFirstMomentImage = (verse) => {
                  if (!verse) return null;
                  const moments = verse.moments || verse.images || [];
                  const first = Array.isArray(moments) && moments.length > 0 ? moments[0] : null;
                  if (!first) return null;
                  // first may be string, object with url/file_url/image
                  if (typeof first === 'string') return absoluteUrl(first);
                  if (first.file_url) return absoluteUrl(first.file_url);
                  if (first.url) return absoluteUrl(first.url);
                  if (first.image) {
                    if (typeof first.image === 'string') return absoluteUrl(first.image);
                    if (first.image.file_url) return absoluteUrl(first.image.file_url);
                    if (first.image.url) return absoluteUrl(first.image.url);
                  }
                  return null;
                };

                const thumb = getFirstMomentImage(v);
                const momentsCount = Array.isArray(v.moments) ? v.moments.length : (Array.isArray(v.images) ? v.images.length : 0);
                const likes = v.likes_count || v.like_count || v.likes || 0;
                const saves = v.saves_count || v.save_count || v.saves || 0;

                // Title handling: avoid CSS-only clamping which caused short titles to show ellipsis.
                // We'll manually truncate in JS only for long titles so one- or two-word titles display fully.
                const rawTitle = (v.title && String(v.title).trim()) || (excerpt ? `${excerpt}...` : 'Untitled Verse');
                const displayTitle = rawTitle.length > 80 ? `${rawTitle.slice(0, 80).trim()}...` : rawTitle;
                const displayStoryTitle = (storyTitle && String(storyTitle).trim()) || 'Story';

                const href = storySlug ? `/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(id)}` : '#';

                return (
                  <Link
                    key={id || Math.random().toString(36).slice(2,8)}
                    href={href}
                    className="block bg-slate-900/50 hover:bg-slate-900/70 rounded-2xl overflow-hidden transition-shadow shadow-md"
                  >
                    <div className="relative w-full h-44 bg-gray-800">
                      {thumb ? (
                        // Use a plain img for server-safe rendering; client will still optimize via CDN if configured
                        <img src={thumb} alt={v.title || 'Verse image'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white/20">
                          <i className="fas fa-book-open text-4xl"></i>
                        </div>
                      )}

                      <div className="absolute left-3 top-3 bg-black/40 text-xs text-white px-2 py-1 rounded-xl">
                        {momentsCount} {momentsCount === 1 ? 'moment' : 'moments'}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="text-sm text-gray-400 mb-1">{displayStoryTitle}</div>
                      <div className="text-white font-semibold mb-2">{displayTitle}</div>
                      <div className="text-xs text-gray-400 mb-2">in <span className="text-indigo-300">{displayStoryTitle}</span></div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div>By {v.author?.username || v.author_name || 'Unknown'}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1"><i className="fas fa-heart text-sm text-rose-400"></i><span>{likes}</span></div>
                          <div className="flex items-center gap-1"><i className="fas fa-bookmark text-sm text-yellow-400"></i><span>{saves}</span></div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center text-gray-400">{error ? 'Unable to load verses at this time.' : 'No verses found.'}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
