'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { authApi } from '../../../lib/api';

// Separate component that uses useSearchParams
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userIdForVerification, verifyEmail, resendVerificationCode, refreshAuth } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    // Redirect if not logged in and no user ID for verification
    if (!user && !userIdForVerification) {
      router.push('/');
      return;
    }

    // Redirect if already verified
    if (user && user.email_verified) {
      router.push('/');
    }
  }, [user, userIdForVerification, router]);

  const handleInputChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && value && newCode.every(digit => digit)) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = pastedData.split('');
    while (newCode.length < 6) newCode.push('');
    
    setCode(newCode);

    // Focus last filled input or submit if complete
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    } else {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleVerify = async (codeString = null) => {
    const verificationCode = codeString || code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get user ID from context or localStorage (client-side only)
      const userId = user?.id || userIdForVerification || 
        (typeof window !== 'undefined' ? localStorage.getItem('userIdForVerification') : null);
      
      if (!userId) {
        setError('User information not found. Please try registering again.');
        return;
      }
      
      const response = await verifyEmail({
        user_id: userId,
        token: verificationCode
      });
      
      if (response.success) {
        setSuccess(true);
        await refreshAuth(); // Update user context
        
        setTimeout(() => {
          const redirect = searchParams.get('redirect') || '/';
          router.push(redirect);
        }, 2000);
      } else {
        setError(response.error || 'Invalid verification code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage('');
    setError('');

    try {
      // Get user ID from context or localStorage (client-side only)
      const userId = user?.id || userIdForVerification || 
        (typeof window !== 'undefined' ? localStorage.getItem('userIdForVerification') : null);
      
      if (!userId) {
        setError('User information not found. Please try registering again.');
        return;
      }
      
      const response = await resendVerificationCode({
        user_id: userId
      });
      
      if (response.success) {
        setResendMessage('✓ New verification code sent to your email');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(response.error || 'Failed to resend code. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // If we don't have user info but have a user ID in localStorage, try to use that
  const displayEmail = user?.email || 'your email address';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-gradient-to-br from-gray-800 to-black border border-blue-500/30 rounded-2xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <i className="fas fa-envelope text-white text-3xl"></i>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Verify Your Email
          </h1>
          
          <p className="text-gray-400 text-center mb-8">
            We&apos;ve sent a 6-digit code to<br />
            <span className="text-blue-400 font-medium">{displayEmail}</span>
          </p>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-green-300">
                <i className="fas fa-check-circle"></i>
                <span>Email verified successfully! Redirecting...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-red-300">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Resend Message */}
          {resendMessage && (
            <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-300">
                <i className="fas fa-info-circle"></i>
                <span>{resendMessage}</span>
              </div>
            </div>
          )}

          {/* Code Input */}
          <div className="flex justify-center gap-3 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={loading || success}
                className="w-14 h-14 text-center text-2xl font-bold bg-gray-900 border-2 border-blue-500/50 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || success || code.some(d => !d)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner animate-spin"></i>
                <span>Verifying...</span>
              </>
            ) : success ? (
              <>
                <i className="fas fa-check"></i>
                <span>Verified!</span>
              </>
            ) : (
              <>
                <span>Verify Email</span>
                <i className="fas fa-arrow-right"></i>
              </>
            )}
          </button>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 mb-2">Didn&apos;t receive the code?</p>
            <button
              onClick={handleResend}
              disabled={resendLoading || success}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-500 text-sm text-center">
              <i className="fas fa-info-circle mr-1"></i>
              The code expires in 10 minutes
            </p>
          </div>
        </div>

        {/* Skip Link (Optional - for testing) */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}