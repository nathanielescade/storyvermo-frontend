'use client';

import React from 'react';

/**
 * Professional skeleton loader for story cards with subtle animations
 * Used during infinite scroll loading
 */
export default function StoryCardSkeleton() {
  return (
    <div className="bg-zinc-900  overflow-hidden border border-zinc-800">
      <div className="p-0 space-y-4">
        {/* Header skeleton - creator chip */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse"></div>
            <div className="h-3 bg-zinc-800 rounded w-16 animate-pulse"></div>
          </div>
        </div>

        {/* Cover image skeleton */}
        <div className="w-full h-48 bg-zinc-800 rounded-lg animate-pulse"></div>

        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-5 bg-zinc-800 rounded w-3/4 animate-pulse"></div>
          <div className="h-5 bg-zinc-800 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-zinc-800 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse"></div>
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2">
          <div className="h-6 bg-zinc-800 rounded-full w-16 animate-pulse"></div>
          <div className="h-6 bg-zinc-800 rounded-full w-20 animate-pulse"></div>
          <div className="h-6 bg-zinc-800 rounded-full w-14 animate-pulse"></div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex items-center gap-4 pt-2">
          <div className="h-9 bg-zinc-800 rounded w-20 animate-pulse"></div>
          <div className="h-9 bg-zinc-800 rounded w-20 animate-pulse"></div>
          <div className="h-9 bg-zinc-800 rounded w-20 animate-pulse"></div>
          <div className="h-9 bg-zinc-800 rounded flex-1 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}