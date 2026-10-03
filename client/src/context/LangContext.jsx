import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SUPPORTED_LANGUAGES } from '../i18n/translations';
import { useAuth } from './AuthContext';
import { apiFetch } from '../lib/api';

const LangContext = createContext(null);

const LOCALE_MAP = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
};

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined) return obj[path];
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export const LangProvider = ({ children }) => {
  const { user, profile } = useAuth();

  // Immediate synchronous init from localStorage to prevent flash of English
  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resq_lang');
      if (saved && translations[saved]) return saved;
    }
    return profile?.language || 'en';
  });

  // Sync with document element language
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Sync from profile if user logged in and no local override
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
        document.documentElement.lang = newLang;
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

  const resolveLeaf = (val) => {
    return (typeof val === 'string' || typeof val === 'number') ? val : undefined;
  };

  const findInNamespaces = (dict, targetKey) => {
    if (!dict || typeof dict !== 'object') return undefined;
    for (const ns of Object.keys(dict)) {
      if (typeof dict[ns] === 'object' && dict[ns] !== null && dict[ns]?.[targetKey] !== undefined) {
        const val = resolveLeaf(dict[ns][targetKey]);
        if (val !== undefined) return val;
      }
    }
    return undefined;
  };

  /**
   * Flexible translation resolver:
   * Supports namespace paths ("nav.home", "common.cancel", "status.arrived")
   * as well as flat root keys ("home", "open", "fillingFast")
   * with automatic interpolation of {variables}.
   * Guaranteed to return a primitive string, preventing React object-child errors.
   */
  const t = (key, params = {}) => {
    if (!key) return '';

    // 1. Try direct/nested path in active language (must be a primitive leaf)
    let text = resolveLeaf(getNestedValue(translations[lang], key));

    if (text === undefined && translations[lang]?.[key] !== undefined) {
      text = resolveLeaf(translations[lang][key]);
    }

    // 2. If flat key (or if key resolved to an object namespace), search across namespaces in active language
    if (text === undefined && !key.includes('.')) {
      text = findInNamespaces(translations[lang], key);
    }

    // 3. Fallback to English direct/nested path
    if (text === undefined) {
      text = resolveLeaf(getNestedValue(translations.en, key));
    }
    if (text === undefined && translations.en?.[key] !== undefined) {
      text = resolveLeaf(translations.en[key]);
    }

    // 4. Fallback to English across namespaces
    if (text === undefined && !key.includes('.')) {
      text = findInNamespaces(translations.en, key);
    }

    // 5. Ultimate fallback: string representation of key (guarantees never returning an object to JSX)
    if (text === undefined || (typeof text === 'object' && text !== null)) {
      text = String(key);
    }

    // Interpolation
    if (typeof text === 'string' && params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        text = text.replace(new RegExp(`:${k}\\b`, 'g'), v);
      }
    }

    return text;
  };

  const locale = LOCALE_MAP[lang] || 'en-IN';

  // Intl Date Formatter
  const formatDate = (date, options) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(locale, options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch (e) {
      return String(date);
    }
  };

  // Intl Time Formatter
  const formatTime = (date, options) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(locale, options || {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch (e) {
      return String(date);
    }
  };

  // Intl DateTime Formatter
  const formatDateTime = (date, options) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(locale, options || {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch (e) {
      return String(date);
    }
  };

  // Intl Number Formatter
  const formatNumber = (num, options) => {
    try {
      return new Intl.NumberFormat(locale, options).format(Number(num) || 0);
    } catch (e) {
      return String(num);
    }
  };

  // Locale-aware distance formatting ("1.4 km", "1.4 కి.మీ", "1.4 किमी")
  const formatDistance = (distanceKm) => {
    const num = Number(distanceKm) || 0;
    const formatted = formatNumber(num.toFixed(1));
    return t('common.distanceKm', { dist: formatted }) || `${formatted} km`;
  };

  // Locale-aware duration formatting ("12 min away")
  const formatDuration = (minutes) => {
    const num = Math.round(Number(minutes) || 0);
    const formatted = formatNumber(num);
    return t('common.durationMins', { mins: formatted }) || `${formatted} min away`;
  };

  return (
    <LangContext.Provider
      value={{
        lang,
        locale,
        setLang: changeLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        formatDate,
        formatTime,
        formatDateTime,
        formatNumber,
        formatDistance,
        formatDuration,
      }}
    >
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const context = useContext(LangContext);
  if (!context) {
    return {
      lang: 'en',
      locale: 'en-IN',
      setLang: () => {},
      t: (k, params) => k,
      languages: SUPPORTED_LANGUAGES,
      formatDate: (d) => String(d),
      formatTime: (d) => String(d),
      formatDateTime: (d) => String(d),
      formatNumber: (n) => String(n),
      formatDistance: (d) => `${d} km`,
      formatDuration: (m) => `${m} min away`,
    };
  }
  return context;
};
