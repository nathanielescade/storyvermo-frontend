// lib/api.js
export const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com';

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
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
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
    const response = await fetch(url, mergedOptions);
    
    const contentType = response.headers.get('content-type') || '';
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
      
      // Handle specific status codes
      const makeError = (message) => {
        const e = new Error(message);
        try {
          e.status = response.status;
          e.body = errorMessage;
        } catch (attachErr) {
          // ignore
        }
        return e;
      };
      
      // If caller requested to suppress errors for auth/permission/missing-method
      // return null instead of throwing. This is useful for probe endpoints
      const suppressibleStatuses = [401, 403, 404, 405];
      if (mergedOptions && mergedOptions.suppressErrors && suppressibleStatuses.includes(response.status)) {
        console.debug(`[apiRequest] suppressErrors active - returning null for ${response.status} ${url}`);
        return null;
      }

      switch (response.status) {
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
    return apiRequest(`/api/stories/paginated_stories/?${queryString}`);
  },
  
  getStoryBySlug: async (slug) => {
    const data = await apiRequest(`/api/stories/${slug}/`);
    try {
      console.debug('[storiesApi] getStoryBySlug response', {
        slug,
        keys: data ? Object.keys(data) : null,
        versesSample: Array.isArray(data?.verses) ? data.verses.slice(0,3) : data?.verses
      });
    } catch (e) {
      console.warn('[storiesApi] failed logging getStoryBySlug response', e);
    }
    return data;
  },
  
  createStory: async (storyData) => {
    console.log('Creating story with data:', storyData);
    try {
      const response = await apiRequest('/api/stories/', {
        method: 'POST',
        body: JSON.stringify(storyData),
      });
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
      return response;
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  },
  
  toggleStoryLike: (storyId) => apiRequest('/api/interactions/toggle_like/', {
    method: 'POST',
    body: JSON.stringify({ story_id: storyId }),
  }),

  toggleStorySave: (storyId) => apiRequest('/api/interactions/toggle_save/', {
    method: 'POST',
    body: JSON.stringify({ story_id: storyId }),
  }),
  
  getSavedStories: () => apiRequest('/api/stories/saved/'),
  
  getMyStories: () => apiRequest('/api/stories/mine/'),
  
  likeStory: (slug) => apiRequest(`/api/stories/${slug}/interact/`, {
    method: 'POST',
    body: JSON.stringify({ type: 'LIKE' }),
  }),

  saveStory: (slug) => apiRequest(`/api/stories/${slug}/interact/`, {
    method: 'POST',
    body: JSON.stringify({ type: 'SAVE' }),
  }),

  shareStory: (slug) => apiRequest(`/api/stories/${slug}/share/`, {
    method: 'POST',
  }),

  recommendStory: (slug, recipients) => apiRequest(`/api/stories/${slug}/recommend/`, {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  }),

  deleteStory: (slug) => apiRequest(`/api/stories/${slug}/`, {
    method: 'DELETE',
  }),

  replaceVerses: (slug, verses) => apiRequest(`/api/stories/${slug}/replace_verses/`, {
    method: 'POST',
    body: JSON.stringify({ verses }),
  }),

  searchStories: (query) => apiRequest(`/api/stories/search/?q=${encodeURIComponent(query)}`),
  
  getPersonalizedFeed: () => apiRequest('/api/stories/personalized/'),
};

// Verses API
export const versesApi = {
  getVersesGrid: () => apiRequest('/api/verses/'),

  getVerseById: (id) => apiRequest(`/api/verses/${id}/`),

  getVerseBySlug: (slug) => apiRequest(`/api/verses/${slug}/`),

  toggleLikeBySlug: (slug) => apiRequest(`/api/verses/${slug}/interact/`, {
    method: 'POST',
    body: JSON.stringify({ type: 'LIKE' }),
  }),

  toggleSaveBySlug: (slug) => apiRequest(`/api/verses/${slug}/interact/`, {
    method: 'POST',
    body: JSON.stringify({ type: 'SAVE' }),
  }),

  getVersesByStorySlug: (slug) => apiRequest(`/api/stories/${slug}/`).then(story => story.verses || []),

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
      
      console.log('[versesApi] Verse updated successfully:', response);
      return response;
    } catch (error) {
      console.error('[versesApi] Error updating verse:', error);
      throw error;
    }
  },

  deleteVerse: (slug) => apiRequest(`/api/verses/${slug}/`, {
    method: 'DELETE',
  }),

  bulkDeleteVerses: (storySlug) => apiRequest(`/api/verses/?story=${storySlug}`, {
    method: 'DELETE',
  }),

  searchVerses: (query) => apiRequest(`/api/verses/search/?q=${encodeURIComponent(query)}`),
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

  getImage: (id) => apiRequest(`/api/images/${id}/`),
  
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
      
      console.log('[momentsApi] Moment created successfully:', response);
      return response;
    } catch (error) {
      console.error('[momentsApi] Error creating moment:', error);
      throw error;
    }
  },

  updateMoment: (publicId, momentData) => apiRequest(`/api/moments/${publicId}/`, {
    method: 'PATCH',
    body: JSON.stringify(momentData),
  }),

  deleteMoment: (publicId) => apiRequest(`/api/moments/${publicId}/`, {
    method: 'DELETE',
  }),
};

