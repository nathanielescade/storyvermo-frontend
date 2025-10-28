"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '../components/AuthModal';

export default function SignupPageClient() {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    router.push('/');
  };

  return (
    <>
      <AuthModal isOpen={isOpen} onClose={handleClose} initialMode="signup" />
    </>
  );
}
