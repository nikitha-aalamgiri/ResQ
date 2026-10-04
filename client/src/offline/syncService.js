import { db, setLastSync, setMeta, getMeta, requestPersistentStorage } from './db.js';
import { seedStaticContent } from './staticContent.js';

/**
 * Concurrency guard ensuring only one tab or thread synchronizes at a time.
 */
async function withSyncLock(taskFn) {
  if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
    return await navigator.locks.request('floodresq_offline_sync', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.info('[SyncService] Sync skipped: lock held by another tab.');
        return { skipped: true, reason: 'LOCKED_BY_ANOTHER_TAB' };
      }
      return await taskFn();
    });
  }

  // Fallback lock with 60-second TTL
  const lockKey = 'resq_sync_lock_ts';
  const now = Date.now();
  const existing = localStorage.getItem(lockKey);
  if (existing && now - parseInt(existing, 10) < 60000) {
    console.info('[SyncService] Sync skipped: fallback lock active.');
    return { skipped: true, reason: 'LOCKED_BY_ANOTHER_TAB' };
  }
  localStorage.setItem(lockKey, String(now));
  try {
    return await taskFn();
  } finally {
    localStorage.removeItem(lockKey);
  }
}

/**
 * Warms map tile cache for user center without bulk prefetching.
 */
async function warmCenterMapTile(lat = 17.3850, lng = 78.4867, zoom = 13) {
  if (typeof window === 'undefined') return;
  try {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    const tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    await fetch(tileUrl, { mode: 'no-cors' }).catch(() => {});
  } catch (err) {
    console.warn('[SyncService] Map tile warm notice:', err);
  }
}

/**
 * Retries an async operation with exponential backoff.
 */
async function retryWithBackoff(fn, retries = 2, delayMs = 1000) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return await retryWithBackoff(fn, retries - 1, delayMs * 2);
  }
}

/**
 * Synchronizes all public emergency datasets from the backend into IndexedDB.
 * 
 * @param {Object} options
 * @param {Function} [options.onProgress] - callback(category, status, details)
 * @param {number} [options.lat] - user latitude
 * @param {number} [options.lng] - user longitude
 * @returns {Promise<Object>} sync result summary
 */
