// lib/api.js
// Runtime-safe wrappers for next/cache to avoid static server-only imports
// The Next.js `next/cache` module can't be statically imported in files
// consumed by client components. We dynamically import it at runtime when
// executing on the server. On the client we provide safe no-op fallbacks.

export const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com';
export const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';


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
    await apiRequest('/auth/get-csrf-token/', {
      method: 'GET',
    });
    
    // Try again after the request
    token = getCookie('csrftoken');
    return token;
  } catch (error) {
    return '';
  }
}

// Helper to convert a possibly-relative file path into an absolute URL
// lib/api.js - Recommended Fix for absoluteUrl

export function absoluteUrl(path) {
  if (!path) return '';
  if (typeof path !== 'string') return '';
  
  // Handle protocol-relative URLs (//)
  if (path.startsWith('//')) {
      return path; 
  }

  // If the path is already an absolute HTTP(s) URL or a blob/data URL,
  // return it unchanged.
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) return path;

  // If the path starts with /media/ or media/, use the CDN base URL
  if (path.startsWith('/media/') || path.startsWith('media/')) {
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://storyvermo.nyc3.cdn.digitaloceanspaces.com';
    // Ensure the path has a leading slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${cdnUrl}${normalizedPath}`;
  }

  // Otherwise, treat it as a relative API path
  const p = path.startsWith('/') ? path : `/${path}`;
  return NEXT_PUBLIC_API_URL.replace(/\/$/, '') + p;
}

