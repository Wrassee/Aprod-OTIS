import { useState, useEffect } from 'react';
import { translations, Translation } from '@/lib/translations';

export function useLanguage() {
  const [language, setLanguage] = useState<'hu' | 'de'>('hu');
  const [t, setT] = useState<Translation>(translations.hu);

  useEffect(() => {
    setT(translations[language]);
    // Save to localStorage for persistence
    localStorage.setItem('otis-protocol-language', language);
  }, [language]);

  // Load saved language on initialization
  useEffect(() => {
    const saved = localStorage.getItem('otis-protocol-language') as 'hu' | 'de';
    if (saved && (saved === 'hu' || saved === 'de')) {
      setLanguage(saved);
    }
  }, []);

  return {
    language,
    setLanguage,
    t,
  };
}
