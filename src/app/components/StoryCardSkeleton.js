'use client';

import React from 'react';

/**
 * Professional skeleton loader for story cards with subtle animations
 * Used during infinite scroll loading
 */
export default function StoryCardSkeleton() {
  return (
    <div className="bg-black overflow-hidden border border-gray-900">
      <div className="p-0 space-y-4">
        {/* Header skeleton - creator chip */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-900 rounded w-24 animate-pulse"></div>
            <div className="h-3 bg-gray-900 rounded w-16 animate-pulse"></div>
          </div>
        </div>

        {/* Cover image skeleton */}
        <div className="w-full h-48 bg-gray-900 rounded-lg animate-pulse"></div>

        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-5 bg-gray-900 rounded w-3/4 animate-pulse"></div>
          <div className="h-5 bg-gray-900 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-900 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-900 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-900 rounded w-2/3 animate-pulse"></div>
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2">
          <div className="h-6 bg-gray-900 rounded-full w-16 animate-pulse"></div>
          <div className="h-6 bg-gray-900 rounded-full w-20 animate-pulse"></div>
          <div className="h-6 bg-gray-900 rounded-full w-14 animate-pulse"></div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex items-center gap-4 pt-2">
          <div className="h-9 bg-gray-900 rounded w-20 animate-pulse"></div>
          <div className="h-9 bg-gray-900 rounded w-20 animate-pulse"></div>
          <div className="h-9 bg-gray-900 rounded w-20 animate-pulse"></div>
          <div className="h-9 bg-gray-900 rounded flex-1 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}