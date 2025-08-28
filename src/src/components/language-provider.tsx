import { createContext, useContext } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Translation } from '@/lib/translations';

interface LanguageContextType {
  language: 'hu' | 'de';
  setLanguage: (lang: 'hu' | 'de') => void;
  t: Translation;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const languageState = useLanguage();

  return (
    <LanguageContext.Provider value={languageState}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
}
