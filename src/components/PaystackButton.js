'use client';

import { useState, useEffect } from 'react';
import { PAYMENTS_API } from '../../lib/api';

export default function PaystackButton({ 
  planType = 'monthly',
  className = ''
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  // Fetch current user and CSRF token on mount
  useEffect(() => {
    const fetchUserAndCsrf = async () => {
      try {
        // Get CSRF token
        const csrfResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/get-csrf-token/`, {
          credentials: 'include',
        });
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          setCsrfToken(csrfData.csrfToken || csrfData.csrf_token);
        }

        // Get current user - try both endpoint formats
        let userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile/`, {
          credentials: 'include',
        });
        
        // If that doesn't work, try the auth check endpoint
        if (!userResponse.ok) {
          userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check/`, {
            credentials: 'include',
          });
        }
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User data:', userData);
          
          // Handle different response structures
          if (userData.user) {
            setUser(userData.user);
          } else if (userData.id || userData.email) {
            setUser(userData);
          } else {
            console.warn('Unexpected user data structure:', userData);
            setUser(null);
          }
        } else {
          console.log('User fetch failed with status:', userResponse.status);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to fetch user or CSRF:', err);
        setUser(null);
      } finally {
        setIsChecking(false);
      }
    };

    fetchUserAndCsrf();
  }, []);

  const handlePayment = async () => {
    if (!user) {
      setError('Please log in to upgrade your plan');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const amount = planType === 'monthly' ? 24900 : 249000; // GH₵ 249 or GH₵ 2,490 in pesewas
      const userId = user.id || user.pk || user.user_id;
      const userEmail = user.email || user.user_email;
      
      if (!userId || !userEmail) {
        throw new Error('Missing user ID or email');
      }

      const reference = `${userId}-${planType}-${Date.now()}`;

      const headers = {
        'Content-Type': 'application/json',
      };

      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      // Call backend to initialize payment
      const response = await fetch(PAYMENTS_API.INITIALIZE, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          email: userEmail,
          userId: userId,
          amount,
          planType,
          reference,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Payment initialization failed (${response.status})`);
      }

      const data = await response.json();
      
      // Redirect to Paystack authorization URL
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setError('No authorization URL received from payment provider');
      }
    } catch (err) {
      setError(err.message || 'Payment initialization failed');
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div>
        <button
          disabled
          className={className + ' opacity-50 cursor-not-allowed'}
        >
          Loading...
        </button>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div>
        <button
          disabled
          className={className + ' opacity-50 cursor-not-allowed'}
        >
          Log in to Upgrade
        </button>
        <p className="text-yellow-400 text-sm mt-2">Please log in to access Creator plan</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading}
        className={className}
      >
        {loading ? 'Processing...' : planType === 'monthly' ? 'Pay Monthly (GH₵ 249)' : 'Pay Yearly (GH₵ 2,490)'}
      </button>
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
