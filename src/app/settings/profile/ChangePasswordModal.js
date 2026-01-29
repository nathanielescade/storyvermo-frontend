'use client';

import { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const { refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const toggleShowPassword = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError('Current password is required');
      return false;
    }
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    if (!formData.confirmPassword) {
      setError('Please confirm your new password');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Get CSRF token from backend
      const csrfResponse = await fetch(`${API_BASE_URL}/auth/get-csrf-token/`, {
        method: 'GET',
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
          new_password_confirm: formData.confirmPassword,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to change password';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.non_field_errors?.[0] || errorData.new_password?.[0] || errorData.current_password?.[0] || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();

      // Store new tokens from response IMMEDIATELY
      if (responseData.tokens) {
        localStorage.setItem('access_token', responseData.tokens.access);
        localStorage.setItem('refresh_token', responseData.tokens.refresh);
      }

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Refresh auth context to update the state (this will use the new tokens from localStorage)
      if (refreshAuth) {
        await refreshAuth();
      }

      // Close modal after 2.5 seconds to allow refreshAuth to complete
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        setSuccess(false);
      }, 2500);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl shadow-2xl bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Change Password</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-start gap-2">
            <i className="fas fa-exclamation-circle mt-0.5 flex-shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-300 text-sm flex items-start gap-2">
            <i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i>
            <span>Password changed successfully!</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter your current password"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => toggleShowPassword('current')}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <i className={`fas fa-eye${showPassword.current ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter your new password"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => toggleShowPassword('new')}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <i className={`fas fa-eye${showPassword.new ? '-slash' : ''}`}></i>
              </button>
            </div>
            {formData.newPassword && (
              <div className="mt-2 text-xs text-gray-400">
                {formData.newPassword.length >= 6 ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <i className="fas fa-check"></i> Password is strong enough
                  </span>
                ) : (
                  <span className="text-yellow-400 flex items-center gap-1">
                    <i className="fas fa-exclamation-triangle"></i> Minimum 6 characters required
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                placeholder="Confirm your new password"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => toggleShowPassword('confirm')}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <i className={`fas fa-eye${showPassword.confirm ? '-slash' : ''}`}></i>
              </button>
            </div>
            {formData.confirmPassword && (
              <div className="mt-2 text-xs">
                {formData.newPassword === formData.confirmPassword ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <i className="fas fa-check"></i> Passwords match
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <i className="fas fa-times"></i> Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  Changing...
                </>
              ) : (
                <>
                  <i className="fas fa-lock"></i>
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
