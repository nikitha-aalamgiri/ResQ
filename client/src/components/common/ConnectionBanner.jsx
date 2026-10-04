import React, { useState } from 'react';
import { useConnection } from '../../context/ConnectionContext';
import { useLang } from '../../context/LangContext';
import { formatSyncTime } from '../../offline/freshness';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * ConnectionBanner: Visualizes live connection reachability and offline state.
 * 
 * @param {Object} props
 * @param {'citizen' | 'compact'} [props.variant='citizen']
 * @param {string} [props.className='']
 */
export const ConnectionBanner = ({ variant = 'citizen', className = '' }) => {
  const { online, lastSyncAt, syncState, checkReachability, syncNow } = useConnection();
  const { t, lang } = useLang();
  const [isRetrying, setIsRetrying] = useState(false);

  const formattedTime = lastSyncAt ? formatSyncTime(lastSyncAt, lang) : t('offline.neverSynchronized');

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const isReachable = await checkReachability();
      if (isReachable) {
        await syncNow();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // 1. Offline Mode: Orange alert bar with last sync timestamp
  if (!online) {
    if (variant === 'compact') {
      return (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FEF6EE] border border-[#F9DBAF] text-[#B54708] text-xs font-medium ${className}`}
          role="status"
          aria-live="polite"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-[#B54708]" />
          <span>{t('offline.offlineShort') || 'Offline'}</span>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-1 underline text-[11px] hover:text-[#7A271A]"
          >
            {isRetrying ? '...' : t('offline.retry')}
          </button>
        </div>
      );
    }

    return (
      <div
        className={`bg-[#FEF6EE] border-b border-[#F9DBAF] text-[#B54708] px-4 py-2 text-xs font-medium transition-all ${className}`}
        role="alert"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 text-[#B54708]" />
            <span>
              <strong className="font-semibold tracking-wide uppercase">
                {t('offline.offlineMode')}
              </strong>
              {' '}&mdash;{' '}
              {t('offline.lastSynchronized')}: {formattedTime}
            </span>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-[#F9DBAF] text-xs font-semibold text-[#B54708] hover:bg-[#FDF2E9] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? t('offline.checking') : t('offline.checkConnection')}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Connection Restored / Sync in progress
  if (syncState === 'syncing') {
    return (
      <div
        className={`bg-[#EDF6F1] border-b border-[#C3E4D1] text-[#3B7A57] px-4 py-1.5 text-xs text-center font-medium animate-in fade-in ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3B7A57]" />
          <span>{t('offline.restoredSyncing')}</span>
        </div>
      </div>
    );
  }

  // 3. Online & Data Synchronized (Quiet Green Chip / Bar)
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EDF6F1] border border-[#C3E4D1] text-[#3B7A57] text-xs font-medium ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-[#3B7A57]" />
        <span>{t('offline.onlineSynchronized')}</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#F4FBF7] border-b border-[#D8F0E2] text-[#3B7A57] px-4 py-1 text-[11px] font-medium transition-all ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 shrink-0 text-[#3B7A57]" />
          <span>{t('offline.onlineSynchronized')}</span>
        </div>
        {lastSyncAt && (
          <span className="text-[10px] text-[#3B7A57]/80">
            {t('offline.lastSynchronized')}: {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
};
