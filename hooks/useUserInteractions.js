'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { storiesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Professional hook for managing user interactions (likes/saves) with persistence
 * Features:
 * - Optimistic updates for instant UI feedback
 * - localStorage persistence across refreshes
 * - Automatic sync with backend API
 * - Loading states for each interaction
 * - Handles race conditions and conflicts
 */
export function useUserInteractions(storyId) {
    const { isAuthenticated, currentUser } = useAuth();
    
    // Interaction state
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    
    // Loading states for individual interactions
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isSaveLoading, setIsSaveLoading] = useState(false);
    
    // Refs to handle race conditions
    const pendingLikeRef = useRef(null);
    const pendingSaveRef = useRef(null);
    const syncTimeoutRef = useRef(null);
    const syncTimeoutSaveRef = useRef(null);
    
    // Get localStorage key for this story
    const getStorageKey = useCallback((type) => {
        return `story_${storyId}_${type}`;
    }, [storyId]);
    
    // Initialize from localStorage on mount
    useEffect(() => {
        if (!isAuthenticated || !storyId) return;
        
        try {
            const savedLiked = localStorage.getItem(getStorageKey('liked')) === 'true';
            const savedSaved = localStorage.getItem(getStorageKey('saved')) === 'true';
            
            setIsLiked(savedLiked);
            setIsSaved(savedSaved);
        } catch (e) {
            // localStorage might be unavailable in SSR
        }
    }, [isAuthenticated, storyId, getStorageKey]);
    
    // Initialize like count from props or localStorage
    const initializeLikeCount = useCallback((initialCount) => {
        if (typeof initialCount === 'number' && initialCount >= 0) {
            setLikeCount(initialCount);
            // Also save to localStorage for persistence
            try {
                localStorage.setItem(getStorageKey('likeCount'), String(initialCount));
            } catch (e) {
                // localStorage might be unavailable
            }
        }
    }, [getStorageKey]);
    
    /**
     * Toggle like with optimistic update and backend sync
     */
    const toggleLike = useCallback(async (currentCount = 0) => {
        if (!isAuthenticated) {
            // Dispatch event to open auth modal
            window.dispatchEvent(new CustomEvent('auth:open', { 
                detail: { type: 'like', storyId } 
            }));
            return false;
        }
        
        // Prevent multiple rapid clicks
        if (isLikeLoading) return false;
        
        setIsLikeLoading(true);
        
        // Cancel any pending sync
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }
        
        try {
            // Store current state for potential rollback
            const previousLiked = isLiked;
            const previousCount = likeCount;
            
            // Optimistic update
            const newLiked = !previousLiked;
            const newCount = newLiked ? previousCount + 1 : Math.max(0, previousCount - 1);
            
            setIsLiked(newLiked);
            setLikeCount(newCount);
            
            // Update localStorage immediately for persistence
            try {
                localStorage.setItem(getStorageKey('liked'), String(newLiked));
                localStorage.setItem(getStorageKey('likeCount'), String(newCount));
            } catch (e) {
                // localStorage might be unavailable
            }
            
            // Schedule backend sync
            pendingLikeRef.current = { liked: newLiked, timestamp: Date.now() };
            
            syncTimeoutRef.current = setTimeout(async () => {
                try {
                    const response = await storiesApi.toggleStoryLike(storyId);
                    
                    // Update count from backend response if available
                    if (response && typeof response.likes_count === 'number') {
                        setLikeCount(response.likes_count);
                        try {
                            localStorage.setItem(getStorageKey('likeCount'), String(response.likes_count));
                        } catch (e) {
                            // localStorage might be unavailable
                        }
                    }
                    
                    pendingLikeRef.current = null;
                } catch (error) {
                    // Rollback on error
                    setIsLiked(previousLiked);
                    setLikeCount(previousCount);
                    
                    try {
                        localStorage.setItem(getStorageKey('liked'), String(previousLiked));
                        localStorage.setItem(getStorageKey('likeCount'), String(previousCount));
                    } catch (e) {
                        // ignore
                    }
                }
            }, 300); // Debounce API calls
            
            return true;
        } finally {
            setIsLikeLoading(false);
        }
    }, [isAuthenticated, isLiked, likeCount, isLikeLoading, storyId, getStorageKey]);
    
    /**
     * Toggle save with optimistic update and backend sync
     */
    const toggleSave = useCallback(async () => {
        if (!isAuthenticated) {
            window.dispatchEvent(new CustomEvent('auth:open', { 
                detail: { type: 'save', storyId } 
            }));
            return false;
        }
        
        // Prevent multiple rapid clicks
        if (isSaveLoading) return false;
        
        setIsSaveLoading(true);
        
        // Cancel any pending sync
        if (syncTimeoutSaveRef.current) {
            clearTimeout(syncTimeoutSaveRef.current);
        }
        
        try {
            // Store current state for potential rollback
            const previousSaved = isSaved;
            
            // Optimistic update
            const newSaved = !previousSaved;
            setIsSaved(newSaved);
            
            // Update localStorage immediately
            try {
                localStorage.setItem(getStorageKey('saved'), String(newSaved));
            } catch (e) {
                // localStorage might be unavailable
            }
            
            // Schedule backend sync
            pendingSaveRef.current = { saved: newSaved, timestamp: Date.now() };
            
            syncTimeoutSaveRef.current = setTimeout(async () => {
                try {
                    await storiesApi.toggleStorySave(storyId);
                    pendingSaveRef.current = null;
                } catch (error) {
                    // Rollback on error
                    setIsSaved(previousSaved);
                    
                    try {
                        localStorage.setItem(getStorageKey('saved'), String(previousSaved));
                    } catch (e) {
                        // ignore
                    }
                }
            }, 300); // Debounce API calls
            
            return true;
        } finally {
            setIsSaveLoading(false);
        }
    }, [isAuthenticated, isSaved, isSaveLoading, storyId, getStorageKey]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
            if (syncTimeoutSaveRef.current) {
                clearTimeout(syncTimeoutSaveRef.current);
            }
        };
    }, []);
    
    return {
        // State
        isLiked,
        isSaved,
        likeCount,
        
        // Loading states
        isLikeLoading,
        isSaveLoading,
        
        // Actions
        toggleLike,
        toggleSave,
        initializeLikeCount,
        
        // Refs to check for pending operations
        hasPendingLike: () => pendingLikeRef.current !== null,
        hasPendingSave: () => pendingSaveRef.current !== null,
    };
}

export default useUserInteractions;
