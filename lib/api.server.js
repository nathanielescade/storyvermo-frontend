// lib/api.server.js - UPDATED for personalized feed integration

export const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

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
export const getPaginatedStories = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', String(params.page)); 
  else queryParams.append('page', '1');
  
  // Support 'personalized' tag
  if (params.tag && params.tag !== 'for-you') {
    queryParams.append('tag', params.tag);
  }

  const url = `${NEXT_PUBLIC_API_URL}/api/stories/paginated_stories/?${queryParams.toString()}`;
  try {
    return await fetchJson(url, { next: { revalidate: 60 } });
  } catch (e) {
    console.warn('getPaginatedStories fetch failed, returning empty page:', e);
    return { results: [], next: null };
  }
};

// ✅ UPDATED: Now uses paginated_stories with personalized tag
export const getPersonalizedFeed = async (page = 1) => {
  const queryParams = new URLSearchParams();
  queryParams.append('page', String(page));
  queryParams.append('tag', 'personalized');
  
  const url = `${NEXT_PUBLIC_API_URL}/api/stories/paginated_stories/?${queryParams.toString()}`;
  try {
    return await fetchJson(url, { next: { revalidate: 60 } });
  } catch (e) {
    console.warn('getPersonalizedFeed fetch failed:', e);
    return { results: [], next: null };
  }
};

export const getStoryBySlug = async (slug) => {
  const url = `${NEXT_PUBLIC_API_URL}/api/stories/${slug}/`;
  return await fetchJson(url, { next: { revalidate: 600 } });
};

export const getVersesByStorySlug = async (slug) => {
  const url = `${NEXT_PUBLIC_API_URL}/api/stories/${slug}/`;
  const story = await fetchJson(url, { next: { revalidate: 600 } });
  return story?.verses || [];
};

// Tags
export const getTagFeed = async (tag) => {
  const url = `${NEXT_PUBLIC_API_URL}/api/tags/${encodeURIComponent(tag)}/feed/`;
  return await fetchJson(url, { next: { revalidate: 90 } });
};

export const getTagSEO = async (tag) => {
  const url = `${NEXT_PUBLIC_API_URL}/api/tags/${encodeURIComponent(tag)}/seo/`;
  return await fetchJson(url, { next: { revalidate: 1800 } });
};

export const getTrendingTags = async () => {
  const url = `${NEXT_PUBLIC_API_URL}/api/tags/trending/`;
  try {
    return await fetchJson(url, { next: { revalidate: 120 } });
  } catch (e) {
    console.warn('getTrendingTags fetch failed, returning empty array:', e);
    return [];
  }
};

// Profiles
export const getProfile = async (username) => {
  const url = `${NEXT_PUBLIC_API_URL}/api/profiles/${encodeURIComponent(username)}/`;
  return await fetchJson(url, { next: { revalidate: 300 } });
};

export const getNotifications = async (userId) => {
  const url = `${NEXT_PUBLIC_API_URL}/api/notifications/`;
  return await fetchJson(url, { next: { revalidate: 15 } });
};