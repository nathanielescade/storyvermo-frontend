"use client";

import { useState } from 'react';
import { NEXT_PUBLIC_API_URL } from '../../../lib/api';

const EmailVerifyModal = ({ isOpen, onClose, email = '', onVerified }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [resendMessage, setResendMessage] = useState(null);

  if (!isOpen) return null;

  const verify = async () => {
    if (!token || token.trim().length === 0) {
      setMessage({ type: 'error', text: 'Please enter the verification code.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const base = NEXT_PUBLIC_API_URL || '';
      const resp = await fetch(`${base}/auth/verify-email/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), email: email || undefined })
      });

      const data = await resp.json();
      if (resp.ok && data && data.success) {
        setMessage({ type: 'success', text: data.message || 'Email verified successfully.' });
        if (onVerified) onVerified(data);
      } else {
        setMessage({ type: 'error', text: data.message || data.detail || 'Verification failed' });
      }
    } catch (err) {
      console.error('Verify request failed', err);
      setMessage({ type: 'error', text: err.message || 'Verification request failed' });
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    // Use provided email prop or ask user to supply one via the input (email may be empty)
    const targetEmail = email && String(email).trim();
    if (!targetEmail) {
      setResendMessage({ type: 'error', text: 'Email address not available to resend. Please use the verify page.' });
      return;
    }

    setResendLoading(true);
    setResendMessage(null);
    try {
      const base = NEXT_PUBLIC_API_URL || '';
      const resp = await fetch(`${base}/auth/resend-verification/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 429) {
        setResendMessage({ type: 'error', text: data.message || 'Please wait before requesting another verification email.' });
      } else if (resp.ok) {
        setResendMessage({ type: 'success', text: data.message || 'If an account exists, a verification email has been sent.' });
      } else {
        setResendMessage({ type: 'error', text: data.message || data.detail || 'Failed to resend verification email.' });
      }
    } catch (err) {
      console.error('Resend request failed', err);
      setResendMessage({ type: 'error', text: err.message || 'Resend request failed' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleClose = () => {
    setToken('');
    setMessage(null);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
  <div className="w-full max-w-md bg-linear-to-br from-gray-900 to-black rounded-2xl border border-cyan-500/20 p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Verify your email</h3>
            <p className="text-sm text-gray-400">We sent a verification code to <strong className="text-white">{email}</strong>. Enter it below to verify your account.</p>
          </div>
          <button onClick={handleClose} className="text-gray-300 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm text-gray-300">Verification code</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter code"
            className="w-full rounded-xl p-3 bg-slate-900 border border-gray-700 text-white focus:outline-none"
          />

          {message && (
            <div className={`p-3 rounded ${message.type === 'error' ? 'bg-red-500/20 border border-red-500/40 text-red-200' : 'bg-green-500/20 border border-green-500/40 text-green-200'}`}>
              {message.text}
            </div>
          )}

          {resendMessage && (
            <div className={`p-3 rounded ${resendMessage.type === 'error' ? 'bg-red-500/20 border border-red-500/40 text-red-200' : 'bg-green-500/20 border border-green-500/40 text-green-200'}`}>
              {resendMessage.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button onClick={handleClose} className="px-4 py-2 rounded-xl bg-gray-800/60 text-white">Close</button>
            <div className="flex gap-3">
              <button onClick={resend} disabled={resendLoading} className="px-4 py-2 rounded-xl bg-gray-800/60 text-white">
                {resendLoading ? 'Resending...' : 'Resend email'}
              </button>
              <button onClick={verify} disabled={loading} className="px-4 py-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 text-white">
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerifyModal;