// User/Profile API
export const userApi = {
  getProfile: async (username) => {
    try {
      const response = await apiRequest(`/api/profiles/${username}/`);
      console.log('API Response from getProfile:', response);
      if (!response) {
        throw new Error('No response data received');
      }
      return response;
    } catch (error) {
      console.error('Error in getProfile:', error);
      throw error;
    }
  },

  getUserStories: async (username) => {
    try {
      const profileData = await apiRequest(`/api/profiles/${username}/`);
      return profileData?.stories || profileData?.created_stories || profileData?.user_stories || [];
    } catch (error) {
      console.error('Error in getUserStories:', error);
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
      console.error('Error in followUser:', error);
      throw error;
    }
  },
  
  getFollowers: (username) => apiRequest(`/api/profiles/${username}/followers/`),
  
  getFollowing: (username) => apiRequest(`/api/profiles/${username}/following/`),
  
  updateProfileImage: (username, imageData) => apiRequest(`/api/profiles/${username}/update_image/`, {
    method: 'POST',
    body: imageData,
  }),

  getCurrentUserProfile: () => apiRequest('/auth/profile/'),

  updateCurrentUserProfile: (profileData) => apiRequest('/auth/profile/', {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  }),
};

// Notifications API
export const notificationsApi = {
  getNotifications: () => apiRequest('/api/notifications/'),
  
  getUnreadNotifications: () => apiRequest('/api/notifications/unread/'),
  
  getUnreadCount: () => apiRequest('/api/notifications/unread_count/'),
  
  getLatest: (limit = 8) => apiRequest(`/api/notifications/get_latest/?limit=${limit}`),
  
  markAsRead: (id) => apiRequest(`/api/notifications/${id}/mark_read/`, {
    method: 'POST',
  }),
  
  markAllAsRead: () => apiRequest('/api/notifications/mark_all_read/', {
    method: 'POST',
  }),
};

// Tags API
export const tagsApi = {
  getTrending: () => apiRequest('/api/tags/trending/'),
  
  getRecent: () => apiRequest('/api/tags/recent/'),
  
  getTagDetail: (tag) => apiRequest(`/api/tags/${tag}/`),
  
  getTagFeed: (tag) => apiRequest(`/api/tags/${tag}/feed/`),
  
  getTagSEO: (tag) => apiRequest(`/api/tags/${tag}/seo/`),
};

// Search API
export const searchApi = {
  searchStories: (query) => apiRequest(`/api/stories/search/?q=${encodeURIComponent(query)}`),
  
  searchVerses: (query) => apiRequest(`/api/verses/search/?q=${encodeURIComponent(query)}`),
  
  getRecommendedCreators: (query = '') => {
    const url = query ? `/api/stories/recommended_creators/?q=${encodeURIComponent(query)}` : '/api/stories/recommended_creators/';
    return apiRequest(url);
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
  fetchComments: (storySlug) => apiRequest(`/api/comments/?story_slug=${encodeURIComponent(storySlug)}`),
  
  createComment: (commentData) => apiRequest('/api/comments/', {
    method: 'POST',
    body: JSON.stringify(commentData),
  }),
  
  fetchCommentReplies: (commentId) => apiRequest(`/api/comments/${commentId}/replies/`),
  
  updateComment: (commentId, commentData) => apiRequest(`/api/comments/${commentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(commentData),
  }),
  
  deleteComment: (commentId) => apiRequest(`/api/comments/${commentId}/`, {
    method: 'DELETE',
  }),
};

// Media Proxy API
export const mediaApi = {
  getProxiedMedia: (path) => apiRequest(`/api/stories/media_proxy/?path=${encodeURIComponent(path)}`),
};

export { apiRequest };