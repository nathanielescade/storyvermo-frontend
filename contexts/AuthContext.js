'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext();

// Helper utilities extracted to reduce context size
const authUtils = {
  normalizeUserFromResponse: (resp) => {
    if (!resp) return null;
    
    // Handle { authenticated: true, user: 'username' }
    if (resp.authenticated && typeof resp.user === 'string') {
      return { username: resp.user };
    }
    
    // Handle { user: { username, email, ... } }
    if (resp.user && typeof resp.user === 'object') {
      return resp.user;
    }
    
    // Handle direct user object
    if (resp.username || resp.id || resp.email) {
      return resp;
    }
    
    return null;
  },

  normalizeErrorMessage: (message) => {
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'object' && message !== null) {
      try {
        return JSON.stringify(message);
      } catch (e) {
        return String(message);
      }
    }
    return String(message || '');
  },

  parseApiErrors: (payload) => {
    // If an Error was passed directly, surface its message
    if (payload instanceof Error) {
      return { general: payload.message || 'An error occurred' };
    }
    
    const errors = {};
    const source = payload || {};

    // Handle direct string detail/error/message
    if (typeof source.detail === 'string' && source.detail) {
      errors.general = source.detail;
      return errors;
    }
    if (typeof source.error === 'string') {
      errors.general = source.error;
      return errors;
    }
    if (typeof source.message === 'string') {
      errors.general = source.message;
      return errors;
    }

    // Get the errors object (could be under 'error', 'errors', or root)
    const candidates = source.error || source.errors || source;

    if (typeof candidates === 'object' && candidates !== null) {
      const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      for (const [key, val] of Object.entries(candidates)) {
        // Handle non_field_errors (DRF standard for general errors)
        if (key === 'non_field_errors' || key === '__all__' || key === 'non_field_error') {
          errors.general = authUtils.normalizeErrorMessage(val);
          continue;
        }

        // Keep original key (likely snake_case) so callers that expect that key get it
        const normalized = authUtils.normalizeErrorMessage(val);
        errors[key] = normalized;

        // Also provide a camelCase variant for callers that expect camelCase
        try {
          const camel = toCamel(key);
          if (camel && camel !== key) errors[camel] = normalized;
        } catch (e) {
          // ignore
        }
      }
    }

    // If no errors were parsed, add a general error
    if (Object.keys(errors).length === 0) {
      errors.general = 'An error occurred';
    }

    return errors;
  }
};

