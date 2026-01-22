'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { absoluteUrl } from '../../../lib/api';

const VERSES_PER_PAGE = 10;

export default function VersesClient() {
  const [verses, setVerses] = useState([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const observerTarget = useRef(null);

  // Fetch verses for current page
  const fetchVerses = useCallback(async (pageNum) => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(absoluteUrl('/api/verses/'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (res.ok) {
        let allVerses = await res.json();
        // Shuffle verses for random display
        allVerses = allVerses.sort(() => Math.random() - 0.5);
        
        // Calculate pagination
        const startIdx = pageNum * VERSES_PER_PAGE;
        const endIdx = startIdx + VERSES_PER_PAGE;
        const paginatedVerses = allVerses.slice(startIdx, endIdx);
        
        if (paginatedVerses.length === 0 && pageNum > 0) {
          setHasMore(false);
        } else {
          setVerses(prev => [...prev, ...paginatedVerses]);
        }
      } else {
        setError(`Failed to fetch verses: ${res.status}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore]);

  // Initial load
  useEffect(() => {
    fetchVerses(0);
    setPage(1);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchVerses(page);
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [page, hasMore, isLoading, fetchVerses]);

  return (
    <>
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <i className="fas fa-exclamation-circle"></i>
            Unable to load verses: {error}
          </p>
        </div>
      )}

      <div className="w-full rounded-3xl bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 p-6 md:p-8 shadow-2xl border border-cyan-500/20 relative overflow-hidden">
        {/* Animated border effects */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
          <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {verses.length > 0 ? (
            verses.map((v) => {
              const id = v.id || v.public_id || v.slug || '';
              const storyObj = v.story || {};
              const storySlug = (typeof storyObj === 'string' ? storyObj : (storyObj.slug || storyObj.story_slug)) || v.story_slug || '';
              const storyTitle = (typeof storyObj === 'object' && storyObj) ? (storyObj.title || storyObj.story_title) : (v.story_title || 'Story');

              // Helper: extract first moment image for use as thumbnail
              const getFirstMomentImage = (verse) => {
                if (!verse) return null;
                const moments = verse.moments || verse.images || [];
                const first = Array.isArray(moments) && moments.length > 0 ? moments[0] : null;
                if (!first) return null;
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

              const displayTitle = (v.content && String(v.content).trim()) || 'Untitled Verse';
              const displayStoryTitle = (storyTitle && String(storyTitle).trim()) || 'Story';

              const href = storySlug ? `/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(id)}` : '#';

              return (
                <Link
                  key={id || Math.random().toString(36).slice(2, 8)}
                  href={href}
                  className="block bg-gradient-to-br from-slate-900/50 to-indigo-900/30 rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20 border border-gray-800/50 hover:border-cyan-500/40 group"
                >
                  <div className="relative w-full h-52 bg-gradient-to-br from-gray-900 to-slate-900">
                    {thumb ? (
                      <Image 
                        src={thumb} 
                        alt={v.title || 'Verse image'} 
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110" 
                        quality={75}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-indigo-900/30 to-slate-900 flex items-center justify-center text-cyan-400/30">
                        <i className="fas fa-book-open text-5xl"></i>
                      </div>
                    )}

                    {/* Enhanced gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Moments badge */}
                    <div className="absolute left-3 top-3 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 backdrop-blur-sm text-xs text-white px-3 py-1.5 rounded-xl font-medium shadow-lg border border-cyan-400/30">
                      <i className="fas fa-images mr-1.5"></i>
                      {momentsCount} {momentsCount === 1 ? 'moment' : 'moments'}
                    </div>

                    {/* Author chip */}
                    <div className="absolute left-3 bottom-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-700/50 shadow-lg">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        {(() => {
                          const author = v.author;
                          let displayName = v.author_name || '';
                          if (author) {
                            displayName = author.account_type === 'brand' && author.brand_name 
                              ? author.brand_name 
                              : author.username || author.author_name || '';
                          }
                          if (!displayName) return 'U';
                          return displayName.split(' ').map(s => s[0]?.toUpperCase()).slice(0, 2).join('');
                        })()}
                      </div>
                      <div className="text-xs text-white/90 font-medium">
                        {(() => {
                          const author = v.author;
                          if (author && author.account_type === 'brand' && author.brand_name) {
                            return author.brand_name;
                          }
                          return author?.username || v.author_name || 'Unknown';
                        })()}
                      </div>
                    </div>

                    {/* Engagement counters */}
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs border border-rose-500/30 shadow-lg">
                        <i className="fas fa-heart text-rose-400"></i>
                        <span className="text-white font-semibold">{likes}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs border border-yellow-500/30 shadow-lg">
                        <i className="fas fa-bookmark text-yellow-400"></i>
                        <span className="text-white font-semibold">{saves}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-slate-900/80 to-indigo-900/40">
                    <div className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                      <i className="fas fa-book text-indigo-400"></i>
                      <span className="text-indigo-300 font-medium">{displayStoryTitle}</span>
                    </div>
                    <div className="text-white font-semibold mb-1 text-base leading-tight line-clamp-2 group-hover:text-cyan-300 transition-colors duration-300">
                      {displayTitle}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16">
              <div className="inline-flex flex-col items-center gap-4 p-8 bg-gradient-to-br from-slate-900/50 to-indigo-900/30 rounded-2xl border border-gray-800/50">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-slate-900 flex items-center justify-center">
                  <i className="fas fa-book-open text-3xl text-gray-600"></i>
                </div>
                <p className="text-gray-400 text-lg">
                  {error ? 'Unable to load verses at this time.' : 'No verses found.'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Loading indicator and infinite scroll target */}
        {hasMore && (
          <div
            ref={observerTarget}
            className="flex justify-center items-center py-8 mt-8"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-gray-400 ml-3 text-sm">Loading more verses...</p>
          </div>
        )}
      </div>
    </>
  );
}
