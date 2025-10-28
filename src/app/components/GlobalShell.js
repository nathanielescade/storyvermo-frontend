"use client";

import { useEffect, useState } from 'react';
import Header from './Header';
import DimensionNav from './DimensionNav';
import AuthModal from './AuthModal';
import StoryFormModal from './StoryFormModal';

export default function GlobalShell() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isStoryFormModalOpen, setIsStoryFormModalOpen] = useState(false);

  // Listen for programmatic requests to open auth modal (from any component)
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      setPendingAction(detail || null);
      setIsAuthModalOpen(true);
    };
    window.addEventListener('auth:open', handler);
    return () => window.removeEventListener('auth:open', handler);
  }, []);

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

    // Close the auth modal and clear pending action
    setIsAuthModalOpen(false);
    setPendingAction(null);
  };

  const openStoryFormModal = () => setIsStoryFormModalOpen(true);
  const closeStoryFormModal = () => setIsStoryFormModalOpen(false);

  return (
    <>
      <Header openAuthModal={openAuthModal} />
      <DimensionNav openAuthModal={openAuthModal} openStoryFormModal={openStoryFormModal} />

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} onAuthSuccess={handleAuthSuccess} />

      <StoryFormModal isOpen={isStoryFormModalOpen} onClose={closeStoryFormModal} mode="create" />
    </>
  );
}
