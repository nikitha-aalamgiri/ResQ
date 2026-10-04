import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getLastSync, setLastSync } from '../offline/db';
import { syncAll } from '../offline/syncService';

const ConnectionContext = createContext(null);

export const ConnectionProvider = ({ children }) => {
  const [online, setOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [lastOnlineAt, setLastOnlineAt] = useState(() => new Date().toISOString());
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const isSyncingRef = useRef(false);

  // Initialize lastSyncAt from IndexedDB
  useEffect(() => {
    let mounted = true;
    getLastSync().then((ts) => {
      if (mounted && ts) {
        setLastSyncAt(ts);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Lightweight Reachability Check via GET /api/health with 3s timeout
   */
  const checkReachability = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOnline(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setOnline(true);
        setLastOnlineAt(new Date().toISOString());
        return true;
      } else {
        setOnline(false);
        return false;
      }
    } catch {
      setOnline(false);
      return false;
    }
  }, []);

  /**
   * Triggers synchronization of emergency datasets
   */
  const syncNow = useCallback(async (options = {}) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncState('syncing');

    try {
      const result = await syncAll(options);
      if (result && result.success) {
        const now = result.lastSync || new Date().toISOString();
        setLastSyncAt(now);
        setSyncState('synced');
      } else {
        setSyncState('error');
      }
    } catch (err) {
      console.warn('[ConnectionContext] Sync error:', err);
      setSyncState('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Monitor network events and interval checks
  useEffect(() => {
    let interval30s = null;
    let interval5m = null;

    const handleOnline = async () => {
      const reachable = await checkReachability();
      if (reachable) {
        syncNow();
      }
    };

    const handleOffline = () => {
      setOnline(false);
    };

    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkReachability();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    // Initial check
    checkReachability().then((isReachable) => {
      if (isReachable) {
        syncNow();
      }
    });

    // 30s reachability heartbeat
    interval30s = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkReachability();
      }
    }, 30000);

    // 5m periodic sync while online and visible
    interval5m = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && online) {
        syncNow();
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      if (interval30s) clearInterval(interval30s);
      if (interval5m) clearInterval(interval5m);
    };
  }, [checkReachability, syncNow, online]);

  const value = {
    online,
    lastOnlineAt,
    lastSyncAt,
    syncState,
    setSyncState,
    setLastSyncAt,
    checkReachability,
    syncNow,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
