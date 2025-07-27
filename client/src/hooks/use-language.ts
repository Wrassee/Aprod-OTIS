import { useState, useEffect } from 'react';
import { translations, Translation } from '@/lib/translations';

export function useLanguage() {
  const [language, setLanguage] = useState<'hu' | 'de'>('hu');
  const [t, setT] = useState<Translation>(translations.hu);

  useEffect(() => {
    console.log('Language changed to:', language, 'Translations loaded:', translations[language]);
    setT(translations[language]);
    // Save to localStorage for persistence
    localStorage.setItem('otis-protocol-language', language);
  }, [language]);

  // Load saved language on initialization and listen for storage changes
  useEffect(() => {
    const saved = localStorage.getItem('otis-protocol-language') as 'hu' | 'de';
    if (saved && (saved === 'hu' || saved === 'de')) {
      setLanguage(saved);
    }
    
    // Listen for localStorage changes from other parts of the app
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'otis-protocol-language' && e.newValue) {
        const newLang = e.newValue as 'hu' | 'de';
        if (newLang === 'hu' || newLang === 'de') {
          setLanguage(newLang);
        }
      }
    };
    
    // Also check periodically for language changes
    const interval = setInterval(() => {
      const currentSaved = localStorage.getItem('otis-protocol-language') as 'hu' | 'de';
      if (currentSaved && currentSaved !== language && (currentSaved === 'hu' || currentSaved === 'de')) {
        setLanguage(currentSaved);
      }
    }, 500);
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  return {
    language,
    setLanguage,
    t,
  };
}
