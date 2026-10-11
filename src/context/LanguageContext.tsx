/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, translations } from '../constants/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof typeof translations['tr'], fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  setLanguage: () => {},
  t: (key, fallback) => translations.tr[key] || fallback || String(key),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('subtrack_language');
      if (saved && ['tr', 'en', 'fr', 'es', 'de', 'it'].includes(saved)) {
        return saved as SupportedLanguage;
      }
      // Browser language preference fallback
      const navLang = navigator.language?.slice(0, 2).toLowerCase();
      if (['tr', 'en', 'fr', 'es', 'de', 'it'].includes(navLang)) {
        return navLang as SupportedLanguage;
      }
    } catch {}
    return 'tr';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('subtrack_language', lang);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key: keyof typeof translations['tr'], fallback?: string): string => {
    const langDict = translations[language] || translations.tr;
    return (langDict as any)[key] || (translations.tr as any)[key] || fallback || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
