'use client';

import React, { useState, useEffect } from 'react';
import { tagsApi } from '../../../lib/api';

export default function ExploreCategoriesModal({ isOpen, onClose, onSelectTag }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchTags = async () => {
      try {
        setLoading(true);
        const data = await tagsApi.getPopular();
        setTags(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching tags:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [isOpen]);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-gray-900 to-slate-950 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-900/95 to-slate-950/95 backdrop-blur-md border-b border-cyan-500/30 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center border border-cyan-500/30">
                <i className="fas fa-hashtag text-cyan-400"></i>
              </div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Explore Categories</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900/60 text-white placeholder-gray-500 border border-cyan-500/30 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all"
            />
            <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400/60"></i>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-4xl text-cyan-400/60 mb-4"></i>
                <p className="text-gray-400">Loading categories...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-12">
              <i className="fas fa-exclamation-circle text-5xl text-red-500/40 mb-4 block"></i>
              <p className="text-gray-400">{error}</p>
            </div>
          )}

          {!loading && !error && filteredTags.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id || tag.slug}
                  onClick={() => {
                    onSelectTag(tag.slug);
                    onClose();
                  }}
                  className="group cursor-pointer rounded-xl p-4 border border-gray-700/40 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/15 hover:-translate-y-1 bg-gradient-to-br from-slate-800/40 to-slate-900/40 text-left"
                >
                  {/* Hover bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-t-xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                  {/* Tag Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 mb-3 group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-all border border-cyan-500/20">
                    <i className="fas fa-tag text-cyan-400 text-sm"></i>
                  </div>

                  {/* Tag Name */}
                  <h3 className="text-lg font-bold text-white mb-2 truncate">
                    {tag.name}
                  </h3>

                  {/* Tag Stats */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <i className="fas fa-book text-cyan-400/60"></i>
                    <span>{tag.story_count || 0} {tag.story_count === 1 ? 'story' : 'stories'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && !error && filteredTags.length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-inbox text-gray-500/40 text-5xl mb-4 block"></i>
              <p className="text-gray-400 text-lg">
                {searchQuery ? 'No categories found matching your search.' : 'No categories available.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
