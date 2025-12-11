// components/header/UserMenu.jsx
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../contexts/AuthContext';

const UserMenu = ({ openAuthModal, isOpen = false, onOpen, onClose }) => {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const userMenuRef = useRef(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
    }
  };



  // Helper functions
  const getUserInitial = (username) => {
    if (!username || typeof username !== 'string') return '';
    return username.charAt(0).toUpperCase();
  };

  const getUsername = (user) => {
    if (!user) return '';
    return user.username || '';
  };

  const getUserEmail = (user) => {
    if (!user) return '';
    return user.email || '';
  };

  const getProfileImageUrl = (user) => {
    if (!user) return '';
    return user.profile_image_url || '';
  };

  return (
    <div className="relative" ref={userMenuRef}>
      {isAuthenticated && currentUser ? (
        <>
          <button 
            className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(255,107,53,0.7)] transition-transform hover:scale-105 overflow-hidden"
            onClick={() => {
              if (isOpen) {
                onClose?.();
              } else {
                onOpen?.();
              }
            }}
          >
            {getProfileImageUrl(currentUser) ? (
              // FIXED: Using Next.js Image for optimization
              <Image 
                src={getProfileImageUrl(currentUser)} 
                alt={`${getUsername(currentUser)}'s profile`} 
                fill
                className="object-cover"
                quality={75}
              />
            ) : (
              getUserInitial(getUsername(currentUser))
            )}
          </button>
          <div className={`absolute right-0 mt-2 w-56 bg-gradient-to-b from-gray-900 to-black border border-neon-blue/30 rounded-lg shadow-lg z-50 overflow-hidden ${isOpen ? '' : 'hidden'}`}>
            <div className="p-3 border-b border-neon-blue/20">
              <p className="text-white font-medium">{getUsername(currentUser)}</p>
              <p className="text-gray-400 text-sm">{getUserEmail(currentUser)}</p>
            </div>
            <Link 
              href={`/${getUsername(currentUser)}`}
              className="w-full text-left px-4 py-3 text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-user"></i>
              <span>Profile</span>
            </Link>
            <Link 
              href="/saved"
              className="w-full text-left px-4 py-3 text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-bookmark"></i>
              <span>Saved</span>
            </Link>
            <div className="border-t border-neon-blue/20 my-1" />
            <Link href="/about" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => onClose?.()}>
              <i className="fas fa-info-circle"></i>
              <span>About</span>
            </Link>
            <Link href="/contact" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => onClose?.()}>
              <i className="fas fa-envelope"></i>
              <span>Contact</span>
            </Link>
            <Link href="/terms" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => onClose?.()}>
              <i className="fas fa-file-contract"></i>
              <span>Terms</span>
            </Link>
            <Link href="/privacy" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => onClose?.()}>
              <i className="fas fa-user-shield"></i>
              <span>Privacy</span>
            </Link>
            <div className="border-t border-neon-blue/20 my-1" />
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 bg-transparent border-0"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center text-white text-xl shadow-[0_0_15px_rgba(255,107,53,0.7)] transition-transform hover:scale-105"
            aria-label="Open menu"
            onClick={() => {
              if (isOpen) {
                onClose?.();
              } else {
                onOpen?.();
              }
            }}
          >
            <i className="fas fa-bars"></i>
          </button>
          <div className={`absolute right-0 mt-2 w-56 bg-gradient-to-b from-gray-900 to-black border border-neon-blue/30 rounded-lg shadow-lg z-50 overflow-hidden ${isOpen ? '' : 'hidden'}`}>
            <button
              className="w-full text-left px-4 py-3 text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2 bg-transparent border-0"
              onClick={() => {
                onClose?.();
                if (openAuthModal) {
                  openAuthModal();
                } else {
                  router.push('/login');
                }
              }}
            >
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </button>
            <div className="border-t border-neon-blue/20 my-1" />
            <Link href="/about" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => setShowUserMenu(false)}>
              <i className="fas fa-info-circle"></i>
              <span>About</span>
            </Link>
            <Link href="/contact" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => setShowUserMenu(false)}>
              <i className="fas fa-envelope"></i>
              <span>Contact</span>
            </Link>
            <Link href="/terms" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => setShowUserMenu(false)}>
              <i className="fas fa-file-contract"></i>
              <span>Terms</span>
            </Link>
            <Link href="/privacy" className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2" onClick={() => setShowUserMenu(false)}>
              <i className="fas fa-user-shield"></i>
              <span>Privacy</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;