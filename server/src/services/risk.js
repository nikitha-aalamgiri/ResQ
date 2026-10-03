import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load mock flood zones
let cachedZones = null;

const loadFloodZones = () => {
  if (cachedZones) return cachedZones;
  try {
    const filePath = path.resolve(__dirname, '../../../data/mock/flood_zones.geojson');
    const raw = fs.readFileSync(filePath, 'utf-8');
    cachedZones = JSON.parse(raw);
    return cachedZones;
  } catch (err) {
    console.error('[Risk Service] Error loading flood_zones.geojson:', err.message);
    return { features: [] };
  }
};

/**
 * Assesses the flood risk for a given latitude and longitude.
 * Uses Turf.js booleanPointInPolygon to determine polygon containment.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {object} Assessment result with risk_level, zone_name, recommended_actions, etc.
 */
export const assessRisk = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid coordinates: latitude and longitude must be numbers');
  }

  // Turf uses [longitude, latitude]
  const pt = point([longitude, latitude]);
  const zones = loadFloodZones();

  // 1. Check exact polygon containment
  for (const feature of zones.features) {
    if (feature.geometry && booleanPointInPolygon(pt, feature.geometry)) {
      const p = feature.properties || {};
      const severity = p.severity || 'high';

      let recommended_actions = [];
      if (severity === 'critical') {
        recommended_actions = [
          'Move to higher ground immediately (do not wait for water levels to rise)',
          'Avoid flooded roads, low-lying bridges, and storm drain corridors',
          'Disconnect electricity mains if safe and keep essential documents in waterproof bags',
          'Submit SOS distress request or contact emergency rescue (112, 108)'
        ];
      } else if (severity === 'high') {
        recommended_actions = [
          'Prepare for evacuation and pack emergency go-bag',
          'Avoid all low-lying roads and waterlogged underpasses in this sector',
          'Keep mobile phones fully charged and maintain emergency radio contact',
          'Follow instructions from GHMC Disaster Response Force and SDRF units'
        ];
      } else if (severity === 'medium') {
        recommended_actions = [
          'Stay alert for rising water levels in low-lying basins',
          'Avoid parking vehicles in basements or near lake outflow channels',
          'Verify evacuation routes to nearest municipal relief camp',
          'Monitor real-time FloodWatch weather advisories'
        ];
      } else {
        recommended_actions = [
          'Maintain normal situational vigilance',
          'Ensure rooftop and street storm drains remain unclogged',
          'Keep emergency contact numbers handy'
        ];
      }

      return {
        risk_level: severity,
        zone_name: p.name || 'Active Flood Risk Zone',
        zone_code: p.zone_code || 'FZ-ALERT',
        water_level_meters: p.water_level_meters || null,
        danger_threshold_meters: p.danger_threshold_meters || null,
        evacuation_status: p.evacuation_status || 'Active Advisory',
        is_inside_zone: true,
        recommended_actions,
        coordinates: {
          latitude,
          longitude,
        }
      };
    }
  }

  // 2. If not directly inside a zone, calculate distance to nearest zone centroid
  let minDistanceKm = Infinity;
  let nearestZone = null;

  for (const feature of zones.features) {
    if (feature.geometry?.coordinates?.[0]?.[0]) {
      const [cLng, cLat] = feature.geometry.coordinates[0][0];
      // Quick Haversine distance
      const dLat = (latitude - cLat) * Math.PI / 180;
      const dLng = (longitude - cLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latitude * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = 6371 * c;

      if (distKm < minDistanceKm) {
        minDistanceKm = distKm;
        nearestZone = feature;
      }
    }
  }

  // If within 1.5 km of a critical or high zone, return advisory Medium risk
  if (minDistanceKm < 1.8 && nearestZone) {
    const p = nearestZone.properties || {};
    return {
      risk_level: 'medium',
      zone_name: `Buffer Zone (${p.name || 'Flood Corridor'})`,
      zone_code: p.zone_code || 'FZ-BUFFER',
      water_level_meters: p.water_level_meters || null,
      danger_threshold_meters: p.danger_threshold_meters || null,
      evacuation_status: 'Precautionary Watch',
      is_inside_zone: false,
      distance_to_hazard_km: parseFloat(minDistanceKm.toFixed(2)),
      recommended_actions: [
        'Sector located within 2km of an active flood basin',
        'Avoid travel toward adjacent low-lying riverbed causeways',
        'Keep emergency supplies ready in case boundary zones expand',
        'Monitor official flood broadcast bulletins'
      ],
      coordinates: {
        latitude,
        longitude,
      }
    };
  }

  // Otherwise, Safe Zone (Low Risk)
  return {
    risk_level: 'low',
    zone_name: 'Safe Zone (Greater Hyderabad Elevated Sector)',
    zone_code: 'SAFE-SECTOR',
    water_level_meters: 0.15,
    danger_threshold_meters: 2.50,
    evacuation_status: 'Normal Operations',
    is_inside_zone: false,
    distance_to_hazard_km: minDistanceKm !== Infinity ? parseFloat(minDistanceKm.toFixed(2)) : null,
    recommended_actions: [
      'Current sector is safe with normal storm runoff drainage',
      'Keep storm drains clear of debris and avoid unnecessary transit into flooded sectors',
      'Keep local emergency contacts handy (112 Police, 108 Ambulance, 101 Fire)',
      'Check FloodWatch live map for road closures before traveling'
    ],
    coordinates: {
      latitude,
      longitude,
    }
  };
};

export default { assessRisk };
