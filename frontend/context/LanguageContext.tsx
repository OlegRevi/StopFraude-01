import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, Translations, translations } from '../constants/translations';
import { getSavedLanguage, saveLanguage } from '../services/storage';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: keyof Translations) => string;
  isRomanian: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ro',
  setLanguage: async () => {},
  t: (key: keyof Translations) => translations.ro[key] || (key as string),
  isRomanian: true,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('ro');

  useEffect(() => {
    // Load persisted language choice on startup
    const initLanguage = async () => {
      try {
        const saved = await getSavedLanguage();
        if (saved && (saved === 'ro' || saved === 'en')) {
          setLanguageState(saved);
        }
      } catch (e) {
        console.warn('Failed to load saved language, default to ro:', e);
      }
    };
    initLanguage();
  }, []);

  const handleSetLanguage = async (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    await saveLanguage(newLang);
  };

  const t = (key: keyof Translations): string => {
    const currentDict = translations[language] || translations.ro;
    return currentDict[key] || translations.ro[key] || (key as string);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t,
        isRomanian: language === 'ro',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
