import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA, PWAUtils } from '@/hooks/use-pwa';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Show iOS specific banner
    if (PWAUtils.showIOSInstallBanner()) {
      setShowIOSBanner(true);
    }

    // Show general install banner for installable PWAs
    if (isInstallable && !isInstalled) {
      setShowInstallBanner(true);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    try {
      await installPWA();
      setShowInstallBanner(false);
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  const handleDismissIOS = () => {
    PWAUtils.dismissIOSInstallBanner();
    setShowIOSBanner(false);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
  };

  // iOS Install Banner
  if (showIOSBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-4 shadow-lg z-50">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                OTIS APROD alkalmazás telepítése
              </p>
              <p className="text-xs text-red-100 mt-1">
                {PWAUtils.getInstallInstructions()}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismissIOS}
            className="ml-3 flex-shrink-0 p-1 hover:bg-red-500 rounded-full transition-colors"
            aria-label="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // General Install Banner
  if (showInstallBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 shadow-lg z-50">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Telepítse az OTIS APROD-ot
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Gyorsabb hozzáférés, offline funkciók
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-3">
            <button
              onClick={handleInstall}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Telepítés
            </button>
            <button
              onClick={handleDismissInstall}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Bezárás"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Install Button Component for header/menu
export function PWAInstallButton() {
  const { isInstallable, isInstalled, installPWA } = usePWA();

  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      onClick={installPWA}
      className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
    >
      <Download className="w-4 h-4" />
      <span>Telepítés</span>
    </button>
  );
}

// Offline Status Indicator
export function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-yellow-500 text-yellow-900 px-3 py-2 rounded-lg text-sm font-medium shadow-lg z-40">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-yellow-900 rounded-full animate-pulse"></div>
        <span>Offline módban</span>
      </div>
    </div>
  );
}