'use client';

import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from 'next/navigation';

export default function EmailVerificationBanner() {
  const { user, emailVerified } = useAuth();
  const router = useRouter();

  if (!user || emailVerified) return null;

  return (
    <div className="bg-yellow-500/20 border-b border-yellow-500/50 py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-yellow-400"></i>
          <span className="text-yellow-200">
            Please verify your email address to access all features
          </span>
        </div>
        <button
          onClick={() => router.push('/verify-email')}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors font-medium"
        >
          Verify Now
        </button>
      </div>
    </div>
  );
}