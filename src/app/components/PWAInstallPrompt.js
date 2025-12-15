"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isIos = () => {
      const ua = window.navigator.userAgent;
      return /iphone|ipad|ipod/i.test(ua);
    };
    const isInStandaloneMode = () => (
      window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    );

    const beforeHandler = (e) => {
      // Prevent immediate prompt
      e.preventDefault();
      setDeferredPrompt(e);
      // Show a nice custom prompt/banner
      setVisible(true);
    };

    const appInstalledHandler = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', beforeHandler);
    window.addEventListener('appinstalled', appInstalledHandler);

    // If already in standalone mode, don't show
    try {
      if (isInStandaloneMode()) {
        setInstalled(true);
      } else if (isIos()) {
        // iOS does not support beforeinstallprompt, show custom banner if not installed
        setTimeout(() => {
          setVisible(true);
        }, 1000);
      }
    } catch (e) {
      // ignore
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  if (!visible || installed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // hide banner after user choice
      setVisible(false);
      setDeferredPrompt(null);
    } else {
      // iOS: show instructions to add to home screen
      alert('To install this app on your iPhone/iPad, tap the Share icon and then "Add to Home Screen".');
      setVisible(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <div className="fixed top-4 right-4 z-[110001] max-w-md w-full shadow-lg rounded-lg overflow-hidden pointer-events-auto" role="dialog" aria-live="polite">
      <div className="flex items-center justify-between bg-[#0a0e27] text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/storyvermo_logo.png" alt="StoryVermo" width={40} height={40} className="rounded" />
          <div>
            <div className="font-semibold">Install StoryVermo</div>
            <div className="text-sm opacity-80">Every moment has a story</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleInstallClick} className="bg-white text-[#0a0e27] px-3 py-2 rounded font-semibold hover:opacity-95">Install</button>
          <button onClick={handleClose} aria-label="Dismiss" className="text-white opacity-80 hover:opacity-100">✕</button>
        </div>
      </div>
    </div>
  );
}
