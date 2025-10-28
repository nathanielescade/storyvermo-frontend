'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) => {
  const { login, refreshAuth, register: registerUser } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    password_confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const router = useRouter();
  const formRef = useRef(null);

  // Reset form when switching modes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: '',
        password_confirm: ''
      });
      setErrors({});
      setSuccessMessage('');
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
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!isLoginMode) {
      if (!formData.first_name.trim()) {
        newErrors.first_name = 'First name is required';
      }
      
      if (!formData.last_name.trim()) {
        newErrors.last_name = 'Last name is required';
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (isLoginMode) {
        console.log('Submitting login form with data:', formData);
        const result = await login(formData);
        console.log('Login result:', result);

        if (result && result.success) {
          console.log('Login successful, closing modal');
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
        console.log('Submitting registration form with data:', formData);
        // Call register from AuthContext which wraps authApi.register
        const registerResult = await registerUser(formData);
        console.log('Registration result:', registerResult);

        if (registerResult && registerResult.success) {
          // Try to auto-login the user after a successful registration
          const attemptedCreds = {
            username: formData.username || formData.email || '',
            password: formData.password || ''
          };

          try {
            // Attempt login with the credentials the user just entered
            const autoLoginResult = await login(attemptedCreds);

            if (autoLoginResult && autoLoginResult.success) {
              // Auto-login worked — close modal and fire success callback
              console.log('Auto-login after registration successful');
              onClose();
              if (onAuthSuccess) onAuthSuccess();
              return;
            }
          } catch (e) {
            console.warn('Auto-login after registration failed', e);
          }

          // If auto-login didn't work, show the friendly success message and switch to login mode
          setIsLoginMode(true);
          setFormData({
            first_name: '',
            last_name: '',
            email: attemptedCreds.username && attemptedCreds.username.includes('@') ? attemptedCreds.username : '',
            username: attemptedCreds.username && !attemptedCreds.username.includes('@') ? attemptedCreds.username : '',
            password: '',
            password_confirm: ''
          });
          setErrors({});
          setSuccessMessage('Registration successful. Please log in.');
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
      console.error('Authentication error:', error);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[500] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-neon-blue/30 rounded-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-transparent bg-gradient-to-r from-transparent via-blue-900/30 to-transparent">
          <div className="flex justify-between items-center">
            <h2 id="authModalTitle" className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-orbitron">
              {isLoginMode ? 'LOGIN TO STORYVERM' : 'SIGN UP FOR STORYVERM'}
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
            {/* Signup fields (hidden by default) */}
            {!isLoginMode && (
              <div id="signupFields">
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
                
                <div>
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
              </div>
            )}
            
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
            
            {/* Confirm password field (hidden by default) */}
            {!isLoginMode && (
                <div id="confirmPasswordField">
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
            )}
            
            <button
              type="submit"
              id="authSubmitBtn"
              className="w-full py-4 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.02] hover:from-blue-500 hover:to-purple-500 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-3 group"
              disabled={loading}
            >
              <span id="authSubmitText">
                {loading ? 'PROCESSING...' : (isLoginMode ? 'LOGIN' : 'SIGN UP')}
              </span>
              {!loading && (
                <i id="authSubmitIcon" className="fas fa-arrow-right text-white group-hover:translate-x-1 transition-transform"></i>
              )}
              {loading && (
                <i id="authSpinner" className="fas fa-spinner animate-spin text-white"></i>
              )}
            </button>
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