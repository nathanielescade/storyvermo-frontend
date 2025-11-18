"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../lib/api';

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('pending'); // pending, success, error
  const [message, setMessage] = useState('Verifying...');
  const [emailInput, setEmailInput] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. You can request a verification email below.');
      return;
    }

    const verify = async () => {
      try {
        const data = await apiRequest('/auth/verify-email/', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (data && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully. You can now log in.');
        } else {
          setStatus('error');
          setMessage(data?.message || 'Verification failed');
        }
      } catch (err) {
        console.error('Verify request failed', err);
        setStatus('error');
        setMessage(err.message || 'Verification request failed');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 to-black p-6">
      <div className="max-w-xl w-full bg-linear-to-br from-gray-800 to-slate-900 rounded-2xl p-8 shadow-2xl border border-cyan-500/20">
        <h1 className="text-2xl font-bold text-white mb-4">Email verification</h1>
        <p className={`mb-6 ${status === 'success' ? 'text-green-300' : 'text-red-300'}`}>{message}</p>

        {status === 'error' && (
          <div className="mb-4">
            <p className="text-sm text-gray-300 mb-2">Did not receive an email? Request another verification email (we will not reveal whether the address exists).</p>
            <div className="flex gap-2">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full rounded-xl p-3 bg-slate-900 border border-gray-700 text-white focus:outline-none"
              />
              <button
                onClick={async () => {
                  const target = (emailInput || '').trim();
                  if (!target) {
                    setResendMessage({ type: 'error', text: 'Please enter an email address.' });
                    return;
                  }
                  setResendLoading(true);
                  setResendMessage(null);
                  try {
                    try {
                      const data = await apiRequest('/auth/resend-verification/', {
                        method: 'POST',
                        body: JSON.stringify({ email: target }),
                      });
                      setResendMessage({ type: 'success', text: data?.message || 'If an account exists, a verification email has been sent.' });
                    } catch (err) {
                      if (err && err.status === 429) {
                        setResendMessage({ type: 'error', text: err.body || 'Please wait before requesting another verification email.' });
                      } else {
                        const text = (err && err.body) ? err.body : (err && err.message) ? err.message : 'Failed to resend verification email.';
                        setResendMessage({ type: 'error', text });
                      }
                    }
                  } catch (err) {
                    console.error('Resend failed', err);
                    setResendMessage({ type: 'error', text: err.message || 'Resend request failed' });
                  } finally {
                    setResendLoading(false);
                  }
                }}
                disabled={resendLoading}
                className="px-4 py-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 text-white"
              >
                {resendLoading ? 'Sending...' : 'Resend'}
              </button>
            </div>

            {resendMessage && (
              <div className={`mt-3 p-3 rounded ${resendMessage.type === 'error' ? 'bg-red-500/20 border border-red-500/40 text-red-200' : 'bg-green-500/20 border border-green-500/40 text-green-200'}`}>
                {resendMessage.text}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.push('/')} className="px-4 py-2 rounded-xl bg-gray-800/60 text-white">Home</button>
          <button onClick={() => router.push('/login')} className="px-4 py-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 text-white">Go to Login</button>
        </div>
      </div>
    </div>
  );
}
