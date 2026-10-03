import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SUPPORTED_LANGUAGES } from '../i18n/translations';
import { useAuth } from './AuthContext';
import { apiFetch } from '../lib/api';

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const { user, profile } = useAuth();

  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resq_lang');
      if (saved && translations[saved]) return saved;
    }
    return profile?.language || 'en';
  });

  useEffect(() => {
    if (profile?.language && translations[profile.language] && !localStorage.getItem('resq_lang')) {
      setLangState(profile.language);
    }
  }, [profile]);

  const changeLanguage = async (newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('resq_lang', newLang);
      }
      if (user) {
        try {
          await apiFetch('/me/language', {
            method: 'PATCH',
            body: JSON.stringify({ language: newLang }),
          });
        } catch (e) {
          // Non-blocking fallback
        }
      }
    }
  };

  const t = (key) => {
    if (!key) return '';
    return translations[lang]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LangContext.Provider
      value={{
        lang,
        setLang: changeLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be used within a LangProvider');
  }
  return context;
};

export default LangContext;
