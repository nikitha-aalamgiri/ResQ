import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { useLang } from '../../context/LangContext';

/**
 * PwaUpdatePrompt: Displays an unobtrusive update toast when a new service worker version is detected.
 */
export const PwaUpdatePrompt = () => {
  const { t } = useLang();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.info('[PWA] Service worker registered successfully.');
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-in fade-in max-w-sm"
      role="alert"
    >
      <div className="bg-surface border border-app-border rounded-lg shadow-lg p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-teal-light text-teal-deep shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-navy-ink">
              {t('offline.newVersionAvailable')}
            </p>
            <p className="text-[11px] text-muted-text">
              {t('offline.refreshToUpdate')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-2.5 py-1.5 rounded bg-teal-deep text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
          >
            {t('offline.refresh')}
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="p-1 rounded text-muted-text hover:text-navy-ink transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