export function AuthProvider({ children }) {
  // Keep auth state in-memory only. Rely on server-side rendering / server
  // session cookies for initial auth state and call `checkAuth()` from the
  // client to hydrate. Avoid persisting tokens or auth flags in localStorage
  // to reduce XSS attack surface.
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // Simplified auth verification with timeout — runs in background without blocking UI
  useEffect(() => {
    let mounted = true;
    let timeoutId;
    
    const verifyAuth = async () => {
      try {
        // Ensure backend sets CSRF cookie (double-submit pattern) before any
        // state-changing requests. Some backends provide an endpoint that sets
        // a `csrftoken` cookie when requested; call it here but ignore errors.
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com'}/auth/get-csrf-token/`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
        } catch (e) {
          // Non-fatal: backend may already set the cookie or not expose this
          // endpoint. Continue to auth check regardless.
        }
        // Set a timeout so we don't wait forever
        timeoutId = setTimeout(() => {
          if (mounted) {
            clearTimeout(timeoutId);
            // Don't update state on timeout, keep current in-memory state
          }
        }, 3000);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com'}/auth/check/`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
          redirect: 'manual'
        });
        
        if (!mounted) return;
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Only clear auth state for explicit authentication failures.
          // Network errors or 5xx responses may be transient — keep current
          // in-memory auth state instead of logging the user out.
          if (mounted && (response.status === 401 || response.status === 403)) {
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
          return;
        }
        
        const data = await response.json();
        if (!mounted) return;
        
        const user = authUtils.normalizeUserFromResponse(data);
        
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (mounted) {
          // On error, keep current in-memory state. This allows the app to
          // continue working with the cached auth state until a successful
          // verification occurs.
        }
      }
    };

    // Start verification in background without blocking
    // Use setTimeout to defer it so it doesn't block initial render
    const deferredVerify = setTimeout(() => {
      if (mounted) verifyAuth();
    }, 0);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearTimeout(deferredVerify);
    };
  }, []);

  // Common function to update auth state
  const updateAuthState = (user) => {
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  // Expose a safe setter so components can update the in-memory auth
  // state directly (useful after profile updates where server-side
  // auth-check may briefly fail). This only updates client state and
  // does not perform any network actions.
  const setCurrentUserSafely = (user) => {
    updateAuthState(user || null);
  };

  // Allow components to open the global auth modal by dispatching the
  // same `auth:open` event that `GlobalShell` listens for. Some
  // components expect `openAuthModal` to come from `useAuth()`.
  const openAuthModal = (type = null, data = null) => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('auth:open', { detail: { type, data } }));
    } catch (e) {
      // ignore
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      
      if (response && (response.success || response.user)) {
        const user = authUtils.normalizeUserFromResponse(response);
        if (user) {
          updateAuthState(user);
          // Small delay to ensure cookies are set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Emit auth:success event so FeedClient and other components can refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:success', { detail: { user } }));
          }
          
          return { success: true, user };
        }
      }

      const errors = authUtils.parseApiErrors(response);
      return { 
        success: false, 
        error: errors.general || 'Login failed. Please check your credentials.',
        errors: errors,
        raw: response 
      };
    } catch (error) {
      let errors = { general: 'An unexpected error occurred' };
      
      if (error && error.response && error.response.data) {
        errors = authUtils.parseApiErrors(error.response.data);
      } else if (error && error.body) {
        try {
          const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
          errors = authUtils.parseApiErrors(body);
        } catch (e) {
          errors.general = String(error.body || error.message || 'Authentication failed');
        }
      } else if (error && error.message) {
        errors.general = error.message;
      }
      
      return { 
        success: false, 
        error: errors.general,
        errors: errors,
        raw: error 
      };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      
      if (response && (response.success || response.user)) {
        const user = authUtils.normalizeUserFromResponse(response);
        if (user) {
          updateAuthState(user);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Emit auth:success event so FeedClient and other components can refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:success', { detail: { user } }));
          }
          
          return { success: true, user };
        }
      }

      // Handle success message without user
      if (response && !response.user && !response.success) {
        const msg = (response.message || response.detail || '').toString();
        if (/success|successful|created|ok/i.test(msg)) {
          try {
            const check = await authApi.checkAuth();
            const user = authUtils.normalizeUserFromResponse(check);
            if (user) {
              updateAuthState(user);
              
              // Emit auth:success event
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:success', { detail: { user } }));
              }
              
              return { success: true, user };
            }
          } catch (e) {
            // Continue to return success message
          }
          return { success: true, message: msg };
        }
      }
      
      let errors;
      try {
        if (!response || (typeof response === 'object' && Object.keys(response).length === 0)) {
          errors = { general: (response && response.message) || 'Registration failed' };
        } else if (response instanceof Error) {
          errors = { general: response.message || 'Registration failed' };
        } else {
          errors = authUtils.parseApiErrors(response);
        }
      } catch (parseErr) {
        errors = { general: 'Registration failed' };
      }
      
      return { 
        success: false, 
        error: errors.general || 'Registration failed. Please check your input.',
        errors: errors,
        raw: response 
      };
    } catch (error) {
      let errors = { general: 'An unexpected error occurred' };
      
      if (error && error.response && error.response.data) {
        errors = authUtils.parseApiErrors(error.response.data);
      } else if (error && error.body) {
        try {
          const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
          errors = authUtils.parseApiErrors(body);
        } catch (e) {
          errors.general = String(error.body || error.message || 'Registration failed');
        }
      } else if (error && error.message) {
        errors.general = error.message;
      }
      
      return { 
        success: false, 
        error: errors.general,
        errors: errors,
        raw: error 
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with local logout even if API fails
    } finally {
      updateAuthState(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  // Refresh auth status
  const refreshAuth = async () => {
    try {
      // Perform a direct check so we can inspect HTTP status codes and
      // avoid treating transient/network errors as an explicit logout.
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.storyvermo.com'}/auth/check/`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (resp.ok) {
        const data = await resp.json();
        const user = authUtils.normalizeUserFromResponse(data);
        if (user) {
          updateAuthState(user);
          return true;
        }
        // No user in successful response => clear auth
        updateAuthState(null);
        return false;
      }

      // Explicit unauthenticated responses should clear auth; other
      // statuses (5xx, etc.) are treated as transient — keep current state.
      if (resp.status === 401 || resp.status === 403) {
        updateAuthState(null);
        return false;
      }

      // For other non-ok responses (network/server errors), do not clear
      // in-memory auth — return false but preserve the current state.
      return false;
    } catch (error) {
      // Network or unexpected error. Don't clear the current in-memory
      // auth state — calling code can retry or surface an error.
      return false;
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    refreshAuth,
    // Allow components to set auth state directly when appropriate
    setCurrentUser: setCurrentUserSafely
    ,
    // Convenience: expose openAuthModal so callers of useAuth() can
    // trigger the global auth modal without needing a prop from
    // `GlobalShell`.
    openAuthModal
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}