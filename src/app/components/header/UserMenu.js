// components/header/UserMenu.jsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../../contexts/AuthContext';

const UserMenu = ({ openAuthModal }) => {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
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
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {getProfileImageUrl(currentUser) ? (
              <Image 
                src={getProfileImageUrl(currentUser)} 
                alt={`${getUsername(currentUser)}'s profile`} 
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              getUserInitial(getUsername(currentUser))
            )}
          </button>
          
          <div className={`absolute right-0 mt-2 w-48 bg-gradient-to-b from-gray-900 to-black border border-neon-blue/30 rounded-lg shadow-lg z-50 overflow-hidden ${showUserMenu ? '' : 'hidden'}`}>
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
        // Login button when not authenticated
        <button 
          className="text-white hover:text-neon-blue transition-colors font-medium"
          onClick={() => {
            if (openAuthModal) {
              openAuthModal();
            } else {
              router.push('/login');
            }
          }}
        >
          Login
        </button>
      )}
    </div>
  );
};

export default UserMenu;