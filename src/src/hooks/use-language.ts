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
    const checkLanguage = () => {
      const saved = localStorage.getItem('otis-protocol-language') as 'hu' | 'de';
      if (saved && (saved === 'hu' || saved === 'de') && saved !== language) {
        console.log('Loading/updating saved language:', saved, 'current:', language);
        setLanguage(saved);
      }
    };
    
    // Check immediately
    checkLanguage();
    
    // Check periodically to catch localStorage changes
    const interval = setInterval(checkLanguage, 500);
    
    // Listen for localStorage changes from other parts of the app
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'otis-protocol-language' && e.newValue) {
        const newLang = e.newValue as 'hu' | 'de';
        if (newLang === 'hu' || newLang === 'de') {
          console.log('Storage event language change:', newLang);
          setLanguage(newLang);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [language]);

  return {
    language,
    setLanguage,
    t,
  };
}
