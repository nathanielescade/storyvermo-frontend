'use client';

import TagsClient from '../components/TagsClient';

export default function TagsPage() {
  return <TagsClient />;
}

// All code below this line was legacy and is now removed for SPA-style build correctness.
    
    // Get the tag image if available
    const tagImage = tagImages[slug] || siteUrl('/og-image.png');
    
    // Set the tag data for the modal
    setSelectedTag({
      name,
      slug,
      url: tagUrl,
      count: tag?.story_count || tag?.count || 0,
      image: tagImage
    });
    
    // Open the share modal
    setShareModalOpen(true);
  };

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
                  const count = t?.story_count || t?.count || 0;

                  return (
                    <Link
                      key={t?.id || slug}
                      href={`/tags/${encodeURIComponent(slug)}/`}
                      className="flex flex-col items-start justify-between px-4 py-3 bg-slate-900/60 hover:bg-slate-900/70 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20 relative group"
                    >
                      <span className="font-semibold text-white truncate">#{name}</span>
                      <div className="flex items-center justify-between w-full mt-2">
                        <span className="text-xs text-cyan-400 font-medium">
                          {count} {count === 1 ? 'story' : 'stories'}
                        </span>
                        <button
                          onClick={(e) => handleShareTag(t, e)}
                          className="text-gray-400 hover:text-white hover:scale-110 transition-all duration-200"
                          aria-label="Share tag"
                          title="Share this tag"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                      </div>
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

      {/* Share Modal */}
      {selectedTag && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedTag(null);
          }}
          shareData={{
            title: `Explore #${selectedTag.name}`,
            description: `Check out the #${selectedTag.name} tag on StoryVermo with ${selectedTag.count} ${selectedTag.count === 1 ? 'story' : 'stories'}. Discover amazing stories and join our creative community!`,
            url: selectedTag.url
          }}
          imageUrl={selectedTag.image}
        />
      )}

      {/* JSON-LD structured data for tags to improve SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Tags",
        description: "List of tags on StoryVermo",
        url: siteUrl('/tags/'),
        itemListElement: (Array.isArray(tags) ? tags : []).map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: siteUrl(`/tags/${encodeURIComponent(t?.slug || (t?.name || '').toLowerCase().replace(/\s+/g, '-'))}/`),
          name: t?.name || t
        }))
      }) }} />
    </div>
  );
}
