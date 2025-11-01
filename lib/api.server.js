// lib/api.server.js
// Server-only API helpers that use Next.js server caching (next/cache).
// Import this module only from Server Components (no `use client`).

import { unstable_cache, revalidateTag, updateTag } from 'next/cache';

export const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com';

async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await res.json();
  return null;
}

// Helper to perform a server fetch to backend with credentials included when
// running on the server. We lean on unstable_cache for caching and use
// `next/cache` tags for fine-grained invalidation.
async function fetchJson(url, opts = {}) {
  const merged = {
    method: opts.method || 'GET',
    headers: { Accept: 'application/json', ...(opts.headers || {}) },
    credentials: 'include',
    // Allow callers to pass next: { revalidate } via opts.next
    next: opts.next || undefined,
  };

  const res = await fetch(url, merged);
  if (!res.ok) {
    const body = await safeJson(res);
    const err = new Error(body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return await safeJson(res);
}

// Stories
export const getPaginatedStories = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', String(params.page)); else queryParams.append('page', '1');
  if (params.tag && params.tag !== 'for-you') queryParams.append('tag', params.tag);

  const tag = params.tag || 'for-you';
  const cacheKey = `paginated-stories-${tag}-${params.page || '1'}`;
  const cacheTags = ['feed', `feed-${tag}`, 'stories'];

  const getCachedStories = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/stories/paginated_stories/?${queryParams.toString()}`;
    return await fetchJson(url, { next: { revalidate: 60 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 60 });

  return getCachedStories();
};

export const getPersonalizedFeed = () => {
  const cacheKey = 'personalized-feed';
  const cacheTags = ['feed', 'stories'];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/stories/personalized/`;
    return await fetchJson(url, { next: { revalidate: 60 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 60 });
  return getCached();
};

export const getStoryBySlug = (slug) => {
  const cacheKey = `story-${slug}`;
  const cacheTags = [`story-${slug}`, `story-verses-${slug}`];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/stories/${slug}/`;
    return await fetchJson(url, { next: { revalidate: 600 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 600 });
  return getCached();
};

export const getVersesByStorySlug = (slug) => {
  const cacheKey = `story-verses-${slug}`;
  const cacheTags = [`story-verses-${slug}`, 'verses'];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/stories/${slug}/`;
    const story = await fetchJson(url, { next: { revalidate: 600 } });
    return story?.verses || [];
  }, [cacheKey], { tags: cacheTags, revalidate: 600 });
  return getCached();
};

// Tags
export const getTagFeed = (tag) => {
  const cacheKey = `tag-feed-${tag}`;
  const cacheTags = [`feed-${tag}`, 'tags'];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/tags/${encodeURIComponent(tag)}/feed/`;
    return await fetchJson(url, { next: { revalidate: 90 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 90 });
  return getCached();
};

export const getTagSEO = (tag) => {
  const cacheKey = `tag-seo-${tag}`;
  const cacheTags = [`tag-${tag}`, 'tags'];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/tags/${encodeURIComponent(tag)}/seo/`;
    return await fetchJson(url, { next: { revalidate: 1800 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 1800 });
  return getCached();
};

export const getTrendingTags = () => {
  const cacheKey = 'trending-tags';
  const cacheTags = ['trending', 'tags'];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/tags/trending/`;
    return await fetchJson(url, { next: { revalidate: 120 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 120 });
  return getCached();
};

// Profiles
export const getProfile = (username) => {
  const cacheKey = `user-${username}`;
  const cacheTags = [`user-${username}`, `user-posts-${username}`];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/profiles/${encodeURIComponent(username)}/`;
    return await fetchJson(url, { next: { revalidate: 300 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 300 });
  return getCached();
};

// Notifications and other user-scoped endpoints are usually personalized and
// require authentication; serverside caching should be conservative for those.
export const getNotifications = (userId) => {
  const cacheKey = `notifications-${userId}`;
  const cacheTags = [`notifications-${userId}`];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/notifications/`;
    return await fetchJson(url, { next: { revalidate: 15 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 15 });
  return getCached();
};

// Helpers to invalidate caches after writes
export async function invalidateStoryTags(slug) {
  revalidateTag(`story-${slug}`);
  revalidateTag('feed');
}

export async function invalidateUserPosts(username) {
  revalidateTag(`user-posts-${username}`);
}

export { revalidateTag, updateTag };

// Note: This module is intended for Server Components only. Importing it in
// client components will cause a build-time error because it statically
// imports `next/cache` which is server-only.