// Helper to build frontend/site URLs (for canonical URLs, metadata, sitemaps)
export function siteUrl(path) {
  if (!path) return NEXT_PUBLIC_SITE_URL;
  if (typeof path !== 'string') return NEXT_PUBLIC_SITE_URL;

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) return path;

  const p = path.startsWith('/') ? path : `/${path}`;
  return NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') + p;
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
      } else {
      }
    }
  }
  
  try {

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

    if (!response.ok) {
      let errorMessage = '';

      // Try to get detailed error from response
      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          errorMessage = data?.message || data?.error || data?.detail || JSON.stringify(data);
        } catch (jsonError) {
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

      // Log detailed error information to aid debugging (includes headers and body)
      try {
        const dbgHdrs = {};
        if (response && typeof response.headers?.entries === 'function') {
          for (const [k, v] of response.headers.entries()) dbgHdrs[k] = v;
        }

      } catch (logErr) {
        // ignore logging problems
      }

      // If caller requested to suppress errors for certain statuses (used by auth probes),
      // include status 0 (opaque/network failure) so callers that expect a null result
      // won't get an exception for transient network/opaque errors.
      const suppressibleStatuses = [0, 401, 403, 404, 405];
      if (mergedOptions && mergedOptions.suppressErrors && suppressibleStatuses.includes(Number(response.status))) {
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
        return data;
      } catch (jsonError) {
        return { ok: true, status: response.status };
      }
    }

    return { ok: true, status: response.status };
  } catch (error) {
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
    
    return apiRequest(`/api/stories/paginated_stories/?${queryString}`);
  },
  
  getStoryBySlug: async (slug) => {
    return apiRequest(`/api/stories/${slug}/`);
  },
  
  createStory: async (storyData) => {
    try {
      const response = await apiRequest('/api/stories/', {
        method: 'POST',
        body: JSON.stringify(storyData),
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  updateStory: async (slug, storyData) => {
    try {
      const response = await apiRequest(`/api/stories/${slug}/`, {
        method: 'PATCH',
        body: JSON.stringify(storyData),
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  toggleStoryLike: (storyId) => {
    return apiRequest('/api/interactions/toggle_story_like/', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    });
  },

  toggleStorySave: (storyId) => {
    return apiRequest('/api/interactions/toggle_story_save/', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    });
  },
  
  getSavedStories: () => {
    return apiRequest('/api/interactions/saved_stories/');
  },
  
  getMyStories: () => {
    return apiRequest('/api/stories/mine/');
  },
  


  shareStory: (slug) => apiRequest(`/api/stories/${slug}/share/`, {
    method: 'POST',
  }),

  recommendStory: (slug, usernames) => apiRequest(`/api/stories/${slug}/recommend/`, {
    method: 'POST',
    body: JSON.stringify({ usernames }),
  }),

  deleteStory: (slug) => {
    return apiRequest(`/api/stories/${slug}/`, {
      method: 'DELETE',
    });
  },

  replaceVerses: (slug, verses) => {
    return apiRequest(`/api/stories/${slug}/replace_verses/`, {
      method: 'POST',
      body: JSON.stringify({ verses }),
    });
  },

  searchStories: (query) => {
    return apiRequest(`/api/stories/search/?q=${encodeURIComponent(query)}`);
  },
  
  getPersonalizedFeed: () => {
    return apiRequest('/api/stories/personalized/');
  },
};

// Verses API
export const versesApi = {
  getVersesGrid: () => {
    return apiRequest('/api/verses/');
  },

  getVerseById: (id) => {
    return apiRequest(`/api/verses/${id}/`);
  },

  getVerseBySlug: (slug) => {
    return apiRequest(`/api/verses/${slug}/`);
  },

  toggleLikeBySlug: (slug) => {
    return apiRequest(`/api/verses/${slug}/interact/`, {
      method: 'POST',
      body: JSON.stringify({ type: 'LIKE' }),
    });
  },

  toggleSaveBySlug: (slug) => {
    return apiRequest(`/api/verses/${slug}/interact/`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SAVE' }),
    });
  },

  getVersesByStorySlug: (slug) => {
    return apiRequest(`/api/stories/${slug}/`).then(story => story.verses || []);
  },

  createVerse: async (verseData) => {
    
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
      
      
      const response = await apiRequest('/api/verses/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      return response;
    } catch (error) {
      
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
    
    try {
      const payload = {
        content: verseData.content,
      };
      
      // Only include order if provided
      if (verseData.order !== undefined) {
        payload.order = verseData.order;
      }
      
      // Include image_ids if provided
      if (verseData.image_ids && verseData.image_ids.length > 0) {
        payload.image_ids = verseData.image_ids;
      }
      
      
      const response = await apiRequest(`/api/verses/${slug}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  deleteVerse: (slug) => {
    return apiRequest(`/api/verses/${slug}/`, {
      method: 'DELETE',
    });
  },

  bulkDeleteVerses: (storySlug) => {
    return apiRequest(`/api/verses/?story=${storySlug}`, {
      method: 'DELETE',
    });
  },

  searchVerses: (query) => {
    return apiRequest(`/api/verses/search/?q=${encodeURIComponent(query)}`);
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
      throw error;
    }
  },

  getImage: (id) => {
    return apiRequest(`/api/images/${id}/`);
  },
  
  deleteImage: (id) => apiRequest(`/api/images/${id}/`, {
    method: 'DELETE',
  }),
};

// Moments API
export const momentsApi = {
  createMoment: async (momentData) => {
    try {
      
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
      
      
      const response = await apiRequest('/api/moments/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateMoment: (publicId, momentData) => {
    return apiRequest(`/api/moments/${publicId}/`, {
      method: 'PATCH',
      body: JSON.stringify(momentData),
    });
  },

  deleteMoment: (publicId) => {
    return apiRequest(`/api/moments/${publicId}/`, {
      method: 'DELETE',
    });
  },
};

// User/Profile API
export const userApi = {
  getProfile: async (username, currentUsername = null) => {
    // Don't cache personalized data for current user
    if (currentUsername && username === currentUsername) {
      return apiRequest(`/api/profiles/${username}/`);
    }
    
    try {
      const response = await apiRequest(`/api/profiles/${username}/`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getUserStories: async (username, currentUsername = null) => {
    // Don't cache personalized data for current user
    if (currentUsername && username === currentUsername) {
      try {
        const profileData = await apiRequest(`/api/profiles/${username}/`);
        return profileData?.stories || profileData?.created_stories || profileData?.user_stories || [];
      } catch (error) {
        return [];
      }
    }
    
    try {
      const profileData = await apiRequest(`/api/profiles/${username}/`);
      return profileData?.stories || profileData?.created_stories || profileData?.user_stories || [];
    } catch (error) {
      return [];
    }
  },
  
  followUser: async (username) => {
    try {
      const response = await apiRequest(`/api/follow/toggle/${username}/`, {
        method: 'POST',
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getFollowers: (username) => {
    return apiRequest(`/api/profiles/${username}/followers/`);
  },
  
  getFollowing: (username) => {
    return apiRequest(`/api/profiles/${username}/following/`);
  },
  
  updateProfileImage: (username, imageData) => {
    return apiRequest(`/api/profiles/${username}/update_image/`, {
      method: 'POST',
      body: imageData,
    });
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
    return apiRequest('/api/notifications/');
  },
  
  getUnreadNotifications: (userId) => {
    return apiRequest('/api/notifications/unread/');
  },
  
  getUnreadCount: (userId) => {
    return apiRequest('/api/notifications/unread_count/');
  },
  
  getLatest: (limit = 8, userId) => {
    return apiRequest(`/api/notifications/get_latest/?limit=${limit}`);
  },
  
  markAsRead: (id, userId) => {
    return apiRequest(`/api/notifications/${id}/mark_read/`, {
      method: 'POST',
    });
  },
  
  markAllAsRead: (userId) => {
    return apiRequest('/api/notifications/mark_all_read/', {
      method: 'POST',
    });
  },
};

// Tags API
export const tagsApi = {
  getTrending: () => {
    return apiRequest('/api/tags/trending/');
  },
  
  getRecent: () => {
    return apiRequest('/api/tags/recent/');
  },
  
  getTagDetail: (tag) => {
    return apiRequest(`/api/tags/${tag}/`);
  },
  
  getTagFeed: (tag) => {
    return apiRequest(`/api/tags/${tag}/feed/`);
  },
  
  getTagSEO: (tag) => {
    return apiRequest(`/api/tags/${tag}/seo/`);
  },
};

// Search API
export const searchApi = {
  searchStories: (query) => {
    return apiRequest(`/api/stories/search/?q=${encodeURIComponent(query)}`);
  },
  
  searchVerses: (query) => {
    return apiRequest(`/api/verses/search/?q=${encodeURIComponent(query)}`);
  },

  searchCreators: (query) => {
    return apiRequest(`/api/profiles/search_creators/?q=${encodeURIComponent(query)}`);
  },
  
  getRecommendedCreators: (query = '') => {
    const url = query 
      ? `/api/stories/recommended_creators/?q=${encodeURIComponent(query)}` 
      : '/api/stories/recommended_creators/';
    return apiRequest(url);
  },
};

// Auth API
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
  
  getCSRFToken: () => apiRequest('/auth/get-csrf-token/'),

  verifyEmail: (verificationData) => apiRequest('/auth/verify-email/', {
    method: 'POST',
    body: JSON.stringify(verificationData),
  }),
  
  resendVerificationCode: (userData) => apiRequest('/auth/resend-verification/', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
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
    return apiRequest(`/api/comments/?story_slug=${encodeURIComponent(storySlug)}`);
  },
  
  createComment: (commentData) => {
    return apiRequest('/api/comments/', {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  },
  
  fetchCommentReplies: (commentId) => {
    return apiRequest(`/api/comments/${commentId}/replies/`);
  },
  
  updateComment: (commentId, commentData) => {
    return apiRequest(`/api/comments/${commentId}/`, {
      method: 'PATCH',
      body: JSON.stringify(commentData),
    });
  },
  
  deleteComment: (commentId) => {
    return apiRequest(`/api/comments/${commentId}/`, {
      method: 'DELETE',
    });
  },
};

// Media Proxy API
export const mediaApi = {
  getProxiedMedia: (path) => {
    return apiRequest(`/api/stories/media_proxy/?path=${encodeURIComponent(path)}`);
  },
};

// Search History API
export const searchHistoryApi = {
  getRecent: async () => {
    return apiRequest('/api/search-history/recent/');
  },
  
  save: async (query) => {
    return apiRequest('/api/search-history/save/', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
  
  clear: async () => {
    return apiRequest('/api/search-history/clear/', {
      method: 'DELETE',
    });
  },
};

export { apiRequest };