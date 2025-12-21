import React from 'react';

/**
 * Simple, clean skeleton loader
 */
export default function StoryCardSkeleton() {
  return (
    <div className="bg-black/40 overflow-hidden border border-gray-800/30 rounded-lg">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800/50 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-800/50 rounded w-28 animate-pulse"></div>
            <div className="h-2 bg-gray-800/30 rounded w-16 animate-pulse"></div>
          </div>
        </div>

        {/* Image */}
        <div className="w-full aspect-video bg-gray-800/50 rounded-lg animate-pulse"></div>

        {/* Title */}
        <div className="space-y-2">
          <div className="h-5 bg-gray-800/50 rounded w-3/4 animate-pulse"></div>
          <div className="h-5 bg-gray-800/40 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-800/40 rounded w-full animate-pulse"></div>
          <div className="h-3 bg-gray-800/40 rounded w-11/12 animate-pulse"></div>
          <div className="h-3 bg-gray-800/30 rounded w-2/3 animate-pulse"></div>
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          <div className="h-6 bg-gray-800/40 rounded-full w-16 animate-pulse"></div>
          <div className="h-6 bg-gray-800/40 rounded-full w-20 animate-pulse"></div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-8 bg-gray-800/40 rounded w-20 animate-pulse"></div>
          <div className="h-8 bg-gray-800/40 rounded w-20 animate-pulse"></div>
          <div className="flex-1"></div>
          <div className="h-8 bg-gray-800/40 rounded w-24 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}