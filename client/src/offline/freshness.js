/**
 * FloodResQ Data Freshness & Staleness Thresholds
 * Centralized governance for offline data caching ages and warning indicators.
 */

// Freshness thresholds in milliseconds
export const FRESHNESS_THRESHOLDS = {
  // Rapidly shifting operational infrastructure
  shelters: {
    stale: 30 * 60 * 1000,       // 30 minutes
    veryStale: 2 * 60 * 60 * 1000 // 2 hours
  },
  alerts: {
    stale: 30 * 60 * 1000,
    veryStale: 2 * 60 * 60 * 1000
  },
  blockedRoads: {
    stale: 30 * 60 * 1000,
    veryStale: 2 * 60 * 60 * 1000
  },
  // Geospatial terrain hazard polygons
  floodZones: {
    stale: 6 * 60 * 60 * 1000,    // 6 hours
    veryStale: 12 * 60 * 60 * 1000 // 12 hours
  },
  safeZones: {
    stale: 6 * 60 * 60 * 1000,
    veryStale: 12 * 60 * 60 * 1000
  },
  // Medical trauma facilities
  hospitals: {
    stale: 60 * 60 * 1000,        // 1 hour
    veryStale: 4 * 60 * 60 * 1000  // 4 hours
  },
  // Static content never expires
  contacts: null,
  instructions: null
};

/**
 * Evaluates the freshness tier of a given category and timestamp.
 * 
 * @param {string} category - dataset key (e.g. 'shelters', 'alerts', 'floodZones')
 * @param {string|Date|number|null} updatedAt - timestamp of data creation/sync
 * @param {number} [now] - current reference epoch time in ms (for testing)
 * @returns {{ updatedAt: string|null, level: 'fresh' | 'stale' | 'very_stale', ageMs: number, label: string }}
 */
export function getFreshness(category, updatedAt, now = Date.now()) {
  const threshold = FRESHNESS_THRESHOLDS[category];

  // Static items never go stale
  if (!threshold) {
    return {
      updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
      level: 'fresh',
      ageMs: 0,
      label: 'fresh'
    };
  }

  if (!updatedAt) {
    return {
      updatedAt: null,
      level: 'very_stale',
      ageMs: Infinity,
      label: 'very_stale'
    };
  }

  const updatedTime = new Date(updatedAt).getTime();
  if (isNaN(updatedTime)) {
    return {
      updatedAt: null,
      level: 'very_stale',
      ageMs: Infinity,
      label: 'very_stale'
    };
  }

  const ageMs = Math.max(0, now - updatedTime);

  if (ageMs >= threshold.veryStale) {
    return {
      updatedAt: new Date(updatedTime).toISOString(),
      level: 'very_stale',
      ageMs,
      label: 'very_stale'
    };
  }

  if (ageMs >= threshold.stale) {
    return {
      updatedAt: new Date(updatedTime).toISOString(),
      level: 'stale',
      ageMs,
      label: 'stale'
    };
  }

  return {
    updatedAt: new Date(updatedTime).toISOString(),
    level: 'fresh',
    ageMs,
    label: 'fresh'
  };
}

/**
 * Formats a timestamp into human-readable local time (e.g., "8:42 AM" or "Oct 4, 8:42 AM").
 */
export function formatSyncTime(timestamp, lang = 'en') {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
}
