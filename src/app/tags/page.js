'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { tagsApi } from '../../../lib/api';

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const data = await tagsApi.getPopular();
        setTags(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching tags:', err);
        setError('Failed to load tags');
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen my-12 bg-gradient-to-b from-gray-950 via-slate-950 to-indigo-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-4 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center border border-cyan-500/30">
              <i className="fas fa-hashtag text-cyan-400 text-lg"></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">Explore Tags</h1>
              <p className="text-gray-400 text-sm">Discover stories by category</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900/60 text-white placeholder-gray-500 border border-cyan-500/30 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all"
            />
            <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400/60"></i>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-24">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-4xl text-cyan-400/60 mb-4"></i>
              <p className="text-gray-400">Loading tags...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <i className="fas fa-exclamation-circle text-5xl text-red-500/40 mb-4 block"></i>
            <p className="text-gray-400">{error}</p>
          </div>
        )}

        {/* Tags Grid */}
        {!loading && !error && filteredTags.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filteredTags.map((tag) => (
              <Link
                key={tag.id || tag.slug}
                href={`/tags/${encodeURIComponent(tag.slug)}`}
              >
                <div className="group cursor-pointer rounded-xl p-4 border border-gray-700/40 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/15 hover:-translate-y-1 bg-gradient-to-br from-slate-800/40 to-slate-900/40">
                  {/* Hover bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-t-xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                  {/* Tag Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 mb-3 group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-all border border-cyan-500/20">
                    <i className="fas fa-tag text-cyan-400 text-sm"></i>
                  </div>

                  {/* Tag Name */}
                  <h2 className="text-lg font-bold text-white mb-2 truncate">
                    #{tag.name}
                  </h2>

                  {/* Tag Stats */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <i className="fas fa-book text-cyan-400/60"></i>
                    <span>{tag.story_count || 0} {tag.story_count === 1 ? 'story' : 'stories'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredTags.length === 0 && (
          <div className="text-center py-24">
            <i className="fas fa-inbox text-gray-500/40 text-5xl mb-4 block"></i>
            <p className="text-gray-400 text-lg">
              {searchQuery ? 'No tags found matching your search.' : 'No tags available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
