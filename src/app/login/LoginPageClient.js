"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '../components/AuthModal';

export default function LoginPageClient() {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // keep modal open when page loads
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // After closing, navigate back to home
    router.push('/');
  };

  return (
    <>
      <AuthModal isOpen={isOpen} onClose={handleClose} initialMode="login" />
    </>
  );
}
