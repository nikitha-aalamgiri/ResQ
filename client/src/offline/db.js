import Dexie from 'dexie';

/**
 * FloodResQ IndexedDB Database Schema
 * Built with Dexie.js for Phase 1 Offline Foundation.
 * Manages public emergency datasets, citizen incidents, and queues.
 */
export const db = new Dexie('FloodResQ_DB');

db.version(1).stores({
  // Public emergency datasets (Phase 1)
  shelters: 'id, name, status, capacity, occupancy, updatedAt',
  hospitals: 'id, name, emergency_available, updatedAt',
  floodZones: 'id, name, severity, risk_level, updatedAt',
  safeZones: 'id, name, area, updatedAt',
  blockedRoads: 'id, name, road_name, status, severity, updatedAt',
  contacts: 'number, service_key, label_key',
  alerts: 'id, severity, timestamp, updatedAt',
  instructions: 'key, category, severity',

  // Spatial & Navigation cache
  routes: 'id, createdAt',

  // Citizen incident cache & queues (Phases 1-3)
  mySos: 'id, status, priority, createdAt, updatedAt',
  sosQueue: '++localId, clientGeneratedId, status, createdAt',
  hazardQueue: '++localId, status, createdAt',

  // Key-value metadata table
  meta: 'key',
});

// ============================================================================
// Meta Table Helper Methods
// ============================================================================

export async function getMeta(key) {
  try {
    const record = await db.meta.get(key);
    return record ? record.value : null;
  } catch (err) {
    console.warn(`[OfflineDB] Failed to get meta for ${key}:`, err);
    return null;
  }
}

export async function setMeta(key, value) {
  try {
    await db.meta.put({ key, value, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn(`[OfflineDB] Failed to set meta for ${key}:`, err);
  }
}

export async function getLastSync(category) {
  const metaKey = category ? `lastSync_${category}` : 'lastSync_overall';
  return await getMeta(metaKey);
}

export async function setLastSync(category, timestamp) {
  const metaKey = category ? `lastSync_${category}` : 'lastSync_overall';
  await setMeta(metaKey, timestamp || new Date().toISOString());
}

export async function getLastKnownLocation() {
  return await getMeta('lastKnownLocation');
}

export async function setLastKnownLocation(location) {
  await setMeta('lastKnownLocation', {
    ...location,
    timestamp: location.timestamp || new Date().toISOString(),
  });
}

/**
 * Security Rule: On user logout, wipe sensitive citizen session data
 * (mySos, routes, lastKnownLocation, and non-pending SOS queue items).
 * Public emergency datasets (shelters, hospitals, zones, contacts, instructions)
 * are strictly preserved so the app remains safe and useful offline.
 */
export async function clearUserSessionData() {
  try {
    await db.transaction('rw', [db.mySos, db.routes, db.meta, db.sosQueue], async () => {
      // Clear personal incident cache
      await db.mySos.clear();
      // Clear personal routes
      await db.routes.clear();
      // Clear GPS coordinates and auth cache from meta
      await db.meta.delete('lastKnownLocation');
      await db.meta.delete('userSession');

      // In sosQueue: remove items that are already synced or closed,
      // but retain unsent pending items per Phase 3 offline queue rules
      await db.sosQueue
        .where('status')
        .notEqual('pending_unsent')
        .delete();
    });
    console.info('[OfflineDB] Cleared citizen session data on logout. Public safety data preserved.');
  } catch (err) {
    console.error('[OfflineDB] Error clearing session data on logout:', err);
  }
}

/**
 * Requests persistent storage from the browser to protect cached emergency data
 * against automated eviction under disk pressure.
 */
export async function requestPersistentStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.info(`[OfflineDB] Persistent storage requested: ${granted ? 'granted' : 'denied'}`);
        return granted;
      }
      return true;
    } catch (err) {
      console.warn('[OfflineDB] Error requesting persistent storage:', err);
      return false;
    }
  }
  return false;
}
