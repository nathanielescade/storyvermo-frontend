'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import Select from 'react-select';
import ReactCountryFlag from 'react-country-flag';
import { Country, City } from 'country-state-city';

const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) => {
  const { login, register: registerUser } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    account_type: 'personal',
    brand_name: '',
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    country: '',
    city: '',
    gender: '',
    bio: '',
    preferred_categories: []
  });
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);

  // Content creation categories grouped by type
  // 22 COMPREHENSIVE CATEGORIES (Added Photography & Automotive)
  const categoryOptions = [
    // CORE & ENTERTAINMENT
    { value: 'lifestyle', label: 'Lifestyle', icon: '🏠' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
    { value: 'creativity', label: 'Creativity & Arts', icon: '🎨' },
    { value: 'humor', label: 'Humor & Memes', icon: '😂' },
    
    // NEWS & INFORMATION
    { value: 'news', label: 'News & Journalism', icon: '📰' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'science', label: 'Science', icon: '🔬' },
    
    // BUSINESS & COMMERCE
    { value: 'business', label: 'Business & Sales', icon: '💰' },
    { value: 'entrepreneurship', label: 'Entrepreneurship', icon: '🚀' },
    
    // FARMING & AGRICULTURE
    { value: 'agriculture', label: 'Agriculture & Farming', icon: '🚜' },
    
    // HOBBIES & INTERESTS
    { value: 'gaming', label: 'Gaming', icon: '🎮' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'music', label: 'Music', icon: '🎵' },
    
    // DAILY LIFE & SHOPPING
    { value: 'fashion', label: 'Fashion & Shopping', icon: '🛍️' },
    { value: 'food', label: 'Food & Cooking', icon: '🍳' },
    { value: 'travel', label: 'Travel', icon: '✈️' },
    { value: 'fitness', label: 'Fitness & Health', icon: '💪' },
    
    // TECHNOLOGY & AUTOMOTIVE
    { value: 'technology', label: 'Technology', icon: '💻' },
    { value: 'automotive', label: 'Automotive & Cars', icon: '🚗' }, // Added!
    
    // CREATIVE SPECIALTIES
    { value: 'photography', label: 'Photography', icon: '📸' }, // Added!
    
    // COMMUNITY
    { value: 'community', label: 'Community', icon: '👥' },
    
    // SPECIAL INTERESTS
    { value: 'animals', label: 'Animals & Pets', icon: '🐶' },
    { value: 'nature', label: 'Nature & Outdoors', icon: '🌳' },
  ];
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [signupStep, setSignupStep] = useState(1); // 1 = basic info, 2 = profile details
  
  const router = useRouter();
  const formRef = useRef(null);

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
    })
  };

  // Format country options
  const countryOptions = Country.getAllCountries().map(country => ({
    value: country.isoCode,
    label: country.name,
    flag: country.isoCode
  }));

  // Gender options
  const genderOptions = [
    { value: 'male', label: 'Male', icon: '👨' },
    { value: 'female', label: 'Female', icon: '👩' },
    { value: 'non_binary', label: 'Non-binary', icon: '🧑' },
    { value: 'other', label: 'Other', icon: '💫' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' }
  ];

  // Handle country change
  const handleCountryChange = (selectedOption) => {
    setSelectedCountry(selectedOption);
    setSelectedCity(null);
    setFormData(prev => ({
      ...prev,
      country: selectedOption?.value || '',
      city: ''
    }));
    
    if (selectedOption) {
      const cities = City.getCitiesOfCountry(selectedOption.value) || [];
      setAvailableCities(cities.map(city => ({
        value: city.name,
        label: city.name
      })));
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
  const handleCategoriesChange = (selectedOptions) => {
    setSelectedCategories(selectedOptions || []);
    setFormData(prev => ({
      ...prev,
      preferred_categories: selectedOptions ? selectedOptions.map(opt => opt.value) : []
    }));
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        account_type: 'personal',
        brand_name: '',
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: '',
        password_confirm: '',
        country: '',
        city: '',
        gender: '',
        bio: '',
        preferred_categories: []
      });
      setSelectedCountry(null);
      setSelectedCity(null);
      setSelectedGender(null);
      setSelectedCategories([]);
      setAvailableCities([]);
      setErrors({});
      setSuccessMessage('');
      setSignupStep(1);
      // honor an initialMode prop so pages can open the modal in signup mode
      setIsLoginMode(initialMode === 'login');
    }
  }, [isOpen, initialMode]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
    // Clear success message when user starts editing after a registration
    if (successMessage) setSuccessMessage('');
  };

  // Toggle between login and signup modes
  const toggleAuthMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrors({});
    // reset password visibility when switching
    setShowPassword(false);
    setShowConfirmPassword(false);
    // Clear any success message when switching modes
    setSuccessMessage('');
    setSignupStep(1);
  };

  // Validate step 1 fields (basic account info)
  const validateStep1 = () => {
    const newErrors = {};

    if (formData.account_type === 'brand') {
      if (!formData.brand_name || !String(formData.brand_name).trim()) newErrors.brand_name = 'Brand name is required';
    } else {
      if (!formData.first_name || !String(formData.first_name).trim()) newErrors.first_name = 'First name is required';
      if (!formData.last_name || !String(formData.last_name).trim()) newErrors.last_name = 'Last name is required';
    }

    if (!formData.email || !String(formData.email).trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.username || !String(formData.username).trim()) newErrors.username = 'Username is required';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (formData.password !== formData.password_confirm) newErrors.password_confirm = 'Passwords do not match';

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!isLoginMode) {
      if (formData.account_type === 'brand') {
        if (!formData.brand_name.trim()) {
          newErrors.brand_name = 'Brand name is required';
        }
      } else {
        if (!formData.first_name.trim()) {
          newErrors.first_name = 'First name is required';
        }
        
        if (!formData.last_name.trim()) {
          newErrors.last_name = 'Last name is required';
        }
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!isLoginMode && formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper: normalize and map API error payloads to the `errors` state used by the component
  const parseApiErrors = (payload) => {
    // payload may be Error, object, or have a .details/.raw property
    const source = payload && payload.details ? payload.details : (payload && payload.raw ? payload.raw : payload);
    // If it's an Error with message string, show general
    if (typeof source === 'string') {
      setErrors({ general: source });
      return;
    }

    if (!source) {
      setErrors({ general: 'Authentication failed' });
      return;
    }

    // If DRF-style { detail: '...' }
    if (typeof source.detail === 'string') {
      setErrors({ general: source.detail });
      return;
    }

    // If top-level message or error string
    if (typeof source.error === 'string') {
      setErrors({ general: source.error });
      return;
    }

    if (typeof source.message === 'string') {
      setErrors({ general: source.message });
      return;
    }

    // If object mapping field -> messages
    if (typeof source === 'object') {
      const newErrors = {};
      for (const [key, val] of Object.entries(source)) {
        // normalize common backend keys
        let mappedKey = key;
        if (key === 'first_name') mappedKey = 'first_name';
        if (key === 'last_name') mappedKey = 'last_name';
        if (key === 'password_confirm' || key === 'password2' || key === 'password_confirm1') mappedKey = 'password_confirm';
        if (key === 'non_field_errors' || key === '__all__') {
          newErrors.general = Array.isArray(val) ? val.join(', ') : String(val);
          continue;
        }

        // val may be array or string or object
        if (Array.isArray(val)) newErrors[mappedKey] = val.join(', ');
        else if (typeof val === 'object') newErrors[mappedKey] = JSON.stringify(val);
        else newErrors[mappedKey] = String(val);
      }

      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    setErrors({ general: 'Authentication failed' });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If signing up, first step should validate and advance without submitting
    if (!isLoginMode) {
      if (signupStep === 1) {
        const ok = validateStep1();
        if (!ok) return;
        setSignupStep(2);
        // scroll to top of modal content for step 2
        if (formRef && formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // when on step 2, perform full validation (reuse the existing validateForm which checks password length etc.)
      if (!validateForm()) return;
    } else {
      // login mode
      if (!validateForm()) {
        return;
      }
    }
    
    setLoading(true);
    
    try {
      if (isLoginMode) {
        const result = await login(formData);

        if (result && result.success) {
          onClose();
          if (onAuthSuccess) onAuthSuccess();
          return;
        }

        // Prefer structured errors returned by the auth context
        if (result && result.errors && Object.keys(result.errors).length > 0) {
          // AuthContext returns errors keyed by field or `general`
          setErrors(prev => ({ ...prev, ...result.errors }));
        } else if (result && result.raw) {
          // If raw is an axios-like error with response.data, prefer that
          const raw = result.raw;
          if (raw && raw.response && raw.response.data) {
            parseApiErrors(raw.response.data);
          } else {
            parseApiErrors(raw);
          }
        } else {
          setErrors({ general: result.error || 'Login failed. Please check your credentials.' });
        }
      } else {
        // Call register from AuthContext which wraps authApi.register
        const registerResult = await registerUser(formData);

        if (registerResult && registerResult.success) {
          // Registration succeeded. If the auth context returned a user (auto-login),
          // close the modal and trigger the global onAuthSuccess flow which will
          // open onboarding -> follow suggestions. If not auto-logged-in, fall
          // back to showing the success message and switching to login mode.
          if (registerResult.user) {
            // notify parent/global shell that auth succeeded and we want follow suggestions
            try {
              onClose();
              if (onAuthSuccess) onAuthSuccess({ showFollowSuggestions: true, categories: formData.preferred_categories || [] });
            } catch (e) {
            }
            return;
          }

          // Not auto-logged-in: show success text and switch to login so user can sign in
          setSuccessMessage('Registration successful! You can now log in with your credentials.');
          setIsLoginMode(true);
          setFormData(prev => ({ ...prev, password: '', password_confirm: '' }));
          return;
        }

        // Handle registration errors
        if (registerResult && registerResult.errors && Object.keys(registerResult.errors).length > 0) {
          setErrors(prev => ({ ...prev, ...registerResult.errors }));
        } else if (registerResult && registerResult.raw) {
          const raw = registerResult.raw;
          if (raw && raw.response && raw.response.data) {
            parseApiErrors(raw.response.data);
          } else {
            parseApiErrors(raw);
          }
        } else {
          setErrors({ general: registerResult.error || 'Registration failed' });
        }
      }
    } catch (error) {
      // If axios-like error, prefer response.data
      if (error && error.response && error.response.data) {
        parseApiErrors(error.response.data);
      } else if (error && error.message) {
        setErrors({ general: String(error.message) });
      } else {
        parseApiErrors(error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[10300] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-neon-blue/30 rounded-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-transparent bg-gradient-to-r from-transparent via-blue-900/30 to-transparent">
          <div className="flex justify-between items-center">
            <h2 id="authModalTitle" className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-orbitron">
              {isLoginMode ? 'LOGIN TO STORYVERMO' : 'SIGN UP FOR STORYVERMO'}
            </h2>
            <button 
              id="closeAuthModal"
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex items-center justify-center transition-all hover:from-blue-700/50 hover:to-purple-700/50 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-500/20"
              onClick={onClose}
            >
              <i className="fas fa-times text-white text-xl"></i>
            </button>
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {errors.general}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">
              {successMessage}
            </div>
          )}
          
          <form id="authForm" ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
            {/* Signup fields (hidden by default) split into two steps */}
            {!isLoginMode && (
              <div id="signupFields">
                <div className="mb-4 text-sm text-gray-400">Step {signupStep} of 2</div>

                {/* Account Type Selection (always visible on step 1) */}
                {signupStep === 1 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Account Type</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                          formData.account_type === 'personal'
                            ? 'bg-blue-600/20 border-2 border-blue-500'
                            : 'bg-gray-800/50 border border-blue-900/30 hover:bg-blue-900/20'
                        }`}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            account_type: 'personal',
                            brand_name: ''
                          }));
                        }}
                      >
                        <i className="fas fa-user text-2xl mb-2 text-blue-400"></i>
                        <span className="text-sm font-medium text-white">Personal Account</span>
                      </button>
                      <button
                        type="button"
                        className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                          formData.account_type === 'brand'
                            ? 'bg-blue-600/20 border-2 border-blue-500'
                            : 'bg-gray-800/50 border border-blue-900/30 hover:bg-blue-900/20'
                        }`}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            account_type: 'brand',
                            first_name: '',
                            last_name: ''
                          }));
                        }}
                      >
                        <i className="fas fa-building text-2xl mb-2 text-blue-400"></i>
                        <span className="text-sm font-medium text-white">Brand Account</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 1: basic account info */}
                {signupStep === 1 && (
                  <>
                    {formData.account_type === 'personal' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {errors.first_name && (
                            <div id="firstNameError" className="mb-2 text-red-400 text-xs font-semibold">
                              {errors.first_name}
                            </div>
                          )}
                          <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">First Name</label>
                          <input
                            type="text"
                            name="first_name"
                            id="firstNameInput"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          {errors.last_name && (
                            <div id="lastNameError" className="mb-2 text-red-400 text-xs font-semibold">
                              {errors.last_name}
                            </div>
                          )}
                          <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Last Name</label>
                          <input
                            type="text"
                            name="last_name"
                            id="lastNameInput"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        {errors.brand_name && (
                          <div id="brandNameError" className="mb-2 text-red-400 text-xs font-semibold">
                            {errors.brand_name}
                          </div>
                        )}
                        <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Brand Name</label>
                        <input
                          type="text"
                          name="brand_name"
                          id="brandNameInput"
                          value={formData.brand_name}
                          onChange={handleChange}
                          className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          placeholder="Enter your brand, business, or organization name"
                        />
                      </div>
                    )}

                    <div className="mt-2">
                      {errors.email && (
                        <div id="emailError" className="mb-2 text-red-400 text-xs font-semibold">
                          {errors.email}
                        </div>
                      )}
                      <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        id="emailInput"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    {/* Gender Select - Only for personal accounts */}
                    {formData.account_type === 'personal' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Gender (Optional)</label>
                        <Select
                          value={selectedGender}
                          onChange={handleGenderChange}
                          options={genderOptions}
                          styles={customSelectStyles}
                          isClearable
                          placeholder="Select your gender"
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

                    <div className="mt-4">
                      {errors.username && (
                        <div id="usernameError" className="mb-2 text-red-400 text-xs font-semibold">
                          {errors.username}
                        </div>
                      )}
                      <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Username</label>
                      <input
                        type="text"
                        name="username"
                        id="usernameInput"
                        value={formData.username}
                        onChange={handleChange}
                        autoComplete="username"
                        className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        placeholder="username"
                      />
                    </div>

                    <div className="mt-4">
                      {errors.password && (
                        <div id="passwordError" className="mb-2 text-red-400 text-xs font-semibold">
                          {errors.password}
                        </div>
                      )}
                      <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          id="passwordInput"
                          value={formData.password}
                          onChange={handleChange}
                          autoComplete={isLoginMode ? "current-password" : "new-password"}
                          className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          placeholder="•••••••••"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                          onClick={() => setShowPassword(prev => !prev)}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Confirm password field (step1) */}
                    <div className="mt-4">
                      {errors.password_confirm && (
                        <div id="passwordConfirmError" className="mb-2 text-red-400 text-xs font-semibold">
                          {errors.password_confirm}
                        </div>
                      )}
                      <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="password_confirm"
                          id="passwordConfirmInput"
                          value={formData.password_confirm}
                          onChange={handleChange}
                          autoComplete="new-password"
                          className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          placeholder="•••••••••"
                        />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                          onClick={() => setShowConfirmPassword(prev => !prev)}
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 2: profile details (bio, categories, country, city) */}
                {signupStep === 2 && (
                  <>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-blue-300 mb-2">Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="About you (optional)"
                        className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                        rows={3}
                        maxLength={500}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-blue-300 mb-2">Categories</label>
                      <Select
                        value={selectedCategories}
                        onChange={handleCategoriesChange}
                        options={(() => {
                          const groups = {};
                          categoryOptions.forEach(option => {
                            if (!groups[option.group]) {
                              groups[option.group] = [];
                            }
                            groups[option.group].push(option);
                          });
                          return Object.entries(groups).map(([group, options]) => ({
                            label: group,
                            options: options
                          }));
                        })()}
                        styles={customSelectStyles}
                        isMulti
                        isClearable
                        placeholder="Categories (max 3, optional)"
                        isOptionDisabled={() => selectedCategories.length >= 3}
                        formatOptionLabel={option => (
                          <div className="flex items-center gap-2">
                            <span className="text-xl" role="img" aria-label={option.label}>
                              {option.icon}
                            </span>
                            <span className="flex-1">{option.label}</span>
                          </div>
                        )}
                        noOptionsMessage={() => "No matching categories found"}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-blue-300 mb-2">Country</label>
                      <Select
                        value={selectedCountry}
                        onChange={handleCountryChange}
                        options={countryOptions}
                        styles={customSelectStyles}
                        isClearable
                        placeholder="Country (optional)"
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

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-blue-300 mb-2">City</label>
                      <Select
                        value={selectedCity}
                        onChange={handleCityChange}
                        options={availableCities}
                        styles={customSelectStyles}
                        isClearable
                        isDisabled={!selectedCountry}
                        placeholder={selectedCountry ? "City (optional)" : "Select country first"}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Username / Password fields are rendered for login OR signup-step-1.
                For signup we render them inside the Step 1 block above; for login we
                need to render them here so the login form shows the fields. */}
            {isLoginMode && (
              <>
                <div>
                  {errors.username && (
                    <div id="usernameError" className="mb-2 text-red-400 text-xs font-semibold">
                      {errors.username}
                    </div>
                  )}
                  <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    id="usernameInput"
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="username"
                    className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    placeholder="username"
                  />
                </div>

                <div>
                  {errors.password && (
                    <div id="passwordError" className="mb-2 text-red-400 text-xs font-semibold">
                      {errors.password}
                    </div>
                  )}
                  <label className="block text-sm font-medium text-blue-300 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      id="passwordInput"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete={isLoginMode ? "current-password" : "new-password"}
                      className="w-full bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      placeholder="•••••••••"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                      onClick={() => setShowPassword(prev => !prev)}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex gap-3">
              {/* If we're signing up and on step 2, show a previous button */}
              {!isLoginMode && signupStep === 2 && (
                <button
                  type="button"
                  onClick={() => setSignupStep(1)}
                  className="flex-1 py-3 rounded-xl bg-gray-800/60 text-white font-medium transition-all hover:bg-gray-700/60"
                >
                  Previous
                </button>
              )}

              <button
                type="submit"
                id="authSubmitBtn"
                className="flex-1 py-4 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.02] hover:from-blue-500 hover:to-purple-500 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-3 group"
                disabled={loading}
              >
                <span id="authSubmitText">
                  {loading ? 'PROCESSING...' : (isLoginMode ? 'LOGIN' : (signupStep === 1 ? 'NEXT' : 'SIGN UP'))}
                </span>
                {!loading && (
                  <i id="authSubmitIcon" className="fas fa-arrow-right text-white group-hover:translate-x-1 transition-transform"></i>
                )}
                {loading && (
                  <i id="authSpinner" className="fas fa-spinner animate-spin text-white"></i>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              <span id="authToggleText">
                {isLoginMode ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button
                type="button"
                id="authToggleBtn"
                className="ml-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                onClick={toggleAuthMode}
              >
                {isLoginMode ? 'Sign up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
      </div>
    </div>
  );
};

export default AuthModal;