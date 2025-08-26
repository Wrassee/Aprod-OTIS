import { useState, useEffect } from 'react';

interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  installPWA: () => Promise<void>;
  isServiceWorkerSupported: boolean;
  swRegistration: ServiceWorkerRegistration | null;
}

// Completely disabled PWA hook for stability
export function usePWA(): UsePWAReturn {
  console.log('[PWA] Hook disabled for stability');
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Only monitor online/offline status - no PWA features
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isInstallable: false,
    isInstalled: false,
    isOffline,
    installPWA: async () => { console.log('[PWA] Install disabled'); },
    isServiceWorkerSupported: false,
    swRegistration: null,
  };
}

// PWA utility functions - disabled for safety
export const PWAUtils = {
  isStandalone(): boolean {
    return false; // Disabled
  },

  isIOS(): boolean {
    return false; // Disabled
  },

  isAndroid(): boolean {
    return false; // Disabled
  },

  canInstall(): boolean {
    return false; // Disabled
  }
};