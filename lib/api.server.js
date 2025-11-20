// lib/api.server.js - UPDATED for personalized feed integration

import { unstable_cache, revalidateTag, updateTag } from 'next/cache';

export const NEXT_PUBLIC_API_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com')
    .replace(/\/+$/, '');  // 🔥 remove trailing slashes


async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await res.json();
  return null;
}

async function fetchJson(url, opts = {}) {
  const merged = {
    method: opts.method || 'GET',
    headers: { Accept: 'application/json', ...(opts.headers || {}) },
    credentials: 'include',
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

// ✅ UPDATED: Handle personalized tag properly
export const getPaginatedStories = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', String(params.page)); 
  else queryParams.append('page', '1');
  
  // Support 'personalized' tag
  if (params.tag && params.tag !== 'for-you') {
    queryParams.append('tag', params.tag);
  }

  const tag = params.tag || 'for-you';
  const cacheKey = `paginated-stories-${tag}-${params.page || '1'}`;
  const cacheTags = ['feed', `feed-${tag}`, 'stories'];

  const getCachedStories = unstable_cache(async () => {
  const url = `${NEXT_PUBLIC_API_URL}/api/stories/paginated_stories?${queryParams.toString()}`;
    try {
      return await fetchJson(url, { next: { revalidate: 60 } });
    } catch (e) {
      console.warn('getPaginatedStories fetch failed, returning empty page:', e);
      return { results: [], next: null };
    }
  }, [cacheKey], { tags: cacheTags, revalidate: 60 });

  return getCachedStories();
};

// ✅ UPDATED: Now uses paginated_stories with personalized tag
export const getPersonalizedFeed = (page = 1) => {
  const cacheKey = `personalized-feed-${page}`;
  const cacheTags = ['feed', 'feed-personalized', 'stories'];
  
  const getCached = unstable_cache(async () => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', String(page));
    queryParams.append('tag', 'personalized');
    
  const url = `${NEXT_PUBLIC_API_URL}/api/stories/paginated_stories?${queryParams.toString()}`;
    try {
      return await fetchJson(url, { next: { revalidate: 60 } });
    } catch (e) {
      console.warn('getPersonalizedFeed fetch failed:', e);
      return { results: [], next: null };
    }
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
    try {
      return await fetchJson(url, { next: { revalidate: 120 } });
    } catch (e) {
      console.warn('getTrendingTags fetch failed, returning empty array:', e);
      return [];
    }
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

export const getNotifications = (userId) => {
  const cacheKey = `notifications-${userId}`;
  const cacheTags = [`notifications-${userId}`];
  const getCached = unstable_cache(async () => {
    const url = `${NEXT_PUBLIC_API_URL}/api/notifications/`;
    return await fetchJson(url, { next: { revalidate: 15 } });
  }, [cacheKey], { tags: cacheTags, revalidate: 15 });
  return getCached();
};

// Helpers to invalidate caches
export async function invalidateStoryTags(slug) {
  revalidateTag(`story-${slug}`);
  revalidateTag('feed');
}

export async function invalidateUserPosts(username) {
  revalidateTag(`user-posts-${username}`);
}

export { revalidateTag, updateTag };