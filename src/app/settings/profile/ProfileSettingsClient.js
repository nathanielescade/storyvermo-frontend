'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import ReactCountryFlag from 'react-country-flag';
import { useAuth } from '../../../../contexts/AuthContext';
import { userApi } from '../../../../lib/api';

// 🔥 OPTIMIZED: Lazy load country-state-city only when settings page loads
let CountryStateCityModule = null;
const loadCountriesAndCities = async () => {
  if (!CountryStateCityModule) {
    CountryStateCityModule = await import('country-state-city');
  }
  return CountryStateCityModule;
};

export default function ProfileSettingsClient() {
  const router = useRouter();
  const { currentUser, refreshAuth, setCurrentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null); // Toast notification state
  const formRef = useRef(null);
  const [countries, setCountries] = useState([]); // Lazy loaded countries
  const [countriesLoaded, setCountriesLoaded] = useState(false);

  const [formData, setFormData] = useState({
    account_type: 'personal',
    brand_name: '',
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    bio: '',
    country: '',
    city: '',
    gender: '',
    preferred_categories: []
  });

  // Select states
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);

  // Options memoization
  const genderOptions = useMemo(() => [
    { value: 'male', label: 'Male', icon: '👨' },
    { value: 'female', label: 'Female', icon: '👩' }
  ], []);

  const categoryOptions = useMemo(() => [
    // Creative Writing & Storytelling
    { value: 'fiction', label: 'Fiction Writing', icon: '📚', group: 'Creative Writing' },
    { value: 'poetry', label: 'Poetry & Verse', icon: '🎭', group: 'Creative Writing' },
    { value: 'sci_fi', label: 'Science Fiction', icon: '🚀', group: 'Creative Writing' },
    { value: 'fantasy', label: 'Fantasy', icon: '🐉', group: 'Creative Writing' },
    
    // Arts & Creativity
    { value: 'visual_arts', label: 'Visual Arts', icon: '🎨', group: 'Arts & Creativity' },
    { value: 'photography', label: 'Photography', icon: '📸', group: 'Arts & Creativity' },
    { value: 'illustration', label: 'Illustration & Comics', icon: '✏️', group: 'Arts & Creativity' },
    { value: 'fashion', label: 'Fashion & Style', icon: '👗', group: 'Arts & Creativity' },
    
    // Entertainment & Pop Culture
    { value: 'movies', label: 'Movies & Film', icon: '🎬', group: 'Entertainment' },
    { value: 'music', label: 'Music & Audio', icon: '🎵', group: 'Entertainment' },
    { value: 'gaming', label: 'Gaming & eSports', icon: '🎮', group: 'Entertainment' },
    { value: 'pop_culture', label: 'Pop Culture', icon: '🌟', group: 'Entertainment' },
    
    // Technology & Innovation
    { value: 'tech', label: 'Tech & Innovation', icon: '💻', group: 'Technology' },
    { value: 'ai_ml', label: 'AI & Future Tech', icon: '🤖', group: 'Technology' },
    { value: 'web3', label: 'Web3 & Crypto', icon: '⛓️', group: 'Technology' },
    
    // Lifestyle & Wellness
    { value: 'fitness', label: 'Fitness & Health', icon: '💪', group: 'Lifestyle' },
    { value: 'mindfulness', label: 'Mindfulness & Growth', icon: '🧘', group: 'Lifestyle' },
    { value: 'travel', label: 'Travel & Adventure', icon: '✈️', group: 'Lifestyle' },
    { value: 'hotel', label: 'Hotel & Hospitality', icon: '🏨', group: 'Lifestyle' },
    
    // Food & Culture
    { value: 'food', label: 'Food & Cooking', icon: '🍳', group: 'Food & Culture' },
    { value: 'drinks', label: 'Drinks & Mixology', icon: '🍹', group: 'Food & Culture' },
    { value: 'culture', label: 'Cultural Stories', icon: '🌏', group: 'Food & Culture' },
    
    // Sports & Activities
    { value: 'sports', label: 'Sports & Athletics', icon: '⚽', group: 'Sports' },
    { value: 'outdoor', label: 'Outdoor Life', icon: '🏕️', group: 'Sports' },
    { value: 'extreme_sports', label: 'Extreme Sports', icon: '🏂', group: 'Sports' },
    
    // Business & Professional
    { value: 'startup', label: 'Startups & Business', icon: '💼', group: 'Business' },
    { value: 'finance', label: 'Finance & Investing', icon: '📈', group: 'Business' },
    { value: 'career', label: 'Career & Growth', icon: '🎯', group: 'Business' },
    { value: 'real_estate', label: 'Real Estate', icon: '🏘️', group: 'Business' },
    
    // Social Causes & Community
    { value: 'causes', label: 'Social Causes', icon: '✊', group: 'Community' },
    { value: 'education', label: 'Education & Learning', icon: '📚', group: 'Community' },
    { value: 'events', label: 'Local Events', icon: '🎪', group: 'Community' }
  ], []);

  // 🔥 OPTIMIZED: Lazy load countries only when component mounts
  useEffect(() => {
    if (countriesLoaded) return;

    const loadCountries = async () => {
      try {
        const CountryCityModule = await loadCountriesAndCities();
        const countryList = CountryCityModule.Country.getAllCountries();
        const options = countryList.map(country => ({
          value: country.isoCode,
          label: country.name,
          flag: country.isoCode
        }));
        setCountries(options);
        setCountriesLoaded(true);
      } catch (err) {
      }
    };

    loadCountries();
  }, [countriesLoaded]);

  const countryOptions = countries;

  // Custom styles for react-select
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'linear-gradient(to bottom, rgb(31, 41, 55), rgb(17, 24, 39))',
      borderColor: state.isFocused ? '#3b82f6' : 'rgba(59, 130, 246, 0.5)',
      borderRadius: '0.75rem',
      padding: '4px',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none',
      '&:hover': {
        borderColor: '#3b82f6'
      }
    }),
    menu: (base) => ({
      ...base,
      background: 'rgb(17, 24, 39)',
      borderRadius: '0.75rem',
      padding: '8px'
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
      color: 'white',
      borderRadius: '0.5rem',
      '&:hover': {
        background: 'rgba(59, 130, 246, 0.2)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'white'
    }),
    input: (base) => ({
      ...base,
      color: 'white'
    }),
    placeholder: (base) => ({
      ...base,
      color: 'rgb(107, 114, 128)'
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderRadius: '0.5rem',
      padding: '2px',
      border: '1px solid rgba(59, 130, 246, 0.3)'
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'white'
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'rgba(255, 255, 255, 0.6)',
      ':hover': {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        color: '#EF4444'
      }
    })
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser?.username) {
        router.push('/login');
        return;
      }

      try {
        const userData = await userApi.getProfile(currentUser.username);
        
        // Set form data
        setFormData({
          account_type: userData.account_type || 'personal',
          brand_name: userData.brand_name || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          username: userData.username || '',
          bio: userData.bio || '',
          country: userData.country || '',
          city: userData.city || '',
          gender: userData.gender || '',
          preferred_categories: userData.preferred_categories || []
        });

        // Set select states
        if (userData.country) {
          const country = countryOptions.find(c => c.value === userData.country);
          setSelectedCountry(country);
          if (country) {
            const cities = City.getCitiesOfCountry(country.value) || [];
            setAvailableCities(cities.map(city => ({
              value: city.name,
              label: city.name
            })));
            if (userData.city) {
              setSelectedCity({ value: userData.city, label: userData.city });
            }
          }
        }

        if (userData.gender) {
          const matchingGender = genderOptions.find(g => g.value === userData.gender);
          setSelectedGender(matchingGender || null);
        }

        if (userData.preferred_categories && Array.isArray(userData.preferred_categories)) {
          const matchingCategories = categoryOptions.filter(cat => 
            userData.preferred_categories.includes(cat.value)
          );
          setSelectedCategories(matchingCategories);
        }

        setLoading(false);
      } catch (error) {
        setError('Failed to load profile data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, router, categoryOptions, countryOptions, genderOptions]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle country change
  const handleCountryChange = async (selectedOption) => {
    setSelectedCountry(selectedOption);
    setSelectedCity(null);
    setFormData(prev => ({
      ...prev,
      country: selectedOption?.value || '',
      city: ''
    }));
    
    if (selectedOption) {
      try {
        const CountryCityModule = await loadCountriesAndCities();
        const cities = CountryCityModule.City.getCitiesOfCountry(selectedOption.value) || [];
        setAvailableCities(cities.map(city => ({
          value: city.name,
          label: city.name
        })));
      } catch (err) {
      }
    } else {
      setAvailableCities([]);
    }
  };

  // Handle city change
  const handleCityChange = (selectedOption) => {
    setSelectedCity(selectedOption);
    setFormData(prev => ({
      ...prev,
      city: selectedOption?.value || ''
    }));
  };

  // Handle gender change
  const handleGenderChange = (selectedOption) => {
    setSelectedGender(selectedOption);
    setFormData(prev => ({
      ...prev,
      gender: selectedOption?.value || ''
    }));
  };

  // Handle categories change
  const handleCategoriesChange = (selectedOption) => {
    if (!selectedOption) return;
    
    // Only add if less than 1 category selected
    if (selectedCategories.length < 1) {
      const newCategories = [...selectedCategories, selectedOption];
      setSelectedCategories(newCategories);
      setFormData(prev => ({
        ...prev,
        preferred_categories: newCategories.map(opt => opt.value)
      }));
    }
  };

  // Remove category
  const removeCategory = (valueToRemove) => {
    const newCategories = selectedCategories.filter(cat => cat.value !== valueToRemove);
    setSelectedCategories(newCategories);
    setFormData(prev => ({
      ...prev,
      preferred_categories: newCategories.map(opt => opt.value)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!currentUser || !currentUser.username) {
        setError('Unable to determine current user');
        setSaving(false);
        return;
      }

      // Create a copy of formData with username
      const dataToSend = { 
        ...formData,
        username: currentUser.username // Include username for the API endpoint
      };
      
      // Try to update the profile on the server and refresh auth state.
      const updateResp = await userApi.updateCurrentUserProfile(dataToSend);
      const refreshed = await refreshAuth(); // Try to refresh auth context with new user data

      // If the auth check failed but the profile update returned user data,
      // update the in-memory auth state directly as a safe fallback so the
      // user isn't logged out in the UI.
      if (!refreshed && updateResp) {
        const maybeUser = updateResp.user || updateResp;
        if (maybeUser && setCurrentUser) {
          setCurrentUser(maybeUser);
        }
      }
      
      // Show success toast notification
      setToast({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setToast(null), 3000);
      
      // Also set success state but don't scroll
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      // Show error toast notification
      setToast({ type: 'error', message: error.message || 'Failed to update profile' });
      setTimeout(() => setToast(null), 4000);
      
      setError(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950">
        <div className="text-gray-400">Loading profile settings...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950">
      <div className="w-full max-w-2xl h-[100dvh] overflow-y-auto rounded-2xl shadow-2xl bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 p-0 m-0 flex flex-col justify-start pb-24">
        {/* Success/Error Messages */}
        <div className="p-6">
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">
              Profile updated successfully!
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}
        </div>
        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 p-6 pt-0 flex-grow">
          <div className="mb-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center px-3 py-2 rounded-lg bg-gray-800 hover:bg-blue-900 text-blue-300 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
              Edit Profile
            </h1>
          </div>
          <p className="text-gray-400 mb-4">Update your profile information and preferences</p>
          {/* Name Fields */}
          {formData.account_type === 'personal' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  placeholder="Last name"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
                Brand Name
              </label>
              <input
                type="text"
                name="brand_name"
                value={formData.brand_name}
                onChange={handleChange}
                className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                placeholder="Enter your brand, business, or organization name"
              />
            </div>
          )}
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              placeholder="Username"
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">Username cannot be changed</p>
          </div>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              placeholder="your.email@example.com"
            />
          </div>
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
              Bio
              <span className="text-xs text-gray-500 ml-2 normal-case">Tell others about yourself</span>
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              placeholder="Write a brief bio..."
              maxLength={500}
            />
            <div className="mt-1 text-xs text-gray-500 flex justify-end">
              {formData.bio.length}/500 characters
            </div>
          </div>
          {/* Gender - Required for personal accounts */}
          {formData.account_type === 'personal' && (
            <div>
              <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
                Gender <span className="text-red-400">*</span>
              </label>
              <Select
                value={selectedGender}
                onChange={handleGenderChange}
                options={genderOptions}
                styles={customSelectStyles}
                placeholder="Select your gender"
                isSearchable={false}
                formatOptionLabel={option => (
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label={option.label}>
                      {option.icon}
                    </span>
                    {option.label}
                  </div>
                )}
              />
            </div>
          )}
          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
              Country (Optional)
            </label>
            <Select
              value={selectedCountry}
              onChange={handleCountryChange}
              options={countryOptions}
              styles={customSelectStyles}
              isClearable
              placeholder="Select your country"
              formatOptionLabel={country => (
                <div className="flex items-center gap-2">
                  <ReactCountryFlag
                    countryCode={country.flag}
                    svg
                    style={{
                      width: '1.2em',
                      height: '1.2em'
                    }}
                  />
                  {country.label}
                </div>
              )}
            />
          </div>
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
              City (Optional)
            </label>
            <Select
              value={selectedCity}
              onChange={handleCityChange}
              options={availableCities}
              styles={customSelectStyles}
              isClearable
              isDisabled={!selectedCountry}
              placeholder={selectedCountry ? "Select your city" : "Please select a country first"}
            />
          </div>
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">
              Preferred Content Category (Optional)
            </label>
            
            {/* Display selected categories as chips */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedCategories.map(cat => (
                  <div key={cat.value} className="flex items-center gap-2 bg-blue-600/30 border border-blue-500/50 rounded-lg px-3 py-1">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm text-white">{cat.label}</span>
                    <button
                      type="button"
                      onClick={() => removeCategory(cat.value)}
                      className="text-blue-300 hover:text-red-400 transition-colors ml-1"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Select dropdown - single select, no keyboard input, disabled when 1 selected */}
            {selectedCategories.length < 1 && (
              <Select
                value={null}
                onChange={handleCategoriesChange}
                options={(() => {
                  const groups = {};
                  categoryOptions.forEach(option => {
                    // Don't show already selected categories
                    if (!selectedCategories.find(cat => cat.value === option.value)) {
                      if (!groups[option.group]) {
                        groups[option.group] = [];
                      }
                      groups[option.group].push(option);
                    }
                  });
                  return Object.entries(groups).map(([group, options]) => ({
                    label: group,
                    options: options
                  }));
                })()}
                styles={customSelectStyles}
                isSearchable={false}
                isClearable={false}
                placeholder="Choose a category"
                formatOptionLabel={option => (
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label={option.label}>
                      {option.icon}
                    </span>
                    <span className="flex-1">{option.label}</span>
                  </div>
                )}
              />
            )}
            
            {selectedCategories.length >= 1 && (
              <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg text-blue-200 text-sm text-center">
                Category selected
              </div>
            )}
          </div>
        </form>
      </div>
      {/* Fixed Save Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center p-6 z-10">
        <button
          type="button"
          disabled={saving}
          onClick={() => formRef.current?.requestSubmit()}
          className="w-full max-w-2xl py-4 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.02] hover:from-blue-500 hover:to-purple-500 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <i className="fas fa-spinner animate-spin"></i>
              Saving Changes...
            </>
          ) : (
            <>
              Save Changes
              <i className="fas fa-save group-hover:scale-110 transition-transform"></i>
            </>
          )}
        </button>
      </div>
    </div>
  );
}