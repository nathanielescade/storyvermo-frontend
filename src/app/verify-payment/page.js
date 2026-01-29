'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PAYMENTS_API } from '@/lib/api';

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference');
        
        if (!reference) {
          setStatus('error');
          setMessage('No payment reference found. Payment may have been cancelled.');
          return;
        }

        // Call backend verify endpoint
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/verify/?reference=${reference}`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          setStatus('success');
          setMessage(`Payment successful! You now have access to the ${data.plan} plan.`);
          setPaymentDetails(data);
          
          // Redirect to account page after 3 seconds
          setTimeout(() => {
            router.push('/settings/profile');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Payment verification failed. Please contact support.');
          setPaymentDetails(data);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('An error occurred while verifying your payment. Please try again or contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
            <div className="mb-6">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verifying Payment</h2>
            <p className="text-slate-300">{message}</p>
            <p className="text-slate-400 text-sm mt-4">Please don't close this page...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-slate-800 rounded-lg border-2 border-green-500 p-8 text-center">
            <div className="mb-6">
              <div className="inline-block bg-green-500 rounded-full p-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful! 🎉</h2>
            <p className="text-green-400 mb-4">{message}</p>
            
            {paymentDetails && (
              <div className="bg-slate-700 rounded p-4 mb-6 text-left">
                <p className="text-slate-300 text-sm">
                  <span className="font-semibold">Plan:</span> {paymentDetails.plan}
                </p>
                <p className="text-slate-300 text-sm">
                  <span className="font-semibold">Billing:</span> {paymentDetails.billingCycle}
                </p>
                {paymentDetails.nextBillingDate && (
                  <p className="text-slate-300 text-sm">
                    <span className="font-semibold">Next Billing:</span> {paymentDetails.nextBillingDate}
                  </p>
                )}
              </div>
            )}

            <p className="text-slate-400 text-sm mb-6">Redirecting to your account in 3 seconds...</p>
            
            <Link href="/settings/profile">
              <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition duration-200">
                Go to Account
              </button>
            </Link>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-slate-800 rounded-lg border-2 border-red-500 p-8 text-center">
            <div className="mb-6">
              <div className="inline-block bg-red-500 rounded-full p-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-red-400 mb-4">{message}</p>
            
            {paymentDetails?.details && (
              <div className="bg-slate-700 rounded p-4 mb-6 text-left">
                <p className="text-slate-300 text-sm font-mono break-words">
                  {paymentDetails.details}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Link href="/pricing">
                <button className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-lg transition duration-200">
                  Try Again
                </button>
              </Link>
              <Link href="/contact">
                <button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition duration-200">
                  Contact Support
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
