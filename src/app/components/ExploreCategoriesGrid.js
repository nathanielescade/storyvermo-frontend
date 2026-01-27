'use client';

import React, { useState, useEffect } from 'react';
import { tagsApi } from '../../../lib/api';

export default function ExploreCategoriesGrid({ onSelectCategory, onClose }) {
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
        setError('Failed to load categories');
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
    <div className="w-full">
      {/* Header with Search */}
      <div className="sticky top-14 z-20 bg-gradient-to-b from-gray-950 via-slate-950 to-transparent backdrop-blur-sm px-4 py-3 mb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
              Explore Categories
            </h1>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2"
                title="Close"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Search categories/tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-900/60 text-white placeholder-gray-500 border border-cyan-500/30 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all"
            />
            <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400/60"></i>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-24">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-cyan-400/60 mb-4"></i>
            <p className="text-gray-400">Loading categories...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12 px-4">
          <i className="fas fa-exclamation-circle text-5xl text-red-500/40 mb-4 block"></i>
          <p className="text-gray-400">{error}</p>
        </div>
      )}

      {/* Categories Grid */}
      {!loading && !error && filteredTags.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-16 mb-20">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Golden - Featured Stories Card */}
            <button
              onClick={() => onSelectCategory('featured')}
              className="group cursor-pointer rounded-xl p-6 border border-amber-500/60 hover:border-amber-300/100 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-2 bg-gradient-to-br from-amber-900/50 to-yellow-900/40 text-center relative overflow-hidden h-48 lg:col-span-2 lg:row-span-2"
            >
              {/* Hover bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

              {/* Animated background gradient effect - golden */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-600/5 group-hover:from-amber-500/20 group-hover:to-yellow-600/15 transition-all duration-300 animate-pulse"></div>

              {/* Glow effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-radial-gradient pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)'}}></div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between items-center">
                {/* Icon and Title */}
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-amber-500/40 to-yellow-500/30 mb-4 group-hover:from-amber-400/60 group-hover:to-yellow-400/50 transition-all border border-amber-400/60 group-hover:scale-110 duration-300">
                    <i className="fas fa-crown text-amber-200 text-2xl group-hover:animate-bounce"></i>
                  </div>
                  <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-300 group-hover:from-amber-100 group-hover:to-yellow-200 transition-all">
                    Golden
                  </h2>
                </div>

                {/* Stats at bottom */}
                <div className="flex items-center gap-2 text-base text-amber-200/80 group-hover:text-amber-100 transition-colors">
                  <i className="fas fa-sparkles text-amber-300 group-hover:text-amber-200 group-hover:scale-125 transition-all"></i>
                  <span>Exclusive</span>
                </div>
              </div>
            </button>

            {filteredTags.map((tag) => (
              <button
                key={tag.id || tag.slug}
                onClick={() => onSelectCategory(tag.slug)}
                className="group cursor-pointer rounded-xl p-6 border border-gray-700/40 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/15 hover:-translate-y-1 bg-gradient-to-br from-slate-800/40 to-slate-900/40 text-center relative overflow-hidden h-40"
              >
                {/* Hover bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                {/* Background gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-600/0 group-hover:from-cyan-500/5 group-hover:to-blue-600/5 transition-all duration-300"></div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between items-center">
                  {/* Icon and Title */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 mb-3 group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-all border border-cyan-500/20">
                      <i className="fas fa-tag text-cyan-400 text-lg"></i>
                    </div>
                    <h2 className="text-xl font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {tag.name}
                    </h2>
                  </div>

                  {/* Stats at bottom */}
                  <div></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && filteredTags.length === 0 && (
        <div className="text-center py-24 px-4">
          <i className="fas fa-inbox text-gray-500/40 text-5xl mb-4 block"></i>
          <p className="text-gray-400 text-lg">
            {searchQuery ? 'No categories found matching your search.' : 'No categories available.'}
          </p>
        </div>
      )}
    </div>
  );
}