export async function syncAll({ onProgress = () => {}, lat, lng } = {}) {
  return await withSyncLock(async () => {
    // 1. Ensure static emergency content exists immediately
    await seedStaticContent(db);
    onProgress('contacts', 'done', { count: await db.contacts.count() });
    onProgress('instructions', 'done', { count: await db.instructions.count() });

    // 2. Fetch offline bundle from backend with retry
    let bundle = null;
    let notModified = false;

    try {
      const lastEtag = await getMeta('lastEtag');
      const headers = {};
      if (lastEtag) {
        headers['If-None-Match'] = lastEtag;
      }

      let queryStr = '';
      if (lat !== undefined && lng !== undefined) {
        queryStr = `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
      }

      bundle = await retryWithBackoff(async () => {
        const response = await fetch(`/api/offline/bundle${queryStr}`, {
          method: 'GET',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 304) {
          notModified = true;
          return null;
        }

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const etag = response.headers.get('ETag');
        if (etag) {
          await setMeta('lastEtag', etag);
        }

        return await response.json();
      });
    } catch (fetchErr) {
      console.warn('[SyncService] Network fetch failed, retaining existing offline data:', fetchErr.message);
      onProgress('error', 'failed', { error: fetchErr.message });
      return {
        success: false,
        error: fetchErr.message,
        preservedOldData: true,
      };
    }

    const now = new Date().toISOString();

    // If 304 Not Modified, touch lastSync metadata and keep existing data intact
    if (notModified) {
      await setLastSync(null, now);
      onProgress('shelters', 'done', { count: await db.shelters.count() });
      onProgress('hospitals', 'done', { count: await db.hospitals.count() });
      onProgress('floodZones', 'done', { count: await db.floodZones.count() });
      onProgress('safeZones', 'done', { count: await db.safeZones.count() });
      onProgress('blockedRoads', 'done', { count: await db.blockedRoads.count() });
      onProgress('alerts', 'done', { count: await db.alerts.count() });
      onProgress('map', 'done');

      return {
        success: true,
        notModified: true,
        lastSync: now,
      };
    }

    if (!bundle) {
      return { success: false, error: 'Empty bundle response' };
    }

    // 3. Atomically write datasets into IndexedDB via Dexie transactions
    try {
      await db.transaction(
        'rw',
        [
          db.shelters,
          db.hospitals,
          db.floodZones,
          db.safeZones,
          db.blockedRoads,
          db.alerts,
          db.contacts,
          db.instructions,
          db.meta,
        ],
        async () => {
          // Shelters
          if (Array.isArray(bundle.shelters)) {
            await db.shelters.clear();
            await db.shelters.bulkPut(bundle.shelters);
            await setLastSync('shelters', bundle.updatedAt?.shelters || now);
            await setMeta('count_shelters', bundle.shelters.length);
          }

          // Hospitals
          if (Array.isArray(bundle.hospitals)) {
            await db.hospitals.clear();
            await db.hospitals.bulkPut(bundle.hospitals);
            await setLastSync('hospitals', bundle.updatedAt?.hospitals || now);
            await setMeta('count_hospitals', bundle.hospitals.length);
          }

          // Flood Zones
          if (Array.isArray(bundle.floodZones)) {
            await db.floodZones.clear();
            await db.floodZones.bulkPut(bundle.floodZones);
            await setLastSync('floodZones', bundle.updatedAt?.floodZones || now);
            await setMeta('count_floodZones', bundle.floodZones.length);
          }

          // Safe Zones
          if (Array.isArray(bundle.safeZones)) {
            await db.safeZones.clear();
            await db.safeZones.bulkPut(bundle.safeZones);
            await setLastSync('safeZones', bundle.updatedAt?.safeZones || now);
            await setMeta('count_safeZones', bundle.safeZones.length);
          }

          // Blocked Roads
          if (Array.isArray(bundle.blockedRoads)) {
            await db.blockedRoads.clear();
            await db.blockedRoads.bulkPut(bundle.blockedRoads);
            await setLastSync('blockedRoads', bundle.updatedAt?.blockedRoads || now);
            await setMeta('count_blockedRoads', bundle.blockedRoads.length);
          }

          // Alerts
          if (Array.isArray(bundle.alerts)) {
            await db.alerts.clear();
            await db.alerts.bulkPut(bundle.alerts);
            await setLastSync('alerts', bundle.updatedAt?.alerts || now);
            await setMeta('count_alerts', bundle.alerts.length);
          }

          // Contacts
          if (Array.isArray(bundle.contacts) && bundle.contacts.length > 0) {
            await db.contacts.bulkPut(bundle.contacts);
            await setLastSync('contacts', now);
          }

          // Instructions
          if (Array.isArray(bundle.instructions) && bundle.instructions.length > 0) {
            await db.instructions.bulkPut(bundle.instructions);
            await setLastSync('instructions', now);
          }

          // Overall last sync
          await setLastSync(null, now);
        }
      );

      // Report per-category progress
      onProgress('shelters', 'done', { count: bundle.shelters?.length || 0 });
      onProgress('hospitals', 'done', { count: bundle.hospitals?.length || 0 });
      onProgress('floodZones', 'done', { count: bundle.floodZones?.length || 0 });
      onProgress('safeZones', 'done', { count: bundle.safeZones?.length || 0 });
      onProgress('blockedRoads', 'done', { count: bundle.blockedRoads?.length || 0 });
      onProgress('alerts', 'done', { count: bundle.alerts?.length || 0 });

      // Warm center map tile
      await warmCenterMapTile(lat || 17.3850, lng || 78.4867);
      onProgress('map', 'done');

      // Request browser persistent storage
      await requestPersistentStorage();

      return {
        success: true,
        lastSync: now,
        counts: {
          shelters: bundle.shelters?.length || 0,
          hospitals: bundle.hospitals?.length || 0,
          floodZones: bundle.floodZones?.length || 0,
          safeZones: bundle.safeZones?.length || 0,
          blockedRoads: bundle.blockedRoads?.length || 0,
          alerts: bundle.alerts?.length || 0,
        },
      };
    } catch (dbErr) {
      console.error('[SyncService] IndexedDB transaction error:', dbErr);
      onProgress('error', 'failed', { error: dbErr.message });
      return { success: false, error: dbErr.message };
    }
  });
}
