import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getAllShelters } from './shelterStore.js';
import { getAllAlerts } from './alertStore.js';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getMockDataPath = (fileName) => {
  return path.resolve(__dirname, '../../../data/mock', fileName);
};

// Fallback emergency contacts
const DEFAULT_CONTACTS = [
  { number: '112', service_key: 'national_emergency', label_key: 'contacts.c112_label', demo: true },
  { number: '108', service_key: 'ambulance', label_key: 'contacts.c108_label', demo: true },
  { number: '101', service_key: 'fire_rescue', label_key: 'contacts.c101_label', demo: true },
  { number: '1098', service_key: 'childline', label_key: 'contacts.c1098_label', demo: true },
  { number: '040-23454088', service_key: 'ghmc_control', label_key: 'contacts.ghmc_label', demo: true }
];

// Fallback high ground safe sectors
const DEFAULT_SAFE_ZONES = [
  {
    id: 'sz-01',
    name: 'Jubilee Hills Plateau Safe Sector',
    elevation_meters: 585.00,
    area: 'Jubilee Hills',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [78.4050, 17.4300],
        [78.4180, 17.4320],
        [78.4220, 17.4410],
        [78.4120, 17.4450],
        [78.4010, 17.4380],
        [78.4050, 17.4300]
      ]]
    },
    updatedAt: '2026-10-04T00:00:00.000Z'
  },
  {
    id: 'sz-02',
    name: 'Banjara Hills High Ground Assembly Point',
    elevation_meters: 570.00,
    area: 'Banjara Hills',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [78.4350, 17.4120],
        [78.4480, 17.4150],
        [78.4510, 17.4240],
        [78.4420, 17.4280],
        [78.4310, 17.4200],
        [78.4350, 17.4120]
      ]]
    },
    updatedAt: '2026-10-04T00:00:00.000Z'
  },
  {
    id: 'sz-03',
    name: 'Hitec City Cyber Towers Safe Basin Corridor',
    elevation_meters: 555.00,
    area: 'Madhapur / Hitec City',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [78.3750, 17.4450],
        [78.3880, 17.4480],
        [78.3940, 17.4580],
        [78.3840, 17.4610],
        [78.3710, 17.4540],
        [78.3750, 17.4450]
      ]]
    },
    updatedAt: '2026-10-04T00:00:00.000Z'
  }
];

// Fallback emergency hospitals
const DEFAULT_HOSPITALS = [
  {
    id: 'hosp-01',
    name: 'Osmania General Hospital',
    lat: 17.3735,
    lng: 78.4735,
    phone: '+91-40-24600121',
    emergency_available: true,
    updatedAt: '2026-10-04T00:00:00.000Z'
  },
  {
    id: 'hosp-02',
    name: 'Gandhi Hospital',
    lat: 17.4245,
    lng: 78.5020,
    phone: '+91-40-27505566',
    emergency_available: true,
    updatedAt: '2026-10-04T00:00:00.000Z'
  },
  {
    id: 'hosp-03',
    name: 'Nizams Institute of Medical Sciences (NIMS)',
    lat: 17.4220,
    lng: 78.4525,
    phone: '+91-40-23489000',
    emergency_available: true,
    updatedAt: '2026-10-04T00:00:00.000Z'
  }
];

const DEFAULT_INSTRUCTIONS = [
  { key: 'move_to_higher_ground', category: 'evacuation', severity: 'critical' },
  { key: 'disconnect_utilities', category: 'safety', severity: 'warning' },
  { key: 'avoid_flood_waters', category: 'safety', severity: 'critical' },
  { key: 'prepare_emergency_kit', category: 'preparedness', severity: 'info' },
  { key: 'stay_informed', category: 'advisory', severity: 'info' }
];

/**
 * Builds the comprehensive public emergency offline bundle.
 * Returns only public emergency datasets (zero user PII or sensitive credentials).
 */
export async function getOfflineBundle({ lat, lng, radius_km } = {}) {
  const serverTime = new Date().toISOString();

  // 1. Shelters
  let rawShelters = [];
  try {
    rawShelters = getAllShelters() || [];
  } catch (e) {
    console.warn('[OfflineBundle] Failed to fetch shelters from store:', e.message);
  }

  const shelters = rawShelters.map((s) => ({
    id: s.id,
    name: s.name,
    name_i18n: s.name_i18n || { en: s.name, te: s.name, hi: s.name },
    lat: s.lat ?? s.latitude,
    lng: s.lng ?? s.longitude,
    capacity: s.capacity,
    occupancy: s.occupancy ?? 0,
    food: s.food_available ?? s.supplies?.food ?? true,
    water: s.water_available ?? s.supplies?.water ?? true,
    medical: s.medical_available ?? s.supplies?.medical ?? true,
    accessible: s.wheelchair_accessible ?? false,
    pets: s.pets_allowed ?? false,
    status: s.status || 'open',
    area_name: s.address || s.area_name || '',
    updatedAt: s.updated_at || s.updatedAt || '2026-10-04T00:00:00.000Z'
  }));

  // 2. Hospitals (query database if available, else fallback)
  let hospitals = DEFAULT_HOSPITALS;
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        hospitals = data.map((h) => ({
          id: h.id,
          name: h.name,
          lat: h.latitude ?? h.lat,
          lng: h.longitude ?? h.lng,
          phone: h.phone || h.contact_phone || '+91-40-24600121',
          emergency_available: h.emergency_available ?? true,
          updatedAt: h.updated_at || '2026-10-04T00:00:00.000Z'
        }));
      }
    }
  } catch (e) {
    console.warn('[OfflineBundle] Database hospitals query fallback:', e.message);
  }

  // 3. Flood Zones
  let floodZones = [];
  try {
    const rawFz = fs.readFileSync(getMockDataPath('flood_zones.geojson'), 'utf-8');
    const parsedFz = JSON.parse(rawFz);
    floodZones = (parsedFz.features || []).map((f) => ({
      id: f.id || f.properties?.zone_code,
      name: f.properties?.name || 'Flood Zone',
      severity: f.properties?.severity || 'medium',
      risk_level: f.properties?.severity || 'medium',
      geometry: f.geometry,
      updatedAt: '2026-10-04T00:00:00.000Z'
    }));
  } catch (e) {
    console.warn('[OfflineBundle] Failed to read flood_zones mock:', e.message);
  }

  // 4. Safe Zones
  let safeZones = DEFAULT_SAFE_ZONES;
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('safe_zones')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        safeZones = data.map((sz) => ({
          id: sz.id,
          name: sz.name,
          elevation_meters: sz.elevation_meters,
          area: sz.area,
          geometry: sz.geometry,
          updatedAt: sz.updated_at || '2026-10-04T00:00:00.000Z'
        }));
      }
    }
  } catch (e) {
    console.warn('[OfflineBundle] Database safe_zones query fallback:', e.message);
  }

  // 5. Blocked Roads
  let blockedRoads = [];
  try {
    const rawBr = fs.readFileSync(getMockDataPath('blocked_roads.geojson'), 'utf-8');
    const parsedBr = JSON.parse(rawBr);
    blockedRoads = (parsedBr.features || []).map((f) => ({
      id: f.properties?.id || f.id,
      name: f.properties?.road_name || f.properties?.name || 'Blocked Road',
      road_name: f.properties?.road_name || f.properties?.name || 'Blocked Road',
      status: f.properties?.status || 'impassable',
      severity: f.properties?.severity || 'critical',
      geometry: f.geometry,
      reason: f.properties?.reason || 'Submerged causeway',
      updatedAt: '2026-10-04T00:00:00.000Z'
    }));
  } catch (e) {
    console.warn('[OfflineBundle] Failed to read blocked_roads mock:', e.message);
  }

  // 6. Latest Alerts (last 20)
  let alerts = [];
  try {
    const allAlerts = getAllAlerts() || [];
    alerts = allAlerts.slice(0, 20).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.message || a.description || '',
      severity: a.severity || 'high',
      affected_area: a.affected_areas || a.affected_area || [],
      timestamp: a.created_at || a.timestamp || serverTime,
      languages: a.translations || { en: a.message, te: a.message, hi: a.message },
      updatedAt: a.updated_at || a.created_at || serverTime
    }));
  } catch (e) {
    console.warn('[OfflineBundle] Failed to fetch alerts:', e.message);
  }

  // 7. Contacts & Instructions
  const contacts = DEFAULT_CONTACTS;
  const instructions = DEFAULT_INSTRUCTIONS;

  // Compute dataset updatedAt dictionary
  const getLatestTimestamp = (items, fallback) => {
    if (!items || items.length === 0) return fallback;
    let latest = items[0].updatedAt || items[0].timestamp || fallback;
    for (const item of items) {
      const ts = item.updatedAt || item.timestamp;
      if (ts && ts > latest) latest = ts;
    }
    return latest;
  };

  const updatedAt = {
    shelters: getLatestTimestamp(shelters, serverTime),
    hospitals: getLatestTimestamp(hospitals, '2026-10-04T00:00:00.000Z'),
    floodZones: getLatestTimestamp(floodZones, '2026-10-04T00:00:00.000Z'),
    safeZones: getLatestTimestamp(safeZones, '2026-10-04T00:00:00.000Z'),
    blockedRoads: getLatestTimestamp(blockedRoads, '2026-10-04T00:00:00.000Z'),
    alerts: getLatestTimestamp(alerts, serverTime),
    contacts: '2026-10-04T00:00:00.000Z',
    instructions: '2026-10-04T00:00:00.000Z',
  };

  return {
    serverTime,
    updatedAt,
    shelters,
    hospitals,
    floodZones,
    safeZones,
    blockedRoads,
    alerts,
    contacts,
    instructions,
  };
}

/**
 * Computes deterministic ETag hash for offline bundle
 */
export function computeBundleEtag(bundle) {
  // Hash the critical content and updatedAt timestamps
  const content = JSON.stringify({
    updatedAt: bundle.updatedAt,
    counts: {
      shelters: bundle.shelters.length,
      hospitals: bundle.hospitals.length,
      floodZones: bundle.floodZones.length,
      safeZones: bundle.safeZones.length,
      blockedRoads: bundle.blockedRoads.length,
      alerts: bundle.alerts.length,
    },
    sheltersSample: bundle.shelters.slice(0, 3),
    alertsSample: bundle.alerts.slice(0, 3),
  });
  return `"${crypto.createHash('sha256').update(content).digest('hex').substring(0, 16)}"`;
}
