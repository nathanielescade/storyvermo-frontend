// components/header/SearchBar.jsx
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { searchApi } from '../../../../lib/api';
import debounce from 'lodash/debounce';

const SearchBar = ({ 
  isMobile = false, 
  onClose, 
  initialQuery = '',
  onSearchSubmit 
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState([]);
  const [results, setResults] = useState({
    stories: [],
    verses: [],
    creators: [],
    loading: false
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Auto-focus when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, []);

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Add to recent searches
      const newSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem('recentSearches', JSON.stringify(newSearches));
      
      // Navigate to search page
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
      if (isMobile && onClose) onClose();
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
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
                    <div className="text-sm font-semibold text-white">{c.display_name || c.username}</div>
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
          
          {/* Recent Searches dropdown */}
          {!showSuggestions && (
            <div className="search-dropdown">
              <div className="search-section">
                <div className="search-section-title">
                  <h3 className="flex items-center gap-1">
                    <i className="fas fa-history"></i> Recent Searches
                  </h3>
                  <button 
                    className="search-clear"
                    onClick={clearRecentSearches}
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {recentSearches.map((search, index) => (
                    <div 
                      key={index} 
                      className="search-item"
                      onClick={() => {
                        setSearchQuery(search);
                        router.push(`/search?q=${encodeURIComponent(search)}`);
                      }}
                    >
                      {search}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchBar;