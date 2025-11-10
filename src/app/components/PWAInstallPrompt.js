"use client";

import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
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
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setInstalled(true);
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
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // hide banner after user choice
    setVisible(false);
    setDeferredPrompt(null);
    console.log('PWA install choice:', outcome);
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full shadow-lg rounded-lg overflow-hidden" role="dialog" aria-live="polite">
      <div className="flex items-center justify-between bg-[#0a0e27] text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/storyvermo_logo.png" alt="StoryVermo" className="w-10 h-10 rounded" />
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
