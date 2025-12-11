// api.js - Complete Next.js API Configuration for StoryVermo
// This file contains all API endpoints from your Django backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to build URL with query params
const buildUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Helper function to convert relative URLs to absolute URLs
export const absoluteUrl = (path) => {
  if (!path) return '';
  // If already an absolute URL or blob URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  // Convert relative path to absolute URL
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

// Helper function to build site URLs (for frontend pages, not API)
export const siteUrl = (path = '/') => {
  if (!path) path = '/';
  // Use NEXT_PUBLIC_SITE_URL if available, otherwise construct from window.location or use default
  let siteBase = process.env.NEXT_PUBLIC_SITE_URL;
  
  // Fallback to window.origin if available (browser environment)
  if (!siteBase && typeof window !== 'undefined' && window.location) {
    siteBase = window.location.origin;
  }
  
  // Final fallback - use a sensible default
  if (!siteBase) {
    siteBase = 'https://storyvermo.com';
  }
  
  // Ensure siteBase doesn't end with / and path starts with /
  siteBase = siteBase.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  return `${siteBase}${normalizedPath}`;
};

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================
export const AUTH_API = {
  // Auth check
  CHECK: `${API_BASE_URL}/auth/check/`,
  
  // User authentication
  REGISTER: `${API_BASE_URL}/auth/register/`,
  LOGIN: `${API_BASE_URL}/auth/login/`,
  LOGOUT: `${API_BASE_URL}/auth/logout/`,
  
  // Profile & Settings
  PROFILE: `${API_BASE_URL}/auth/profile/`,
  SETTINGS: `${API_BASE_URL}/auth/settings/`,
  
  // CSRF Token
  CSRF: `${API_BASE_URL}/auth/csrf/`,
  GET_CSRF_TOKEN: `${API_BASE_URL}/auth/get-csrf-token/`,
};

// ============================================================================
// TAGS ENDPOINTS
// ============================================================================
export const TAGS_API = {
  // Base endpoints
  LIST: `${API_BASE_URL}/api/tags/`,
  DETAIL: (tagSlug) => `${API_BASE_URL}/api/tags/${tagSlug}/`,
  CREATE: `${API_BASE_URL}/api/tags/`,
  UPDATE: (tagSlug) => `${API_BASE_URL}/api/tags/${tagSlug}/`,
  DELETE: (tagSlug) => `${API_BASE_URL}/api/tags/${tagSlug}/`,
  
  // Custom actions
  FEED: (tagName) => `${API_BASE_URL}/api/tags/${tagName}/feed/`,
  TRENDING: `${API_BASE_URL}/api/tags/trending/`,
  POPULAR: `${API_BASE_URL}/api/tags/popular/`,
  RECENT: `${API_BASE_URL}/api/tags/recent/`,
  SEO_DETAIL: (tagName) => `${API_BASE_URL}/api/tags/${tagName}/seo/`,
};

// ============================================================================
// IMAGES ENDPOINTS
// ============================================================================
export const IMAGES_API = {
  LIST: `${API_BASE_URL}/api/images/`,
  DETAIL: (imageId) => `${API_BASE_URL}/api/images/${imageId}/`,
  CREATE: `${API_BASE_URL}/api/images/`,
  UPDATE: (imageId) => `${API_BASE_URL}/api/images/${imageId}/`,
  DELETE: (imageId) => `${API_BASE_URL}/api/images/${imageId}/`,
};

// ============================================================================
// STORIES ENDPOINTS
// ============================================================================
export const STORIES_API = {
  // Base endpoints
  LIST: `${API_BASE_URL}/api/stories/`,
  DETAIL: (slug) => `${API_BASE_URL}/api/stories/${slug}/`,
  CREATE: `${API_BASE_URL}/api/stories/`,
  UPDATE: (slug) => `${API_BASE_URL}/api/stories/${slug}/`,
  DELETE: (slug) => `${API_BASE_URL}/api/stories/${slug}/`,
  
  // Pagination & Feeds
  PAGINATED: (params = {}) => buildUrl('/api/stories/paginated_stories/', params),
  
  // Custom actions
  SEARCH: (query) => buildUrl('/api/stories/search/', { q: query }),
  SAVED: `${API_BASE_URL}/api/stories/saved/`,
  RECOMMEND: (slug) => `${API_BASE_URL}/api/stories/${slug}/recommend/`,
  RECOMMENDED_CREATORS: (query = '') => buildUrl('/api/stories/recommended_creators/', query ? { q: query } : {}),
  MEDIA_PROXY: (path) => buildUrl('/api/stories/media_proxy/', { path }),
};

// ============================================================================
// VERSES ENDPOINTS
// ============================================================================
export const VERSES_API = {
  // Base endpoints
  LIST: `${API_BASE_URL}/api/verses/`,
  DETAIL: (slug) => `${API_BASE_URL}/api/verses/${slug}/`,
  CREATE: `${API_BASE_URL}/api/verses/`,
  UPDATE: (slug) => `${API_BASE_URL}/api/verses/${slug}/`,
  DELETE: (slug) => `${API_BASE_URL}/api/verses/${slug}/`,
  
  // Bulk delete
  BULK_DELETE: (storySlug) => buildUrl('/api/verses/', { story: storySlug }),
  
  // Search
  SEARCH: (query) => buildUrl('/api/verses/search/', { q: query }),
};

// ============================================================================
// MOMENTS ENDPOINTS
// ============================================================================
export const MOMENTS_API = {
  LIST: `${API_BASE_URL}/api/moments/`,
  DETAIL: (publicId) => `${API_BASE_URL}/api/moments/${publicId}/`,
  CREATE: `${API_BASE_URL}/api/moments/`,
  UPDATE: (publicId) => `${API_BASE_URL}/api/moments/${publicId}/`,
  DELETE: (publicId) => `${API_BASE_URL}/api/moments/${publicId}/`,
};

// ============================================================================
// COMMENTS ENDPOINTS
// ============================================================================
export const COMMENTS_API = {
  // Base endpoints
  LIST: (storySlug) => buildUrl('/api/comments/', { story_slug: storySlug }),
  DETAIL: (publicId) => `${API_BASE_URL}/api/comments/${publicId}/`,
  CREATE: `${API_BASE_URL}/api/comments/`,
  UPDATE: (publicId) => `${API_BASE_URL}/api/comments/${publicId}/`,
  DELETE: (publicId) => `${API_BASE_URL}/api/comments/${publicId}/`,
  
  // Replies
  REPLIES: (publicId) => `${API_BASE_URL}/api/comments/${publicId}/replies/`,
};

// ============================================================================
// PROFILES ENDPOINTS
// ============================================================================
export const PROFILES_API = {
  // Base endpoints
  LIST: `${API_BASE_URL}/api/profiles/`,
  DETAIL: (username) => `${API_BASE_URL}/api/profiles/${username}/`,
  UPDATE: (username) => `${API_BASE_URL}/api/profiles/${username}/`,
  
  // Follow/Unfollow
  FOLLOW: (username) => `${API_BASE_URL}/api/profiles/${username}/follow/`,
  FOLLOWERS: (username) => `${API_BASE_URL}/api/profiles/${username}/followers/`,
  FOLLOWING: (username) => `${API_BASE_URL}/api/profiles/${username}/following/`,
  
  // Image updates
  UPDATE_IMAGE: (username) => `${API_BASE_URL}/api/profiles/${username}/update_image/`,
  
  // Search creators
  SEARCH_CREATORS: (query) => buildUrl('/api/profiles/search_creators/', { q: query }),
};

// ============================================================================
// FOLLOW ENDPOINTS
// ============================================================================
export const FOLLOW_API = {
  TOGGLE: (username) => `${API_BASE_URL}/api/follow/toggle/${username}/`,
};

// ============================================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================================
export const NOTIFICATIONS_API = {
  // Base endpoints
  LIST: `${API_BASE_URL}/api/notifications/`,
  DETAIL: (id) => `${API_BASE_URL}/api/notifications/${id}/`,
  
  // Custom actions
  MARK_READ: (id) => `${API_BASE_URL}/api/notifications/${id}/mark_read/`,
  MARK_ALL_READ: `${API_BASE_URL}/api/notifications/mark_all_read/`,
  UNREAD_COUNT: `${API_BASE_URL}/api/notifications/unread_count/`,
  GET_LATEST: (limit = 8) => buildUrl('/api/notifications/get_latest/', { limit }),
  UNREAD: `${API_BASE_URL}/api/notifications/unread/`,
  
  // Legacy compatibility endpoint
  GET_UNREAD_COUNT: `${API_BASE_URL}/api/notifications/get_unread_count/`,
};

// ============================================================================
// INTERACTIONS ENDPOINTS
// ============================================================================
export const INTERACTIONS_API = {
  // Story interactions
  TOGGLE_STORY_LIKE: `${API_BASE_URL}/api/interactions/toggle_story_like/`,
  TOGGLE_STORY_SAVE: `${API_BASE_URL}/api/interactions/toggle_story_save/`,
  
  // Verse interactions
  TOGGLE_VERSE_LIKE: `${API_BASE_URL}/api/interactions/toggle_verse_like/`,
  TOGGLE_VERSE_SAVE: `${API_BASE_URL}/api/interactions/toggle_verse_save/`,
};

// ============================================================================
// SEARCH HISTORY ENDPOINTS
// ============================================================================
export const SEARCH_HISTORY_API = {
  RECENT: `${API_BASE_URL}/api/search-history/recent/`,
  SAVE: `${API_BASE_URL}/api/search-history/save/`,
  CLEAR: `${API_BASE_URL}/api/search-history/clear/`,
};

// ============================================================================
// USER ACTIVITIES & METRICS ENDPOINTS
// ============================================================================
export const ACTIVITIES_API = {
  CREATE: `${API_BASE_URL}/api/user-activities/`,
  IMPRESSION: `${API_BASE_URL}/api/metrics/impression/`,
  CLICK: `${API_BASE_URL}/api/metrics/click/`,
};

// ============================================================================
// HELPER FUNCTIONS FOR API CALLS
// ============================================================================

/**
 * Get authorization headers with token
 */
export const getAuthHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Get headers for multipart/form-data (file uploads)
 */
export const getMultipartHeaders = (token = null) => {
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Don't set Content-Type for multipart - browser will set it with boundary
  return headers;
};

/**
 * Get CSRF token from cookies
 */
export const getCsrfToken = () => {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrftoken='));
  return csrfCookie ? csrfCookie.split('=')[1] : null;
};

/**
 * Get headers with CSRF token
 */
export const getHeadersWithCsrf = (token = null) => {
  const headers = getAuthHeaders(token);
  const csrfToken = getCsrfToken();
  
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  return headers;
};

// ============================================================================
// AUTHENTICATION API HELPER
// ============================================================================
export const authApi = {
  // Check authentication status
  checkAuth: async () => {
    try {
      const response = await fetch(AUTH_API.CHECK, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Not authenticated');
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  // User login
  login: async (credentials) => {
    try {
      const response = await fetch(AUTH_API.LOGIN, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(credentials),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // User registration
  register: async (userData) => {
    try {
      const response = await fetch(AUTH_API.REGISTER, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(userData),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // User logout
  logout: async () => {
    try {
      await fetch(AUTH_API.LOGOUT, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// ============================================================================
// COMMENTS API HELPER
// ============================================================================
export const commentsApi = {
  // Fetch all comments for a story
  fetchComments: async (storySlug) => {
    try {
      const url = COMMENTS_API.LIST(storySlug);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch comments');
      return await response.json();
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  },

  // Create a new comment or reply
  createComment: async (commentData) => {
    try {
      const response = await fetch(COMMENTS_API.CREATE, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(commentData),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return await response.json();
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  },

  // Fetch replies for a specific comment
  fetchCommentReplies: async (commentId) => {
    try {
      const url = COMMENTS_API.REPLIES(commentId);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch replies');
      return await response.json();
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  },
};

// ============================================================================
// IMAGES API HELPER
// ============================================================================
export const imagesApi = {
  // Upload an image
  uploadImage: async (formData) => {
    try {
      const response = await fetch(IMAGES_API.CREATE, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload image');
      return await response.json();
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  // Delete an image
  deleteImage: async (imageId) => {
    try {
      const response = await fetch(IMAGES_API.DELETE(imageId), {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to delete image');
      return await response.json();
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  },
};

// ============================================================================
// MOMENTS API HELPER
// ============================================================================
export const momentsApi = {
  // Create a moment
  createMoment: async (momentData) => {
    try {
      const response = await fetch(MOMENTS_API.CREATE, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(momentData),
      });
      if (!response.ok) throw new Error('Failed to create moment');
      return await response.json();
    } catch (error) {
      console.error('Error creating moment:', error);
      throw error;
    }
  },

  // Delete a moment
  deleteMoment: async (momentId) => {
    try {
      const response = await fetch(MOMENTS_API.DELETE(momentId), {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to delete moment');
      return await response.json();
    } catch (error) {
      console.error('Error deleting moment:', error);
      throw error;
    }
  },
};

// ============================================================================
// VERSES API HELPER
// ============================================================================
export const versesApi = {
  // Get verse by slug
  getVerseBySlug: async (slug) => {
    try {
      const response = await fetch(VERSES_API.DETAIL(slug), {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch verse');
      return await response.json();
    } catch (error) {
      console.error('Error fetching verse:', error);
      throw error;
    }
  },

  // Get verses by story slug
  getVersesByStorySlug: async (storySlug) => {
    try {
      const url = buildUrl('/api/verses/', { story: storySlug });
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch verses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching verses:', error);
      throw error;
    }
  },

  // Create a verse
  createVerse: async (verseData) => {
    try {
      const response = await fetch(VERSES_API.CREATE, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(verseData),
      });
      if (!response.ok) throw new Error('Failed to create verse');
      return await response.json();
    } catch (error) {
      console.error('Error creating verse:', error);
      throw error;
    }
  },

  // Update a verse
  updateVerse: async (slug, verseData) => {
    try {
      const response = await fetch(VERSES_API.UPDATE(slug), {
        method: 'PUT',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(verseData),
      });
      if (!response.ok) throw new Error('Failed to update verse');
      return await response.json();
    } catch (error) {
      console.error('Error updating verse:', error);
      throw error;
    }
  },

  // Delete a verse
  deleteVerse: async (slug) => {
    try {
      const response = await fetch(VERSES_API.DELETE(slug), {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to delete verse');
      return await response.json();
    } catch (error) {
      console.error('Error deleting verse:', error);
      throw error;
    }
  },

  // Toggle like on a verse
  toggleLikeBySlug: async (slug) => {
    try {
      const response = await fetch(buildUrl(`/api/verses/${slug}`, { action: 'like' }), {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to toggle like');
      return await response.json();
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  },

  // Toggle save on a verse
  toggleSaveBySlug: async (slug) => {
    try {
      const response = await fetch(buildUrl(`/api/verses/${slug}`, { action: 'save' }), {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to toggle save');
      return await response.json();
    } catch (error) {
      console.error('Error toggling save:', error);
      throw error;
    }
  },
};

// ============================================================================
// STORIES API HELPER
// ============================================================================
export const storiesApi = {
  // Get story by slug
  getStoryBySlug: async (slug) => {
    try {
      const response = await fetch(STORIES_API.DETAIL(slug), {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch story');
      return await response.json();
    } catch (error) {
      console.error('Error fetching story:', error);
      throw error;
    }
  },

  // Get paginated stories
  getPaginatedStories: async (params = {}) => {
    try {
      const url = STORIES_API.PAGINATED(params);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch stories');
      return await response.json();
    } catch (error) {
      console.error('Error fetching stories:', error);
      throw error;
    }
  },

  // Get saved stories
  getSavedStories: async (params = {}) => {
    try {
      const url = buildUrl('/api/stories/saved/', params);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch saved stories');
      return await response.json();
    } catch (error) {
      console.error('Error fetching saved stories:', error);
      throw error;
    }
  },

  // Create a story
  createStory: async (storyData) => {
    try {
      const response = await fetch(STORIES_API.CREATE, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(storyData),
      });
      if (!response.ok) throw new Error('Failed to create story');
      return await response.json();
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  },

  // Update a story
  updateStory: async (slug, storyData) => {
    try {
      const response = await fetch(STORIES_API.UPDATE(slug), {
        method: 'PUT',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(storyData),
      });
      if (!response.ok) throw new Error('Failed to update story');
      return await response.json();
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  },

  // Delete a story
  deleteStory: async (slug) => {
    try {
      const response = await fetch(STORIES_API.DELETE(slug), {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to delete story');
      return await response.json();
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  },

  // Toggle like on a story
  toggleLike: async (slug) => {
    try {
      const response = await fetch(buildUrl(`/api/stories/${slug}`, { action: 'like' }), {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to toggle like');
      return await response.json();
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  },

  // Toggle save on a story
  toggleSave: async (slug) => {
    try {
      const response = await fetch(buildUrl(`/api/stories/${slug}`, { action: 'save' }), {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to toggle save');
      return await response.json();
    } catch (error) {
      console.error('Error toggling save:', error);
      throw error;
    }
  },

  // Toggle save by slug (alias for toggleSave)
  toggleSaveBySlug: async (slug) => {
    return storiesApi.toggleSave(slug);
  },
};

// ============================================================================
// USER API HELPER
// ============================================================================
export const userApi = {
  // Get user profile
  getProfile: async (username) => {
    try {
      const response = await fetch(PROFILES_API.DETAIL(username), {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return await response.json();
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Get followers
  getFollowers: async (username) => {
    try {
      const url = buildUrl(`/api/profiles/${username}/followers/`);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch followers');
      return await response.json();
    } catch (error) {
      console.error('Error fetching followers:', error);
      throw error;
    }
  },

  // Get following
  getFollowing: async (username) => {
    try {
      const url = buildUrl(`/api/profiles/${username}/following/`);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch following');
      return await response.json();
    } catch (error) {
      console.error('Error fetching following:', error);
      throw error;
    }
  },

  // Follow a user
  followUser: async (username) => {
    try {
      const response = await fetch(PROFILES_API.FOLLOW(username), {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to follow user');
      return await response.json();
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  },

  // Update profile image
  updateProfileImage: async (username, formData) => {
    try {
      // For FormData, we need headers WITHOUT Content-Type
      // The browser will automatically set multipart/form-data with correct boundary
      const headers = {};
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(PROFILES_API.UPDATE(username), {
        method: 'PUT',
        credentials: 'include',
        headers: headers,
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to update profile image');
      return await response.json();
    } catch (error) {
      console.error('Error updating profile image:', error);
      throw error;
    }
  },

  // Update current user profile
  updateCurrentUserProfile: async (userData) => {
    try {
      const response = await fetch(PROFILES_API.UPDATE_CURRENT, {
        method: 'PUT',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return await response.json();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
};

// ============================================================================
// NOTIFICATIONS API HELPER
// ============================================================================
export const notificationsApi = {
  // Get notifications
  getNotifications: async () => {
    try {
      const response = await fetch(NOTIFICATIONS_API.LIST, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await fetch(NOTIFICATIONS_API.MARK_READ(notificationId), {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      const response = await fetch(NOTIFICATIONS_API.MARK_ALL_READ, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },
};

// ============================================================================
// SEARCH API HELPER
// ============================================================================
export const searchApi = {
  // Search stories
  searchStories: async (query) => {
    try {
      const url = buildUrl('/api/stories/search/', { q: query });
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to search stories');
      return await response.json();
    } catch (error) {
      console.error('Error searching stories:', error);
      throw error;
    }
  },

  // Search verses
  searchVerses: async (query) => {
    try {
      const url = buildUrl('/api/verses/search/', { q: query });
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to search verses');
      return await response.json();
    } catch (error) {
      console.error('Error searching verses:', error);
      throw error;
    }
  },

  // Search creators
  searchCreators: async (query) => {
    try {
      const url = buildUrl('/api/profiles/search_creators/', { q: query });
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to search creators');
      return await response.json();
    } catch (error) {
      console.error('Error searching creators:', error);
      throw error;
    }
  },

  // Get recommended creators
  getRecommendedCreators: async (query = '') => {
    try {
      const url = buildUrl('/api/stories/recommended_creators/', query ? { q: query } : {});
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch recommended creators');
      const data = await response.json();
      // Handle different response formats
      return Array.isArray(data) ? data : (data.results || data.creators || []);
    } catch (error) {
      console.error('Error fetching recommended creators:', error);
      return [];
    }
  },
};

// ============================================================================
// SEARCH HISTORY API HELPER
// ============================================================================
export const searchHistoryApi = {
  // Get recent searches
  getRecent: async () => {
    try {
      const response = await fetch(SEARCH_HISTORY_API.RECENT, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch search history');
      const data = await response.json();
      // Handle different response formats
      return Array.isArray(data) ? data : (data.results || data.searches || []);
    } catch (error) {
      console.error('Error fetching search history:', error);
      return [];
    }
  },

  // Save a search
  save: async (query) => {
    try {
      const response = await fetch(SEARCH_HISTORY_API.SAVE, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error('Failed to save search');
      return await response.json();
    } catch (error) {
      console.error('Error saving search:', error);
      throw error;
    }
  },

  // Clear search history
  clear: async () => {
    try {
      const response = await fetch(SEARCH_HISTORY_API.CLEAR, {
        method: 'POST',
        credentials: 'include',
        headers: getHeadersWithCsrf(),
      });
      if (!response.ok) throw new Error('Failed to clear search history');
      return await response.json();
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  },
};

// ============================================================================
// TAGS API HELPER
// ============================================================================
export const tagsApi = {
  // Get trending tags
  getTrending: async () => {
    try {
      const response = await fetch(TAGS_API.TRENDING, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch trending tags');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      return [];
    }
  },

  // Get popular tags
  getPopular: async () => {
    try {
      const response = await fetch(TAGS_API.POPULAR, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch popular tags');
      return await response.json();
    } catch (error) {
      console.error('Error fetching popular tags:', error);
      return [];
    }
  },

  // Get recent tags
  getRecent: async () => {
    try {
      const response = await fetch(TAGS_API.RECENT, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch recent tags');
      return await response.json();
    } catch (error) {
      console.error('Error fetching recent tags:', error);
      return [];
    }
  },

  // Get tag details
  getDetail: async (tagSlug) => {
    try {
      const response = await fetch(TAGS_API.DETAIL(tagSlug), {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch tag');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tag:', error);
      throw error;
    }
  },

  // Get tag feed
  getFeed: async (tagName) => {
    try {
      const response = await fetch(TAGS_API.FEED(tagName), {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch tag feed');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tag feed:', error);
      throw error;
    }
  },
};

// ============================================================================
// EXPORT ALL APIs
// ============================================================================
export default {
  BASE_URL: API_BASE_URL,
  AUTH: AUTH_API,
  TAGS: TAGS_API,
  IMAGES: IMAGES_API,
  STORIES: STORIES_API,
  VERSES: VERSES_API,
  MOMENTS: MOMENTS_API,
  COMMENTS: COMMENTS_API,
  PROFILES: PROFILES_API,
  FOLLOW: FOLLOW_API,
  NOTIFICATIONS: NOTIFICATIONS_API,
  INTERACTIONS: INTERACTIONS_API,
  SEARCH_HISTORY: SEARCH_HISTORY_API,
  ACTIVITIES: ACTIVITIES_API,
  
  // Helper functions
  buildUrl,
  getAuthHeaders,
  getMultipartHeaders,
  getCsrfToken,
  getHeadersWithCsrf,
};