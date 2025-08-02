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

export function usePWA(): UsePWAReturn {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if service worker is supported
  const isServiceWorkerSupported = 'serviceWorker' in navigator;

  useEffect(() => {
    // Register service worker
    if (isServiceWorkerSupported) {
      registerServiceWorker();
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Install prompt triggered');
      e.preventDefault();
      setDeferredPrompt(e as any);
      setIsInstallable(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Listen for online/offline status
    const handleOnline = () => {
      console.log('[PWA] App is online');
      setIsOffline(false);
    };

    const handleOffline = () => {
      console.log('[PWA] App is offline');
      setIsOffline(true);
    };

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isServiceWorkerSupported]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[PWA] Service worker registered successfully:', registration);
      setSwRegistration(registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker available');
              // Show update notification
              if (window.confirm('Új verzió érhető el. Szeretné frissíteni az alkalmazást?')) {
                window.location.reload();
              }
            }
          });
        }
      });

    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  };

  const installPWA = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setIsInstallable(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Install failed:', error);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOffline,
    installPWA,
    isServiceWorkerSupported,
    swRegistration
  };
}

// PWA utility functions
export const PWAUtils = {
  // Check if running in standalone mode
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  },

  // Check if running on iOS
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  // Check if running on Android
  isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  },

  // Get installation instructions based on platform
  getInstallInstructions(): string {
    if (this.isIOS()) {
      return 'Koppintson a megosztás gombra, majd válassza a "Hozzáadás a kezdőképernyőhöz" opciót.';
    } else if (this.isAndroid()) {
      return 'Koppintson a menü gombra, majd válassza a "Telepítés" vagy "Hozzáadás a kezdőképernyőhöz" opciót.';
    } else {
      return 'Használja a böngésző telepítés gombját az alkalmazás hozzáadásához.';
    }
  },

  // Show iOS install banner
  showIOSInstallBanner(): boolean {
    return this.isIOS() && !this.isStandalone() && !window.localStorage.getItem('ios-install-dismissed');
  },

  // Dismiss iOS install banner
  dismissIOSInstallBanner(): void {
    window.localStorage.setItem('ios-install-dismissed', 'true');
  }
};