"use client";

import { useEffect, useState } from 'react';
import Header from './Header';
import DimensionNav from './DimensionNav';
import AuthModal from './AuthModal';
import StoryFormModal from './StoryFormModal';
import DiscoverModal from './DiscoverModal';
import { useAuth } from '../../../contexts/AuthContext';

export default function GlobalShell() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isStoryFormModalOpen, setIsStoryFormModalOpen] = useState(false);
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Listen for programmatic requests to open auth modal (from any component)
  useEffect(() => {
    setHasMounted(true);
    
    const handler = (e) => {
      const detail = e?.detail || {};
      setPendingAction(detail || null);
      setIsAuthModalOpen(true);
    };
    window.addEventListener('auth:open', handler);
    return () => window.removeEventListener('auth:open', handler);
  }, []);

  // Listen for shell-level requests (from Sidebar) to open story form or discover
  const { currentUser, isAuthenticated } = useAuth();
  useEffect(() => {
    const openStoryHandler = () => {
      if (isAuthenticated) {
        setIsStoryFormModalOpen(true);
      } else {
        // Trigger auth flow with pending create action
        window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'create' } }));
      }
    };

    const openDiscoverHandler = () => {
      if (isAuthenticated) {
        setIsDiscoverModalOpen(true);
      } else {
        window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'discover' } }));
      }
    };

    window.addEventListener('shell:open_story_form', openStoryHandler);
    window.addEventListener('shell:open_discover', openDiscoverHandler);

    return () => {
      window.removeEventListener('shell:open_story_form', openStoryHandler);
      window.removeEventListener('shell:open_discover', openDiscoverHandler);
    };
  }, [isAuthenticated]);

  const openAuthModal = (type = null, data = null) => {
    // Convenience function for client components that import GlobalShell directly
    window.dispatchEvent(new CustomEvent('auth:open', { detail: { type, data } }));
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPendingAction(null);
  };

  const handleAuthSuccess = () => {
    // Broadcast that auth succeeded so other components (pages) can react
    try {
      window.dispatchEvent(new CustomEvent('auth:success', { detail: pendingAction }));
    } catch (e) {
      console.debug('auth:success dispatch failed', e);
    }

    // If pendingAction indicates we should open the story form modal, do that here
    if (pendingAction && pendingAction.type === 'create') {
      setIsStoryFormModalOpen(true);
    }

    // If pendingAction indicates we should open discover, do that here
    if (pendingAction && pendingAction.type === 'discover') {
      setIsDiscoverModalOpen(true);
    }

    // Close the auth modal and clear pending action
    setIsAuthModalOpen(false);
    setPendingAction(null);
  };

  const openStoryFormModal = () => setIsStoryFormModalOpen(true);
  const closeStoryFormModal = () => setIsStoryFormModalOpen(false);

  const openDiscoverModal = () => setIsDiscoverModalOpen(true);
  const closeDiscoverModal = () => setIsDiscoverModalOpen(false);

  return (
    <>
      <Header openAuthModal={openAuthModal} />
      <DimensionNav openAuthModal={openAuthModal} openStoryFormModal={openStoryFormModal} openDiscoverModal={openDiscoverModal} />

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} onAuthSuccess={handleAuthSuccess} />

      {hasMounted && <StoryFormModal isOpen={isStoryFormModalOpen} onClose={closeStoryFormModal} mode="create" />}

      <DiscoverModal isOpen={isDiscoverModalOpen} onClose={closeDiscoverModal} />
    </>
  );
}