// lib/api.js
// Runtime-safe wrappers for next/cache to avoid static server-only imports
// The Next.js `next/cache` module can't be statically imported in files
// consumed by client components. We dynamically import it at runtime when
// executing on the server. On the client we provide safe no-op fallbacks.
function unstable_cache(fn, deps, opts) {
  // Return an async wrapper function that will either use next/cache on the
  // server or directly call the function on the client.
  return async function(...args) {
    if (typeof window === 'undefined') {
      // Server: dynamically import and delegate to Next's unstable_cache
      try {
        const mod = await import('next/cache');
        // delegate to the real unstable_cache which returns a wrapper
        const wrapped = mod.unstable_cache(fn, deps, opts);
        return wrapped(...args);
      } catch (err) {
        console.warn('[api] failed to load next/cache dynamically:', err);
        return fn(...args);
      }
    }

    // Client: just execute the function (no server caching available)
    return fn(...args);
  };
}

async function revalidateTag(tag, opts) {
  if (typeof window === 'undefined') {
    try {
      const mod = await import('next/cache');
      if (typeof mod.revalidateTag === 'function') return mod.revalidateTag(tag, opts);
    } catch (err) {
      console.warn('[api] failed to run revalidateTag:', err);
    }
  }
  // Client - no-op
  return;
}

async function updateTag(tag, opts) {
  if (typeof window === 'undefined') {
    try {
      const mod = await import('next/cache');
      if (typeof mod.updateTag === 'function') return mod.updateTag(tag, opts);
    } catch (err) {
      console.warn('[api] failed to run updateTag:', err);
    }
  }
  // Client - no-op
  return;
}

export const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com';

// Simple in-memory client-side cache for GET requests to reduce duplicate
// network traffic from rapidly-mounted client components (Header, previews, etc).
// Entries: { value, expiresAt }
const clientCache = new Map();

function getClientCacheKey(url, options) {
  // Only vary by URL for now; callers can include query string to vary results.
  return url;
}

// Helper to get CSRF token from cookies
function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

