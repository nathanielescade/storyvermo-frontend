'use client';

import { Suspense } from 'react';
import VerifyPaymentClient from './VerifyPaymentClient';

export default function VerifyPaymentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
              <div className="mb-6">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
              <p className="text-slate-300">Please wait while we verify your payment...</p>
            </div>
          </div>
        }
      >
        <VerifyPaymentClient />
      </Suspense>
    </div>
  );
}
