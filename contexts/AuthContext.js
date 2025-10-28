'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Helper to normalize various backend auth response shapes
  const normalizeUserFromResponse = (resp) => {
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
  };

  // Parse and normalize error messages from various shapes
  const normalizeErrorMessage = (message) => {
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'object' && message !== null) {
      try {
        return JSON.stringify(message);
      } catch (e) {
        return String(message);
      }
    }
    return String(message || '');
  };

  // Parse API error payloads (DRF, Django or custom) into structured format
  const parseApiErrors = (payload) => {
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
          errors.general = normalizeErrorMessage(val);
          continue;
        }

        // Keep original key (likely snake_case) so callers that expect that key get it
        const normalized = normalizeErrorMessage(val);
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
  };

  // Initialize state with safe defaults that match server and client
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication status on initial load
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        setLoading(true);
        const response = await authApi.checkAuth();
        console.log('Auth check response:', response);
        
        if (!mounted) return;
        
        const user = normalizeUserFromResponse(response);
        
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('isAuthenticated', 'true');
          }
          console.log('User authenticated:', user.username || user.id);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAuthenticated');
          }
          console.log('User not authenticated');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAuthenticated');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      console.log('Attempting login with:', { username: credentials.username });
      const response = await authApi.login(credentials);
      console.log('Login response:', response);

      // Check if login was successful
      if (response && (response.success || response.user)) {
        const user = normalizeUserFromResponse(response);
        
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('isAuthenticated', 'true');
          }
          console.log('Login successful:', user.username || user.id);
          
          // Small delay to ensure cookies are set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return { success: true, user };
        }
      }

      // Parse error response
      const errors = parseApiErrors(response);
      console.error('Login failed with errors:', errors);
      
      return { 
        success: false, 
        error: errors.general || 'Login failed. Please check your credentials.',
        errors: errors,
        raw: response 
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Try to parse error from response. apiRequest may attach a `.body` or set `response.data`.
      let errors = { general: 'An unexpected error occurred' };

      // axios-like error with response.data
      if (error && error.response && error.response.data) {
        errors = parseApiErrors(error.response.data);
      } else if (error && error.body) {
        // apiRequest attaches `.body` (may be string or object)
        try {
          const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
          errors = parseApiErrors(body);
        } catch (e) {
          // not JSON - use body as message
          errors.general = String(error.body || error.message || 'Authentication failed');
        }
      } else if (error && typeof error === 'object' && error.status) {
        // fallback to using message or status
        errors.general = error.message || `Error ${error.status}`;
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
      console.log('Attempting registration');
      const response = await authApi.register(userData);
      console.log('Registration response:', response);
      
      // Check if registration was successful
      if (response && (response.success || response.user)) {
        const user = normalizeUserFromResponse(response);
        
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('isAuthenticated', 'true');
          }
          console.log('Registration and auto-login successful:', user.username || user.id);
          
          // Small delay to ensure cookies are set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return { success: true, user };
        }
      }
      
      // Parse validation errors
      const errors = parseApiErrors(response);
      console.error('Registration failed with errors:', errors);
      
      return { 
        success: false, 
        error: errors.general || 'Registration failed. Please check your input.',
        errors: errors,
        raw: response 
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Try to parse error from response
      let errors = { general: 'An unexpected error occurred' };
      if (error && error.response && error.response.data) {
        errors = parseApiErrors(error.response.data);
      } else if (error && error.body) {
        try {
          const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
          errors = parseApiErrors(body);
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
      setCurrentUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthenticated');
      }
      console.log('Logout successful');
      
      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      setCurrentUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthenticated');
      }
    }
  };

  // Refresh auth status
  const refreshAuth = async () => {
    try {
      console.log('Refreshing auth status');
      const response = await authApi.checkAuth();
      console.log('Auth refresh response:', response);
      
      const user = normalizeUserFromResponse(response);
      
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('isAuthenticated', 'true');
        }
        console.log('Auth refresh successful:', user.username || user.id);
        return true;
      }
      
      setCurrentUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthenticated');
      }
      console.log('Not authenticated after refresh');
      return false;
    } catch (error) {
      console.error('Auth refresh error:', error);
      setCurrentUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthenticated');
      }
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
    refreshAuth
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