// Helper to get CSRF token from backend if not in cookies
async function ensureCSRFToken() {
  let token = getCookie('csrftoken');
  if (token) return token;
  
  try {
    // Request CSRF token from backend
    await fetch(`${NEXT_PUBLIC_API_URL}/auth/get-csrf-token/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    // Try again after the request
    token = getCookie('csrftoken');
    return token;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return '';
  }
}

// Helper to convert a possibly-relative file path into an absolute URL
export function absoluteUrl(path) {
  if (!path) return '';
  if (typeof path !== 'string') return '';
  // If the path is already an absolute HTTP(s) URL or a blob/data URL (object URL or inline),
  // return it unchanged. Previously blob: URLs were treated as relative and got the API
  // base prefixed which produced nested URLs like
  // "http://api/.../blob:http://..." and broke next/image validation.
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return NEXT_PUBLIC_API_URL.replace(/\/$/, '') + p;
}

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${NEXT_PUBLIC_API_URL}${endpoint}`;
  
  const defaultOptions = {
    credentials: 'include',
    headers: {},
  };
  
  // Add Content-Type for JSON requests
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
  }
  
  // Add Accept header to prefer JSON responses
  defaultOptions.headers['Accept'] = 'application/json';
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // Add CSRF token for unsafe methods
  if (typeof window !== 'undefined') {
    const method = (mergedOptions.method || 'GET').toUpperCase();
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    if (unsafeMethods.includes(method)) {
      // Ensure we have a CSRF token
      const csrfToken = await ensureCSRFToken();
      if (csrfToken) {
        mergedOptions.headers['X-CSRFToken'] = csrfToken;
        console.debug(`[apiRequest] Using CSRF token for ${method} ${url}`);
      } else {
        console.warn(`[apiRequest] No CSRF token available for ${method} ${url}`);
      }
    }
  }
  
  try {
    console.debug(`[API Request] ${mergedOptions.method || 'GET'} ${url}`);

    // Client-side GET caching: if this is a GET and the caller didn't opt out,
    // return a cached value when available and not expired.
    const method = (mergedOptions.method || 'GET').toUpperCase();
    const useClientCache = method === 'GET' && typeof window !== 'undefined' && !mergedOptions.noClientCache;
    const cacheKey = useClientCache ? getClientCacheKey(url, mergedOptions) : null;
    if (useClientCache && cacheKey && clientCache.has(cacheKey)) {
      const entry = clientCache.get(cacheKey);
      if (entry && entry.expiresAt > Date.now()) {
        console.debug('[apiRequest] returning cached response for', url);
        return entry.value;
      } else {
        clientCache.delete(cacheKey);
      }
    }
    // Prevent automatic following of HTML redirects (login pages) which can
    // convert an API request into a GET for an HTML page and produce confusing
    // 403/405 logs on the backend. Prefer to handle redirects manually.
    if (!mergedOptions.redirect) mergedOptions.redirect = 'manual';

    const response = await fetch(url, mergedOptions);

    const contentType = response.headers.get('content-type') || '';
    const responseUrl = response.url || '';

    // If the server redirected to the HTML login page (common when session
    // auth is missing), the fetch may return an HTML document. Detect this
    // pattern and treat it like an Unauthorized (401) so callers don't try to
    // parse HTML as JSON or follow redirects.
    if (contentType.includes('text/html') && responseUrl.includes('/auth/login')) {
      const e = new Error('Unauthorized - redirected to login');
      try { e.status = 401; } catch (ignore) {}
      throw e;
    }
    console.debug(`[API Response] ${response.status} ${contentType}`);

    if (!response.ok) {
      let errorMessage = '';

      // Try to get detailed error from response
      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          errorMessage = data?.message || data?.error || data?.detail || JSON.stringify(data);
        } catch (jsonError) {
          console.warn('[API] Failed to parse error response as JSON:', jsonError);
        }
      }

      // If no JSON error, try text
      if (!errorMessage) {
        try {
          const text = await response.text();
          errorMessage = text || `HTTP ${response.status}`;
        } catch (e) {
          errorMessage = `Request failed with status ${response.status}`;
        }
      }

      // Build a robust Error object with extra context
      const makeError = (message) => {
        const e = new Error(message || 'Request failed');
        try {
          e.status = Number(response.status) || 0;
          e.statusText = response.statusText || '';
          e.url = responseUrl || url;
          e.body = errorMessage;
          try {
            // Attempt to capture headers as a plain object
            const hdrs = {};
            if (response && typeof response.headers?.entries === 'function') {
              for (const [k, v] of response.headers.entries()) hdrs[k] = v;
              e.headers = hdrs;
            }
          } catch (hdrErr) {
            // ignore header extraction errors
          }
          e.code = e.status === 0 ? 'NETWORK_ERROR' : 'API_ERROR';
        } catch (attachErr) {
          // ignore
        }
        return e;
      };

      // If caller requested to suppress errors for certain statuses (used by auth probes),
      // include status 0 (opaque/network failure) so callers that expect a null result
      // won't get an exception for transient network/opaque errors.
      const suppressibleStatuses = [0, 401, 403, 404, 405];
      if (mergedOptions && mergedOptions.suppressErrors && suppressibleStatuses.includes(Number(response.status))) {
        console.debug(`[apiRequest] suppressErrors active - returning null for ${response.status} ${url}`);
        return null;
      }

      // Provide clearer messages for common statuses
      switch (Number(response.status)) {
        case 0:
          throw makeError(`Network/opaque response (status 0) for ${responseUrl || url}`);
        case 401:
          throw makeError('Unauthorized - Please log in again');
        case 403:
          throw makeError('Access denied - You do not have permission to perform this action');
        case 404:
          throw makeError('Not found - The requested resource does not exist');
        case 405:
          throw makeError('Method not allowed - This action is not supported');
        default:
          throw makeError(`API Error (${response.status}): ${errorMessage}`);
      }
    }

    if (contentType.includes('application/json')) {
      try {
        const data = await response.json();

        // Store in client cache if applicable. Default TTL is short to avoid
        // serving stale user-specific data — 5 seconds by default. Callers can
        // set `clientCacheTtl` in seconds to override, or set `noClientCache` to true.
        if (useClientCache && cacheKey) {
          const ttl = (mergedOptions.clientCacheTtl || 5) * 1000;
          clientCache.set(cacheKey, { value: data, expiresAt: Date.now() + ttl });
        }

        return data;
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        return { ok: true, status: response.status };
      }
    }

    return { ok: true, status: response.status };
  } catch (error) {
    console.debug('[apiRequest] request error:', error);
    throw error;
  }
}

