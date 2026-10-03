import React from 'react';
import { Globe } from 'lucide-react';
import { useLang } from '../../context/LangContext';

export const LanguageSelector = ({ variant = 'bar', className = '' }) => {
  const { lang, setLang, languages } = useLang();

  if (variant === 'pills') {
    return (
      <div className={`inline-flex items-center gap-1 p-0.5 rounded-md bg-app-bg border border-app-border text-xs ${className}`}>
        {languages.map((l) => {
          const isActive = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-teal-deep text-white shadow-xs'
                  : 'text-muted-text hover:text-navy-ink hover:bg-surface'
              }`}
              title={l.label}
            >
              {l.short || l.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-app-border text-xs shadow-2xs ${className}`}>
        <Globe className="w-3.5 h-3.5 text-teal-deep shrink-0" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="bg-transparent text-navy-ink text-xs font-semibold focus:outline-none cursor-pointer border-none py-0 pl-0 pr-1"
          aria-label="Choose Language"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.short || l.code.toUpperCase()} · {l.native}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Default 'bar' variant for app shell header
  return (
    <div className={`flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2 py-1 rounded border border-white/20 text-xs text-white transition-colors ${className}`}>
      <Globe className="w-3.5 h-3.5 text-teal-light shrink-0" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer border-none py-0 pl-0 pr-1"
        aria-label="Select Language"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} className="text-navy-ink bg-white">
            {l.short || l.code.toUpperCase()} · {l.native}
          </option>
        ))}
      </select>
    </div>
  );
};
