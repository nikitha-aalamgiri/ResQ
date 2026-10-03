/**
 * ResQ Offline Data Cache & Synchronization Engine (Step 8)
 * Manages local storage persistence for shelters, contacts, flood zones,
 * and queued offline SOS distress signals.
 */

const STORAGE_KEYS = {
  SHELTERS: 'resq_cache_shelters',
  ZONES: 'resq_cache_zones',
  CONTACTS: 'resq_cache_contacts',
  LAST_ROUTE: 'resq_cache_last_route',
  OFFLINE_SOS_QUEUE: 'resq_offline_sos_queue',
};

// Fallback Relief Shelters for Offline Mode
export const DEFAULT_OFFLINE_SHELTERS = [
  {
    id: 'sh-hyd-01',
    name: 'Kotla Vijaya Bhaskara Reddy Indoor Stadium Relief Center',
    address: 'Yousufguda Main Road, Hyderabad',
    lat: 17.4375,
    lng: 78.4385,
    capacity: 800,
    occupancy: 520,
    spare_capacity: 280,
    status: 'open',
    distance_km: 4.2,
    drive_time_mins: 14,
    food_available: true,
    water_available: true,
    medical_available: true,
    wheelchair_accessible: true,
    pets_allowed: true,
    contact_phone: '+91-40-23451234',
    resources: { food_packets: 450, water_pouches: 1200, medical_kits: 80, blankets: 300 }
  },
  {
    id: 'sh-hyd-02',
    name: 'Lal Bahadur Shastri Stadium Relief Camp',
    address: 'Fateh Maidan Road, Basheer Bagh, Hyderabad',
    lat: 17.3995,
    lng: 78.4745,
    capacity: 1200,
    occupancy: 890,
    spare_capacity: 310,
    status: 'open',
    distance_km: 2.8,
    drive_time_mins: 9,
    food_available: true,
    water_available: true,
    medical_available: true,
    wheelchair_accessible: true,
    pets_allowed: false,
    contact_phone: '+91-40-23234567',
    resources: { food_packets: 800, water_pouches: 2500, medical_kits: 150, blankets: 600 }
  },
  {
    id: 'sh-hyd-03',
    name: 'Saroornagar Indoor Stadium Evacuation Hub',
    address: 'LB Nagar Main Road, Saroornagar, Hyderabad',
    lat: 17.3570,
    lng: 78.5320,
    capacity: 600,
    occupancy: 410,
    spare_capacity: 190,
    status: 'open',
    distance_km: 5.6,
    drive_time_mins: 16,
    food_available: true,
    water_available: true,
    medical_available: true,
    wheelchair_accessible: true,
    pets_allowed: true,
    contact_phone: '+91-40-24056789',
    resources: { food_packets: 350, water_pouches: 900, medical_kits: 60, blankets: 250 }
  },
  {
    id: 'sh-hyd-04',
    name: 'Gachibowli Sports Complex Regional Relief Camp',
    address: 'Old Mumbai Highway, Gachibowli, Hyderabad',
    lat: 17.4435,
    lng: 78.3490,
    capacity: 1500,
    occupancy: 340,
    spare_capacity: 1160,
    status: 'open',
    distance_km: 16.5,
    drive_time_mins: 45,
    food_available: true,
    water_available: true,
    medical_available: true,
    wheelchair_accessible: true,
    pets_allowed: true,
    contact_phone: '+91-40-23001122',
    resources: { food_packets: 1100, water_pouches: 3500, medical_kits: 200, blankets: 900 }
  },
  {
    id: 'sh-hyd-05',
    name: 'Amberpet Community Relief Hall',
    address: '6-3-248, Amberpet Main Road, Hyderabad',
    lat: 17.3910,
    lng: 78.5180,
    capacity: 400,
    occupancy: 380,
    spare_capacity: 20,
    status: 'filling_fast',
    distance_km: 3.5,
    drive_time_mins: 10,
    food_available: true,
    water_available: true,
    medical_available: false,
    wheelchair_accessible: false,
    pets_allowed: false,
    contact_phone: '+91-40-27409876',
    resources: { food_packets: 120, water_pouches: 400, medical_kits: 15, blankets: 80 }
  }
];

