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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      setShowLogoutConfirm(false);
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
            className="relative w-10 h-10 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(0,212,255,0.7)] transition-transform hover:scale-105 flex-shrink-0"
            onClick={() => {
              if (isOpen) {
                onClose?.();
              } else {
                onOpen?.();
              }
            }}
            title="Menu"
          >
            <i className="fas fa-bars text-lg"></i>
          </button>
          <div className={`absolute right-0 mt-2 w-56 bg-gradient-to-b from-gray-900 to-black border border-neon-blue/30 rounded-lg shadow-lg z-50 overflow-hidden ${isOpen ? '' : 'hidden'}`}>
            <div className="p-3 border-b border-neon-blue/20">
              <p className="text-white font-medium">{getUsername(currentUser)}</p>
              <p className="text-gray-400 text-sm">{getUserEmail(currentUser)}</p>
            </div>
            <div className="border-t border-neon-blue/20 my-1" />
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-900/50 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
                <i className="fas fa-sign-out-alt text-red-400 text-lg"></i>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Confirm Logout</h3>
                <p className="text-gray-400 text-sm">Are you sure?</p>
              </div>
            </div>

            {/* Message */}
            <p className="text-gray-300 mb-6 leading-relaxed">
              You'll be logged out of your account. You can always log back in anytime.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700/50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-red-900/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;