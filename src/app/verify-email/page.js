import React, { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6">Loading…</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