// Fallback Emergency Contacts
export const DEFAULT_OFFLINE_CONTACTS = [
  {
    id: 'c-112',
    name: 'Police Emergency & National Dispatch',
    number: '112',
    agency: 'Telangana State Police Command',
    category: 'primary',
    demo: true
  },
  {
    id: 'c-108',
    name: 'Emergency Medical & Ambulance Triage',
    number: '108',
    agency: 'EMRI GVK Emergency Health Services',
    category: 'primary',
    demo: true
  },
  {
    id: 'c-101',
    name: 'Fire & Flood Water Rescue (SDRF Boats)',
    number: '101',
    agency: 'Telangana Disaster Response & Fire Services',
    category: 'primary',
    demo: true
  },
  {
    id: 'c-1098',
    name: 'Childline Emergency Rescue',
    number: '1098',
    agency: 'Ministry of Women & Child Development',
    category: 'primary',
    demo: true
  },
  {
    id: 'c-1070',
    name: 'State Disaster Management Control Room',
    number: '1070',
    agency: 'Telangana State Disaster Management Authority (TSDMA)',
    category: 'resource',
    demo: true
  },
  {
    id: 'c-ghmc',
    name: 'GHMC Emergency Operations Flood Cell',
    number: '040-21111111',
    agency: 'Greater Hyderabad Municipal Corporation',
    category: 'resource',
    demo: true
  },
  {
    id: 'c-ndrf',
    name: '10th Battalion NDRF Alpha Tactical Base',
    number: '+91-94400-11221',
    agency: 'National Disaster Response Force',
    category: 'resource',
    demo: true
  }
];

export function getCachedShelters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHELTERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // Fallback
  }
  return DEFAULT_OFFLINE_SHELTERS;
}

export function saveCachedShelters(shelters) {
  try {
    if (Array.isArray(shelters) && shelters.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SHELTERS, JSON.stringify(shelters));
    }
  } catch (e) {
    // Ignore storage limits
  }
}

export function getCachedContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // Fallback
  }
  return DEFAULT_OFFLINE_CONTACTS;
}

export function saveCachedContacts(contacts) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    // Ignore
  }
}

export function getCachedZones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ZONES);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveCachedZones(zones) {
  try {
    localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(zones));
  } catch (e) {
    // Ignore
  }
}

export function getLastRoute() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_ROUTE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveLastRoute(routeData) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ROUTE, JSON.stringify(routeData));
  } catch (e) {
    // Ignore
  }
}

/**
 * Queue an SOS distress signal while offline
 */
export function queueOfflineSOS(sosData) {
  try {
    const queue = getOfflineSOSQueue();
    const queuedItem = {
      ...sosData,
      _queueId: `offline-${Date.now()}`,
      queuedAt: new Date().toISOString(),
    };
    queue.push(queuedItem);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_SOS_QUEUE, JSON.stringify(queue));
    return queuedItem;
  } catch (e) {
    return null;
  }
}

export function getOfflineSOSQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_SOS_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function clearOfflineSOSQueue() {
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_SOS_QUEUE);
  } catch (e) {
    // Ignore
  }
}

/**
 * Automatically flush offline queued SOS requests when network connection returns
 */
export async function syncOfflineSOSQueue(apiFetchFn) {
  const queue = getOfflineSOSQueue();
  if (!queue || queue.length === 0) return { synced: 0 };

  let successCount = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      const { _queueId, queuedAt, ...payload } = item;
      const res = await apiFetchFn('/sos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res && res.success) {
        successCount++;
      } else {
        remaining.push(item);
      }
    } catch (err) {
      remaining.push(item);
    }
  }

  try {
    if (remaining.length === 0) {
      clearOfflineSOSQueue();
    } else {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_SOS_QUEUE, JSON.stringify(remaining));
    }
  } catch (e) {}

  return { synced: successCount, remaining: remaining.length };
}

/**
 * Generate simulated SMS SOS link with pre-filled ID, coordinates and type (Requirement 5)
 */
export function generateSmsLink({ id = 'FQ-OFFLINE', lat = 17.3750, lng = 78.4867, type = 'Trapped', count = 1 }) {
  const formattedLat = Number(lat).toFixed(4);
  const formattedLng = Number(lng).toFixed(4);
  const text = encodeURIComponent(
    `RESQ SOS [${id}] - Type: ${type} - People: ${count} - GPS: ${formattedLat},${formattedLng} - Immediate Rescue Needed`
  );
  return `sms:112?body=${text}`;
}
