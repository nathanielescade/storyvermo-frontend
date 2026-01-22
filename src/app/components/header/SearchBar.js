// components/header/SearchBar.jsx - FIXED: Backend storage, no localStorage
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { searchApi, searchHistoryApi } from '../../../../lib/api';
import { debounce } from '../../../../lib/debounce'; // 🔥 OPTIMIZED: Lightweight custom debounce
import { useAuth } from '../../../../contexts/AuthContext';

const SearchBar = ({ 
  isMobile = false, 
  shouldFocus = false,
  onClose, 
  initialQuery = '',
  onSearchSubmit 
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState([]);
  const [results, setResults] = useState({
    stories: [],
    verses: [],
    creators: [],
    loading: false
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // 🔥 FIXED: Load recent searches from BACKEND on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      if (!isAuthenticated) {
        setRecentSearches([]);
        return;
      }
      
      try {
        const searches = await searchHistoryApi.getRecent();
        setRecentSearches(Array.isArray(searches) ? searches : []);
      } catch (error) {
        setRecentSearches([]);
      }
    };
    
    loadRecentSearches();
  }, [isAuthenticated]);

  // Auto-focus when component mounts (desktop only, or mobile with shouldFocus)
  useEffect(() => {
    if (!isMobile && searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }

    if (isMobile && shouldFocus && searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isMobile, shouldFocus]);

  // Handle search input changes with auto-suggest
  const handleSearchInput = (e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    debouncedSearch(newQuery);
    if (newQuery && newQuery.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Clear search input
  const clearSearchInput = (e) => {
    e.preventDefault();
    setSearchQuery('');
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Debounced search function
  const debouncedSearch = debounce(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults(prev => ({ ...prev, stories: [], verses: [], creators: [], loading: false }));
      return;
    }

    try {
      setResults(prev => ({ ...prev, loading: true }));
      
      const [storiesRes, versesRes, creatorsRes] = await Promise.allSettled([
        searchApi.searchStories(searchQuery),
        searchApi.searchVerses(searchQuery),
        searchApi.searchCreators(searchQuery)
      ]);

      const newResults = {
        stories: storiesRes.status === 'fulfilled' && storiesRes.value ? storiesRes.value : [],
        verses: versesRes.status === 'fulfilled' && versesRes.value ? versesRes.value : [],
        creators: creatorsRes.status === 'fulfilled' && creatorsRes.value ? creatorsRes.value : [],
        loading: false
      };

      setResults(newResults);
    } catch (error) {
      setResults(prev => ({ ...prev, loading: false }));
    }
  }, 120);

  // Navigate when selecting a suggestion
  const navigateToSuggestion = (sugg) => {
    try {
      if (!sugg) return;
      if (sugg.type === 'story') {
        const slug = sugg.slug || sugg.story_slug || (sugg.id ? sugg.id : null);
        if (slug) router.push(`/stories/${encodeURIComponent(slug)}/`);
      } else if (sugg.type === 'creator') {
        const username = sugg.username || sugg.user || sugg.creator_username;
        if (username) router.push(`/${encodeURIComponent(username)}`);
      } else if (sugg.type === 'verse') {
        const storySlug = sugg.story_slug || (sugg.story && (sugg.story.slug || sugg.story.story_slug)) || null;
        const verseId = sugg.id || sugg.public_id || sugg.slug || null;
        if (storySlug && verseId) {
          router.push(`/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(verseId)}`);
        } else if (storySlug) {
          router.push(`/stories/${encodeURIComponent(storySlug)}/`);
        }
      }
    } catch (e) {
    } finally {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      if (isMobile && onClose) onClose();
    }
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    
    const totalSuggestions = results.stories.slice(0,5).length + 
                            results.creators.slice(0,5).length + 
                            results.verses.slice(0,5).length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < totalSuggestions - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0) {
        const stories = results.stories.slice(0,5);
        const creators = results.creators.slice(0,5);
        const verses = results.verses.slice(0,5);
        
        if (activeSuggestionIndex < stories.length) {
          navigateToSuggestion({ ...stories[activeSuggestionIndex], type: 'story' });
        } else if (activeSuggestionIndex < stories.length + creators.length) {
          navigateToSuggestion({ ...creators[activeSuggestionIndex - stories.length], type: 'creator' });
        } else {
          navigateToSuggestion({ ...verses[activeSuggestionIndex - stories.length - creators.length], type: 'verse' });
        }
      } else {
        handleSearch(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  // 🔥 FIXED: Save search to BACKEND instead of localStorage
  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery) return;
    
    try {
      // Save to backend if authenticated
      if (isAuthenticated) {
        await searchHistoryApi.save(trimmedQuery);
        
        // Update local state optimistically
        setRecentSearches(prev => {
          const filtered = prev.filter(s => s !== trimmedQuery);
          return [trimmedQuery, ...filtered].slice(0, 10);
        });
      }
      
      // Navigate to search page
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setShowSuggestions(false);
      if (isMobile && onClose) onClose();
    } catch (error) {
      // Still navigate even if save fails
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setShowSuggestions(false);
      if (isMobile && onClose) onClose();
    }
  };

  // 🔥 FIXED: Clear searches from BACKEND
  const clearRecentSearches = async () => {
    if (!isAuthenticated) return;
    
    try {
      await searchHistoryApi.clear();
      setRecentSearches([]);
    } catch (error) {
      alert('Failed to clear search history. Please try again.');
    }
  };

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      try { debouncedSearch.cancel(); } catch (e) { /* ignore */ }
    };
  }, [debouncedSearch]);

  return (
    <div className="relative" ref={searchContainerRef}>
      <form onSubmit={handleSearch}>
        <div className="relative">
          <input
            type="text"
            ref={searchInputRef}
            placeholder="Search verses, tags, creators..."
            className={`search-input ${isMobile ? 
              'w-full py-3 pl-12 pr-12 rounded-full bg-black/80 backdrop-blur-lg border-2 border-neon-blue' : 
              'w-64 py-2.5 pl-10 pr-10 rounded-full bg-black/30 backdrop-blur-md border border-neon-blue/50'
            } text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all`}
            value={searchQuery}
            onChange={handleSearchInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 100)}
          />
          <i className={`fas fa-search absolute ${isMobile ? 'left-4' : 'left-3'} top-1/2 transform -translate-y-1/2 text-neon-blue ${isMobile ? 'text-xl' : ''}`}></i>
          
          {/* Clear button */}
          {searchQuery ? (
            <button 
              type="button"
              className={`absolute ${isMobile ? 'right-4' : 'right-3'} top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white`}
              onClick={clearSearchInput}
            >
              <i className="fas fa-times"></i>
            </button>
          ) : isMobile && onClose ? (
            <button 
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
            </button>
          ) : null}
          
          {/* Auto-suggest dropdown */}
          {showSuggestions && (results.stories.length > 0 || results.creators.length > 0 || results.verses.length > 0) && (
            <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-gray-700 rounded-2xl shadow-xl z-50 max-h-72 overflow-auto">
              <div className="p-2">
                {results.loading && (
                  <div className="p-4 text-center text-gray-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Searching...
                  </div>
                )}
                
                {results.stories.slice(0,5).map((s, i) => (
                  <div 
                    key={`s-${s.id || s.slug || i}`} 
                    className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === i ? 'bg-slate-800' : ''}`} 
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      navigateToSuggestion({ ...s, type: 'story' }); 
                    }}
                  >
                    <div className="text-sm font-semibold text-white truncate">{s.title || s.story_title || s.slug}</div>
                    <div className="text-xs text-gray-400 truncate">Story</div>
                  </div>
                ))}

                {results.creators.slice(0,5).map((c, j) => (
                  <div 
                    key={`c-${c.id || c.username || j}`} 
                    className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === (results.stories.slice(0,5).length + j) ? 'bg-slate-800' : ''}`} 
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      navigateToSuggestion({ ...c, type: 'creator' }); 
                    }}
                  >
                    {/* FIXED: Show full name as primary, username as secondary small text */}
                    <div className="text-sm font-semibold text-white">{c.display_name || c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : c.username}</div>
                    <div className="text-xs text-gray-400">@{c.username}</div>
                    <div className="text-xs text-gray-400">Creator</div>
                  </div>
                ))}

                {results.verses.slice(0,5).map((v, k) => (
                  <div 
                    key={`v-${v.id || v.public_id || k}`} 
                    className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === (results.stories.slice(0,5).length + results.creators.slice(0,5).length + k) ? 'bg-slate-800' : ''}`} 
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      navigateToSuggestion({ ...v, type: 'verse' }); 
                    }}
                  >
                    <div className="text-sm font-semibold text-white truncate">{(v.title && v.title.trim()) || (v.content && String(v.content).slice(0,60)) || `Verse ${v.id || v.public_id || ''}`}</div>
                    <div className="text-xs text-gray-400">Verse</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Searches dropdown (only when input is focused and authenticated) */}
          {!showSuggestions && inputFocused && isAuthenticated && recentSearches.length > 0 && (
            <div className="search-dropdown absolute left-0 right-0 mt-2 bg-slate-900 border border-gray-700 rounded-2xl shadow-xl z-50 max-h-60 overflow-auto">
              <div className="search-section p-2">
                <div className="search-section-title flex justify-between items-center mb-2 px-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <i className="fas fa-history"></i> Recent Searches
                  </h3>
                  <button 
                    className="search-clear text-xs text-gray-400 hover:text-white"
                    onClick={clearRecentSearches}
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <div 
                      key={index} 
                      className="search-item p-2 rounded hover:bg-slate-800 cursor-pointer text-sm text-white"
                      onClick={() => {
                        setSearchQuery(search);
                        router.push(`/search?q=${encodeURIComponent(search)}`);
                        setInputFocused(false);
                        if (isMobile && onClose) onClose();
                      }}
                    >
                      <i className="fas fa-clock mr-2 text-gray-500"></i>
                      {search}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Message for non-authenticated users */}
          {!showSuggestions && inputFocused && !isAuthenticated && (
            <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-gray-700 rounded-2xl shadow-xl z-50 p-4 text-center">
              <i className="fas fa-user-lock text-3xl text-gray-600 mb-2"></i>
              <p className="text-sm text-gray-400">Sign in to see your search history</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchBar;