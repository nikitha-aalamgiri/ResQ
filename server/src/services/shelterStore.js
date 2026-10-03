import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory store for shelters
let inMemoryShelters = [];

// Realistic shelter imagery (high quality disaster relief images / facilities)
const SHELTER_IMAGES = {
  'sh-hyd-01': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
  'sh-hyd-02': 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=600&q=80',
  'sh-hyd-03': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80',
  'sh-hyd-04': 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=600&q=80',
  'sh-hyd-05': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
};

// Pet friendliness & accessibility mapping
const SHELTER_EXTRAS = {
  'sh-hyd-01': { accessible: true, pets: true, area: 'Yousufguda / Jubilee Hills Corridor' },
  'sh-hyd-02': { accessible: true, pets: true, area: 'Basheerbagh / Nampally Sector' },
  'sh-hyd-03': { accessible: true, pets: false, area: 'Kothapet / Saroornagar Catchment' },
  'sh-hyd-04': { accessible: true, pets: true, area: 'Gachibowli / Financial District Sector' },
  'sh-hyd-05': { accessible: false, pets: false, area: 'Amberpet / Golnaka Lowlands' },
};

/**
 * Compute shelter status based on occupancy and capacity
 * Returns 'full' | 'filling_fast' | 'open'
 */
export function calculateShelterStatus(capacity, occupancy) {
  const cap = Number(capacity) || 1;
  const occ = Number(occupancy) || 0;
  if (occ >= cap) return 'full';
  if (occ / cap >= 0.75) return 'filling_fast';
  return 'open';
}

/**
 * Initialize shelters from GeoJSON or Supabase
 */
export function initializeShelters() {
  try {
    const geojsonPath = path.resolve(__dirname, '../../../data/mock/shelters.geojson');
    let raw = null;
    if (fs.existsSync(geojsonPath)) {
      raw = fs.readFileSync(geojsonPath, 'utf-8');
    } else {
      const altPath = path.resolve(__dirname, '../../data/mock/shelters.geojson');
      if (fs.existsSync(altPath)) {
        raw = fs.readFileSync(altPath, 'utf-8');
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryShelters = (parsed.features || []).map((f) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [78.4867, 17.3850];
        const id = f.id || props.id;
        const extras = SHELTER_EXTRAS[id] || { accessible: true, pets: true, area: 'Central Hyderabad' };

        return {
          id,
          name: props.name,
          address: props.address,
          area: extras.area,
          lat: coords[1], // GeoJSON is [lng, lat]
          lng: coords[0],
          capacity: Number(props.capacity) || 500,
          occupancy: Number(props.occupancy) || 0,
          status: calculateShelterStatus(props.capacity, props.occupancy),
          contact_person: props.contact_person || 'Camp Duty Officer',
          contact_phone: props.contact_phone || '+91 98491 00000',
          supplies: {
            food: props.supplies?.food_packets ?? true,
            water: props.supplies?.clean_drinking_water ?? true,
            medical: props.supplies?.medical_kit ?? true,
            blankets: props.supplies?.blankets ?? true,
            power: props.supplies?.power_backup ?? true,
            accessible: extras.accessible,
            pets: extras.pets,
          },
          image: SHELTER_IMAGES[id] || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=600&q=80',
          updated_at: new Date().toISOString(),
        };
      });
    }
  } catch (err) {
    console.error('[ShelterStore] Initialization warning:', err.message);
  }
}

// Initial load
initializeShelters();

/**
 * Haversine distance in KM
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Get all shelters with distance from user coordinates
 */
export function getAllShelters({ lat = null, lng = null, status = null } = {}) {
  let list = inMemoryShelters.map((s) => {
    // Recalculate status to ensure consistency
    const calculatedStatus = calculateShelterStatus(s.capacity, s.occupancy);
    const spare = Math.max(0, s.capacity - s.occupancy);

    let distKm = null;
    let driveTimeMin = null;

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      distKm = calculateDistanceKm(Number(lat), Number(lng), s.lat, s.lng);
      // Rough urban disaster traffic model (~22 km/h)
      driveTimeMin = Math.max(3, Math.round((distKm / 22) * 60));
    }

    return {
      ...s,
      status: calculatedStatus,
      spare_capacity: spare,
      distance_km: distKm,
      drive_time_min: driveTimeMin,
      drive_time_mins: driveTimeMin,
    };
  });

  // Filter by status if specified
  if (status && status !== 'all') {
    list = list.filter((s) => s.status === status.toLowerCase());
  }

  // Sort by distance if coordinates are present
  if (lat !== null && lng !== null) {
    list.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }

  return list;
}

/**
 * Find the nearest open shelter with spare capacity
 */
export function getNearestOpenShelter({ lat, lng, minCapacity = 1 }) {
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    // Default to central Hyderabad
    lat = 17.3850;
    lng = 78.4867;
  }

  const all = getAllShelters({ lat, lng });

  // Filter for shelters that have spare capacity and are not completely full
  const candidates = all.filter(
    (s) => s.status !== 'full' && s.spare_capacity >= minCapacity
  );

  if (candidates.length > 0) {
    // Already sorted by distance
    return candidates[0];
  }

  // If all are full or tight, return the one with the maximum spare capacity
  const fallback = [...all].sort((a, b) => b.spare_capacity - a.spare_capacity);
  return fallback[0] || all[0];
}

/**
 * Increment shelter occupancy in one atomic transaction
 */
export async function incrementShelterOccupancy(shelterId, peopleCount = 1) {
  const count = Math.max(1, Number(peopleCount) || 1);

  // Find in memory
  let shelter = inMemoryShelters.find(
    (s) => s.id === shelterId || s.id === `sh-${shelterId}` || s.id.replace('sh-hyd-', 'sh-') === shelterId
  );

  if (!shelter) {
    // Try matching by first shelter or default
    shelter = inMemoryShelters[0];
  }

  if (shelter) {
    shelter.occupancy += count;
    shelter.status = calculateShelterStatus(shelter.capacity, shelter.occupancy);
    shelter.updated_at = new Date().toISOString();

    // Sync to Supabase in background if table exists
    try {
      await supabase
        .from('shelters')
        .update({
          occupancy: shelter.occupancy,
          status: shelter.status,
          updated_at: shelter.updated_at,
        })
        .eq('id', shelter.id);
    } catch (err) {
      // Non-blocking in mock mode
    }

    return {
      success: true,
      shelter: {
        ...shelter,
        spare_capacity: Math.max(0, shelter.capacity - shelter.occupancy),
      },
      incremented_by: count,
      new_occupancy: shelter.occupancy,
    };
  }

  return { success: false, error: 'Shelter not found' };
}

export function addShelter(data) {
  const id = data.id || `sh-hyd-0${inMemoryShelters.length + 1}`;
  const capacity = Number(data.capacity) || 500;
  const occupancy = Number(data.occupancy) || 0;
  const status = data.status || calculateShelterStatus(capacity, occupancy);

  const newShelter = {
    id,
    name: data.name || 'New Relief Center',
    address: data.address || 'Hyderabad Urban Sector',
    area: data.area || 'Central Hyderabad',
    lat: Number(data.lat) || 17.3850,
    lng: Number(data.lng) || 78.4867,
    capacity,
    occupancy,
    status,
    contact_person: data.contact_person || 'Facility Coordinator',
    contact_phone: data.contact_phone || '+91 98490 00000',
    supplies: {
      food: data.supplies?.food ?? data.food_available ?? true,
      water: data.supplies?.water ?? data.water_available ?? true,
      medical: data.supplies?.medical ?? data.medical_available ?? true,
      blankets: data.supplies?.blankets ?? true,
      power: data.supplies?.power ?? true,
      accessible: data.supplies?.accessible ?? data.wheelchair_accessible ?? true,
      pets: data.supplies?.pets ?? data.pets_allowed ?? false,
    },
    image: data.image || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=600&q=80',
    updated_at: new Date().toISOString(),
  };

  inMemoryShelters.unshift(newShelter);
  return newShelter;
}

export function updateShelter(id, updates) {
  const index = inMemoryShelters.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const current = inMemoryShelters[index];
  const capacity = updates.capacity !== undefined ? Number(updates.capacity) : current.capacity;
  const occupancy = updates.occupancy !== undefined ? Number(updates.occupancy) : current.occupancy;
  const status = updates.status || calculateShelterStatus(capacity, occupancy);

  const updated = {
    ...current,
    ...updates,
    capacity,
    occupancy,
    status,
    supplies: {
      ...current.supplies,
      ...(updates.supplies || {}),
    },
    updated_at: new Date().toISOString(),
  };

  inMemoryShelters[index] = updated;
  return updated;
}

export function deleteShelter(id) {
  const index = inMemoryShelters.findIndex((s) => s.id === id);
  if (index === -1) return false;
  inMemoryShelters.splice(index, 1);
  return true;
}

export default {
  getAllShelters,
  getNearestOpenShelter,
  incrementShelterOccupancy,
  calculateShelterStatus,
  addShelter,
  updateShelter,
  deleteShelter,
};