// Stories API
export const storiesApi = {
  getPaginatedStories: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) {
      queryParams.append('page', params.page);
    } else {
      queryParams.append('page', '1');
    }
    
    if (params.tag && params.tag !== 'for-you') {
      queryParams.append('tag', params.tag);
    }
    
    const queryString = queryParams.toString();
    
    // Generate cache key and tags
    const tag = params.tag || 'for-you';
    const cacheKey = `paginated-stories-${tag}-${params.page || '1'}`;
    const cacheTags = ['feed', `feed-${tag}`, 'stories'];
    
    // Use caching for GET requests
    const getCachedStories = unstable_cache(
      async () => apiRequest(`/api/stories/paginated_stories/?${queryString}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 60 // 1 minute
      }
    );
    
    return getCachedStories();
  },
  
  getStoryBySlug: async (slug) => {
    // Generate cache key and tags
    const cacheKey = `story-${slug}`;
    const cacheTags = [`story-${slug}`, `story-verses-${slug}`];
    
    // Use caching for GET requests
    const getCachedStory = unstable_cache(
      async () => {
        const data = await apiRequest(`/api/stories/${slug}/`);
        return data;
      },
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 600 // 10 minutes
      }
    );
    
    return getCachedStory();
  },
  
  createStory: async (storyData) => {
    console.log('Creating story with data:', storyData);
    try {
      const response = await apiRequest('/api/stories/', {
        method: 'POST',
        body: JSON.stringify(storyData),
      });
      
      // Invalidate related caches
      revalidateTag('feed');
      revalidateTag('stories');
      if (storyData.creator) {
        revalidateTag(`user-posts-${storyData.creator}`);
      }
      
      console.log('Story creation response:', response);
      return response;
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  },
  
  updateStory: async (slug, storyData) => {
    try {
      const response = await apiRequest(`/api/stories/${slug}/`, {
        method: 'PATCH',
        body: JSON.stringify(storyData),
      });
      
      // Invalidate related caches
      revalidateTag(`story-${slug}`);
      revalidateTag('feed');
      
      return response;
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  },
  
  toggleStoryLike: (storyId) => {
    // Optimistic update - invalidate with profile="max" for stale-while-revalidate
    const promise = apiRequest('/api/interactions/toggle_like/', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    });
    
    // Invalidate the story cache
    revalidateTag(`story-${storyId}`, { profile: 'max' });
    
    return promise;
  },

  toggleStorySave: (storyId) => {
    // Optimistic update - invalidate with profile="max" for stale-while-revalidate
    const promise = apiRequest('/api/interactions/toggle_save/', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    });
    
    // Invalidate related caches
    revalidateTag(`story-${storyId}`, { profile: 'max' });
    revalidateTag('user-saved', { profile: 'max' });
    
    return promise;
  },
  
  getSavedStories: () => {
    // Generate cache key and tags
    const cacheKey = 'saved-stories';
    const cacheTags = ['user-saved', 'stories'];
    
    // Use caching for GET requests
    const getCachedSavedStories = unstable_cache(
      async () => apiRequest('/api/stories/saved/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedSavedStories();
  },
  
  getMyStories: () => {
    // Generate cache key and tags
    const cacheKey = 'my-stories';
    const cacheTags = ['user-stories', 'stories'];
    
    // Use caching for GET requests
    const getCachedMyStories = unstable_cache(
      async () => apiRequest('/api/stories/mine/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedMyStories();
  },
  
  likeStory: (slug) => {
    // Optimistic update - invalidate with profile="max" for stale-while-revalidate
    const promise = apiRequest(`/api/stories/${slug}/interact/`, {
      method: 'POST',
      body: JSON.stringify({ type: 'LIKE' }),
    });
    
    // Invalidate the story cache
    revalidateTag(`story-${slug}`, { profile: 'max' });
    
    return promise;
  },

  saveStory: (slug) => {
    // Optimistic update - invalidate with profile="max" for stale-while-revalidate
    const promise = apiRequest(`/api/stories/${slug}/interact/`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SAVE' }),
    });
    
    // Invalidate related caches
    revalidateTag(`story-${slug}`, { profile: 'max' });
    revalidateTag('user-saved', { profile: 'max' });
    
    return promise;
  },

  shareStory: (slug) => apiRequest(`/api/stories/${slug}/share/`, {
    method: 'POST',
  }),

  recommendStory: (slug, recipients) => apiRequest(`/api/stories/${slug}/recommend/`, {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  }),

  deleteStory: (slug) => {
    const promise = apiRequest(`/api/stories/${slug}/`, {
      method: 'DELETE',
    });
    
    // Invalidate related caches
    revalidateTag(`story-${slug}`);
    revalidateTag('feed');
    
    return promise;
  },

  replaceVerses: (slug, verses) => {
    const promise = apiRequest(`/api/stories/${slug}/replace_verses/`, {
      method: 'POST',
      body: JSON.stringify({ verses }),
    });
    
    // Invalidate related caches
    revalidateTag(`story-${slug}`);
    revalidateTag(`story-verses-${slug}`);
    
    return promise;
  },

  searchStories: (query) => {
    // Generate cache key and tags
    const cacheKey = `search-stories-${encodeURIComponent(query)}`;
    const cacheTags = ['search', 'stories'];
    
    // Use caching for GET requests
    const getCachedSearchResults = unstable_cache(
      async () => apiRequest(`/api/stories/search/?q=${encodeURIComponent(query)}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 120 // 2 minutes
      }
    );
    
    return getCachedSearchResults();
  },
  
  getPersonalizedFeed: () => {
    // Generate cache key and tags
    const cacheKey = 'personalized-feed';
    const cacheTags = ['feed', 'stories'];
    
    // Use caching for GET requests
    const getCachedPersonalizedFeed = unstable_cache(
      async () => apiRequest('/api/stories/personalized/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 60 // 1 minute
      }
    );
    
    return getCachedPersonalizedFeed();
  },
};

// Verses API
export const versesApi = {
  getVersesGrid: () => {
    // Generate cache key and tags
    const cacheKey = 'verses-grid';
    const cacheTags = ['verses'];
    
    // Use caching for GET requests
    const getCachedVersesGrid = unstable_cache(
      async () => apiRequest('/api/verses/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedVersesGrid();
  },

  getVerseById: (id) => {
    // Generate cache key and tags
    const cacheKey = `verse-${id}`;
    const cacheTags = [`verse-${id}`, 'verses'];
    
    // Use caching for GET requests
    const getCachedVerse = unstable_cache(
      async () => apiRequest(`/api/verses/${id}/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 600 // 10 minutes
      }
    );
    
    return getCachedVerse();
  },

  getVerseBySlug: (slug) => {
    // Generate cache key and tags
    const cacheKey = `verse-${slug}`;
    const cacheTags = [`verse-${slug}`, 'verses'];
    
    // Use caching for GET requests
    const getCachedVerse = unstable_cache(
      async () => apiRequest(`/api/verses/${slug}/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 600 // 10 minutes
      }
    );
    
    return getCachedVerse();
  },

  toggleLikeBySlug: (slug) => {
    // Optimistic update - invalidate with profile="max" for stale-while-revalidate
    const promise = apiRequest(`/api/verses/${slug}/interact/`, {
      method: 'POST',
      body: JSON.stringify({ type: 'LIKE' }),
    });
    
    // Invalidate the verse cache
    revalidateTag(`verse-${slug}`, { profile: 'max' });
    
    return promise;
  },

  toggleSaveBySlug: (slug) => {
    // Optimistic update - invalidate with profile="max" for stale-while-revalidate
    const promise = apiRequest(`/api/verses/${slug}/interact/`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SAVE' }),
    });
    
    // Invalidate the verse cache
    revalidateTag(`verse-${slug}`, { profile: 'max' });
    
    return promise;
  },

  getVersesByStorySlug: (slug) => {
    // Generate cache key and tags
    const cacheKey = `story-verses-${slug}`;
    const cacheTags = [`story-verses-${slug}`, 'verses'];
    
    // Use caching for GET requests
    const getCachedVerses = unstable_cache(
      async () => apiRequest(`/api/stories/${slug}/`).then(story => story.verses || []),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 600 // 10 minutes
      }
    );
    
    return getCachedVerses();
  },

  createVerse: async (verseData) => {
    console.log('[versesApi] Creating verse with data:', verseData);
    
    try {
      if (!verseData.story) {
        throw new Error('Story ID is required to create a verse');
      }
      
      const payload = {
        story: verseData.story,
        content: verseData.content || '',
        order: verseData.order || 0,
        image_ids: verseData.image_ids || [],
        allow_empty: verseData.allow_empty || false,
      };
      
      console.log('[versesApi] Sending payload:', payload);
      
      const response = await apiRequest('/api/verses/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      // Invalidate related caches
      if (verseData.story) {
        revalidateTag(`story-verses-${verseData.story}`);
        revalidateTag(`story-${verseData.story}`);
      }
      
      console.log('[versesApi] Verse created successfully:', response);
      return response;
    } catch (error) {
      console.error('[versesApi] Error creating verse:', error);
      
      if (error.message.includes('405')) {
        throw new Error('The verse creation endpoint is not accepting POST requests. Please check your Django ViewSet configuration.');
      } else if (error.message.includes('403')) {
        throw new Error('Permission denied. You may not have permission to create verses for this story.');
      } else if (error.message.includes('400')) {
        throw new Error('Invalid verse data. Please check all required fields.');
      }
      
      throw error;
    }
  },

  updateVerse: async (slug, verseData) => {
    console.log('[versesApi] Updating verse:', slug, verseData);
    
    try {
      const payload = {
        content: verseData.content,
        order: verseData.order,
        image_ids: verseData.image_ids || [],
      };
      
      console.log('[versesApi] Sending update payload:', payload);
      
      const response = await apiRequest(`/api/verses/${slug}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      
      // Invalidate related caches
      revalidateTag(`verse-${slug}`);
      if (verseData.story) {
        revalidateTag(`story-verses-${verseData.story}`);
      }
      
      console.log('[versesApi] Verse updated successfully:', response);
      return response;
    } catch (error) {
      console.error('[versesApi] Error updating verse:', error);
      throw error;
    }
  },

  deleteVerse: (slug) => {
    const promise = apiRequest(`/api/verses/${slug}/`, {
      method: 'DELETE',
    });
    
    // Invalidate related caches
    revalidateTag(`verse-${slug}`);
    
    return promise;
  },

  bulkDeleteVerses: (storySlug) => {
    const promise = apiRequest(`/api/verses/?story=${storySlug}`, {
      method: 'DELETE',
    });
    
    // Invalidate related caches
    revalidateTag(`story-verses-${storySlug}`);
    revalidateTag(`story-${storySlug}`);
    
    return promise;
  },

  searchVerses: (query) => {
    // Generate cache key and tags
    const cacheKey = `search-verses-${encodeURIComponent(query)}`;
    const cacheTags = ['search', 'verses'];
    
    // Use caching for GET requests
    const getCachedSearchResults = unstable_cache(
      async () => apiRequest(`/api/verses/search/?q=${encodeURIComponent(query)}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 120 // 2 minutes
      }
    );
    
    return getCachedSearchResults();
  },
};

// Images API
export const imagesApi = {
  uploadImage: async (imageData) => {
    try {
      const response = await apiRequest('/api/images/', {
        method: 'POST',
        body: imageData,
      });
      return response;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  getImage: (id) => {
    // Generate cache key and tags
    const cacheKey = `image-${id}`;
    const cacheTags = [`image-${id}`, 'images'];
    
    // Use caching for GET requests
    const getCachedImage = unstable_cache(
      async () => apiRequest(`/api/images/${id}/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 1800 // 30 minutes
      }
    );
    
    return getCachedImage();
  },
  
  deleteImage: (id) => apiRequest(`/api/images/${id}/`, {
    method: 'DELETE',
  }),
};

// Moments API
export const momentsApi = {
  createMoment: async (momentData) => {
    try {
      console.log('[momentsApi] Creating moment with data:', momentData);
      
      if (!momentData.verse) {
        throw new Error('Verse ID is required to create a moment');
      }
      
      const payload = {
        verse: momentData.verse,
        order: momentData.order || 0
      };
      
      if (momentData.image_id) {
        payload.image_id = momentData.image_id;
      }
      
      if (momentData.content) {
        payload.content = momentData.content;
      }
      
      console.log('[momentsApi] Sending payload:', payload);
      
      const response = await apiRequest('/api/moments/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      // Invalidate related caches
      if (momentData.verse) {
        revalidateTag(`verse-${momentData.verse}`);
      }
      
      console.log('[momentsApi] Moment created successfully:', response);
      return response;
    } catch (error) {
      console.error('[momentsApi] Error creating moment:', error);
      throw error;
    }
  },

  updateMoment: (publicId, momentData) => {
    const promise = apiRequest(`/api/moments/${publicId}/`, {
      method: 'PATCH',
      body: JSON.stringify(momentData),
    });
    
    // Invalidate related caches
    revalidateTag(`moment-${publicId}`);
    
    return promise;
  },

  deleteMoment: (publicId) => {
    const promise = apiRequest(`/api/moments/${publicId}/`, {
      method: 'DELETE',
    });
    
    // Invalidate related caches
    revalidateTag(`moment-${publicId}`);
    
    return promise;
  },
};

// User/Profile API
export const userApi = {
  getProfile: async (username, currentUsername = null) => {
    // Pattern A: Authenticated User Bypass
    // Don't cache personalized data for current user
    if (currentUsername && username === currentUsername) {
      return apiRequest(`/api/profiles/${username}/`);
    }
    
    // Generate cache key and tags
    const cacheKey = `user-${username}`;
    const cacheTags = [`user-${username}`, `user-posts-${username}`];
    
    // Use caching for GET requests
    const getCachedProfile = unstable_cache(
      async () => {
        try {
          const response = await apiRequest(`/api/profiles/${username}/`);
          return response;
        } catch (error) {
          console.error('Error in getProfile:', error);
          throw error;
        }
      },
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedProfile();
  },

  getUserStories: async (username, currentUsername = null) => {
    // Pattern A: Authenticated User Bypass
    // Don't cache personalized data for current user
    if (currentUsername && username === currentUsername) {
      try {
        const profileData = await apiRequest(`/api/profiles/${username}/`);
        return profileData?.stories || profileData?.created_stories || profileData?.user_stories || [];
      } catch (error) {
        console.error('Error in getUserStories:', error);
        return [];
      }
    }
    
    // Generate cache key and tags
    const cacheKey = `user-posts-${username}`;
    const cacheTags = [`user-posts-${username}`, 'stories'];
    
    // Use caching for GET requests
    const getCachedUserStories = unstable_cache(
      async () => {
        try {
          const profileData = await apiRequest(`/api/profiles/${username}/`);
          return profileData?.stories || profileData?.created_stories || profileData?.user_stories || [];
        } catch (error) {
          console.error('Error in getUserStories:', error);
          return [];
        }
      },
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedUserStories();
  },
  
  followUser: async (username) => {
    try {
      const response = await apiRequest(`/api/follow/toggle/${username}/`, {
        method: 'POST',
      });
      
      // Invalidate with profile="max" for stale-while-revalidate
      revalidateTag(`user-${username}`, { profile: 'max' });
      
      return response;
    } catch (error) {
      console.error('Error in followUser:', error);
      throw error;
    }
  },
  
  getFollowers: (username) => {
    // Generate cache key and tags
    const cacheKey = `user-followers-${username}`;
    const cacheTags = [`user-${username}`, 'followers'];
    
    // Use caching for GET requests
    const getCachedFollowers = unstable_cache(
      async () => apiRequest(`/api/profiles/${username}/followers/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedFollowers();
  },
  
  getFollowing: (username) => {
    // Generate cache key and tags
    const cacheKey = `user-following-${username}`;
    const cacheTags = [`user-${username}`, 'following'];
    
    // Use caching for GET requests
    const getCachedFollowing = unstable_cache(
      async () => apiRequest(`/api/profiles/${username}/following/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedFollowing();
  },
  
  updateProfileImage: (username, imageData) => {
    const promise = apiRequest(`/api/profiles/${username}/update_image/`, {
      method: 'POST',
      body: imageData,
    });
    
    // Invalidate the user profile cache
    revalidateTag(`user-${username}`);
    
    return promise;
  },

  getCurrentUserProfile: () => apiRequest('/auth/profile/'),

  updateCurrentUserProfile: (profileData) => apiRequest('/auth/profile/', {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  }),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (userId) => {
    // Generate cache key and tags
    const cacheKey = `notifications-${userId}`;
    const cacheTags = [`notifications-${userId}`];
    
    // Use caching for GET requests
    const getCachedNotifications = unstable_cache(
      async () => apiRequest('/api/notifications/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 15 // 15 seconds
      }
    );
    
    return getCachedNotifications();
  },
  
  getUnreadNotifications: (userId) => {
    // Generate cache key and tags
    const cacheKey = `notifications-unread-${userId}`;
    const cacheTags = [`notifications-unread-${userId}`];
    
    // Use caching for GET requests
    const getCachedUnreadNotifications = unstable_cache(
      async () => apiRequest('/api/notifications/unread/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 15 // 15 seconds
      }
    );
    
    return getCachedUnreadNotifications();
  },
  
  getUnreadCount: (userId) => {
    // Generate cache key and tags
    const cacheKey = `notifications-unread-count-${userId}`;
    const cacheTags = [`notifications-unread-${userId}`];
    
    // Use caching for GET requests
    const getCachedUnreadCount = unstable_cache(
      async () => apiRequest('/api/notifications/unread_count/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 15 // 15 seconds
      }
    );
    
    return getCachedUnreadCount();
  },
  
  getLatest: (limit = 8, userId) => {
    // Generate cache key and tags
    const cacheKey = `notifications-latest-${userId}-${limit}`;
    const cacheTags = [`notifications-${userId}`];
    
    // Use caching for GET requests
    const getCachedLatest = unstable_cache(
      async () => apiRequest(`/api/notifications/get_latest/?limit=${limit}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 15 // 15 seconds
      }
    );
    
    return getCachedLatest();
  },
  
  markAsRead: (id, userId) => {
    const promise = apiRequest(`/api/notifications/${id}/mark_read/`, {
      method: 'POST',
    });
    
    // Invalidate with profile="max" for stale-while-revalidate
    revalidateTag(`notifications-${userId}`, { profile: 'max' });
    
    return promise;
  },
  
  markAllAsRead: (userId) => {
    const promise = apiRequest('/api/notifications/mark_all_read/', {
      method: 'POST',
    });
    
    // Invalidate with profile="max" for stale-while-revalidate
    revalidateTag(`notifications-${userId}`, { profile: 'max' });
    
    return promise;
  },
};

// Tags API
export const tagsApi = {
  getTrending: () => {
    // Generate cache key and tags
    const cacheKey = 'trending-tags';
    const cacheTags = ['trending', 'tags'];
    
    // Use caching for GET requests
    const getCachedTrending = unstable_cache(
      async () => apiRequest('/api/tags/trending/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 120 // 2 minutes
      }
    );
    
    return getCachedTrending();
  },
  
  getRecent: () => {
    // Generate cache key and tags
    const cacheKey = 'recent-tags';
    const cacheTags = ['tags'];
    
    // Use caching for GET requests
    const getCachedRecent = unstable_cache(
      async () => apiRequest('/api/tags/recent/'),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedRecent();
  },
  
  getTagDetail: (tag) => {
    // Generate cache key and tags
    const cacheKey = `tag-${tag}`;
    const cacheTags = [`tag-${tag}`, 'tags'];
    
    // Use caching for GET requests
    const getCachedTagDetail = unstable_cache(
      async () => apiRequest(`/api/tags/${tag}/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 600 // 10 minutes
      }
    );
    
    return getCachedTagDetail();
  },
  
  getTagFeed: (tag) => {
    // Generate cache key and tags
    const cacheKey = `tag-feed-${tag}`;
    const cacheTags = [`feed-${tag}`, 'tags'];
    
    // Use caching for GET requests
    const getCachedTagFeed = unstable_cache(
      async () => apiRequest(`/api/tags/${tag}/feed/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 90 // 1.5 minutes
      }
    );
    
    return getCachedTagFeed();
  },
  
  getTagSEO: (tag) => {
    // Generate cache key and tags
    const cacheKey = `tag-seo-${tag}`;
    const cacheTags = [`tag-${tag}`, 'tags'];
    
    // Use caching for GET requests
    const getCachedTagSEO = unstable_cache(
      async () => apiRequest(`/api/tags/${tag}/seo/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 1800 // 30 minutes
      }
    );
    
    return getCachedTagSEO();
  },
};

// Search API
export const searchApi = {
  searchStories: (query) => {
    // Generate cache key and tags
    const cacheKey = `search-stories-${encodeURIComponent(query)}`;
    const cacheTags = ['search', 'stories'];
    
    // Use caching for GET requests
    const getCachedSearchResults = unstable_cache(
      async () => apiRequest(`/api/stories/search/?q=${encodeURIComponent(query)}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 120 // 2 minutes
      }
    );
    
    return getCachedSearchResults();
  },
  
  searchVerses: (query) => {
    // Generate cache key and tags
    const cacheKey = `search-verses-${encodeURIComponent(query)}`;
    const cacheTags = ['search', 'verses'];
    
    // Use caching for GET requests
    const getCachedSearchResults = unstable_cache(
      async () => apiRequest(`/api/verses/search/?q=${encodeURIComponent(query)}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 120 // 2 minutes
      }
    );
    
    return getCachedSearchResults();
  },
  
  getRecommendedCreators: (query = '') => {
    // Generate cache key and tags
    const cacheKey = `recommended-creators-${encodeURIComponent(query)}`;
    const cacheTags = ['recommended-creators'];
    
    // Use caching for GET requests
    const getCachedRecommendedCreators = unstable_cache(
      async () => {
        const url = query ? `/api/stories/recommended_creators/?q=${encodeURIComponent(query)}` : '/api/stories/recommended_creators/';
        return apiRequest(url);
      },
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 300 // 5 minutes
      }
    );
    
    return getCachedRecommendedCreators();
  },
};

// Auth API
export const authApi = {
  checkAuth: () => apiRequest('/auth/check/', { suppressErrors: true }),
  
  login: (credentials) => apiRequest('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  register: (userData) => apiRequest('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  logout: () => apiRequest('/auth/logout/', {
    method: 'POST',
  }),

  getUserSettings: () => apiRequest('/auth/settings/'),

  updateUserSettings: (settingsData) => apiRequest('/auth/settings/', {
    method: 'PATCH',
    body: JSON.stringify(settingsData),
  }),
  
  // New endpoint to get CSRF token
  getCSRFToken: () => apiRequest('/auth/get-csrf-token/'),
};

// Metrics API
export const metricsApi = {
  trackImpression: (data) => apiRequest('/api/metrics/impression/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  trackClick: (data) => apiRequest('/api/metrics/click/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// User activities API
export const activitiesApi = {
  trackActivity: (data) => apiRequest('/api/user-activities/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Comments API
export const commentsApi = {
  fetchComments: (storySlug) => {
    // Generate cache key and tags
    const cacheKey = `comments-${storySlug}`;
    const cacheTags = [`comments-${storySlug}`];
    
    // Use caching for GET requests
    const getCachedComments = unstable_cache(
      async () => apiRequest(`/api/comments/?story_slug=${encodeURIComponent(storySlug)}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 30 // 30 seconds
      }
    );
    
    return getCachedComments();
  },
  
  createComment: (commentData) => {
    const promise = apiRequest('/api/comments/', {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
    
    // Invalidate related caches
    if (commentData.story) {
      revalidateTag(`comments-${commentData.story}`);
      revalidateTag(`story-${commentData.story}`);
    }
    
    return promise;
  },
  
  fetchCommentReplies: (commentId) => {
    // Generate cache key and tags
    const cacheKey = `comment-replies-${commentId}`;
    const cacheTags = [`comment-${commentId}`];
    
    // Use caching for GET requests
    const getCachedCommentReplies = unstable_cache(
      async () => apiRequest(`/api/comments/${commentId}/replies/`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 60 // 1 minute
      }
    );
    
    return getCachedCommentReplies();
  },
  
  updateComment: (commentId, commentData) => {
    const promise = apiRequest(`/api/comments/${commentId}/`, {
      method: 'PATCH',
      body: JSON.stringify(commentData),
    });
    
    // Invalidate related caches
    revalidateTag(`comment-${commentId}`);
    
    return promise;
  },
  
  deleteComment: (commentId) => {
    const promise = apiRequest(`/api/comments/${commentId}/`, {
      method: 'DELETE',
    });
    
    // Invalidate related caches
    revalidateTag(`comment-${commentId}`);
    
    return promise;
  },
};

// Media Proxy API
export const mediaApi = {
  getProxiedMedia: (path) => {
    // Generate cache key and tags
    const cacheKey = `media-${encodeURIComponent(path)}`;
    const cacheTags = ['media'];
    
    // Use caching for GET requests
    const getCachedMedia = unstable_cache(
      async () => apiRequest(`/api/stories/media_proxy/?path=${encodeURIComponent(path)}`),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: 3600 // 1 hour
      }
    );
    
    return getCachedMedia();
  },
};

export { apiRequest };