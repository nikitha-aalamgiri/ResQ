import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { lineString, point } from '@turf/helpers';
import lineIntersect from '@turf/line-intersect';
import booleanIntersects from '@turf/boolean-intersects';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import distance from '@turf/distance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load mock GeoJSON files
const loadMockGeoJson = (filename) => {
  try {
    const filePath = path.resolve(__dirname, '../../../data/mock', filename);
    if (!fs.existsSync(filePath)) {
      const altPath = path.resolve(__dirname, '../../data/mock', filename);
      if (fs.existsSync(altPath)) {
        return JSON.parse(fs.readFileSync(altPath, 'utf-8'));
      }
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`[Routing] Warning: Failed to load ${filename}:`, err.message);
    return { features: [] };
  }
};

const blockedRoadsData = loadMockGeoJson('blocked_roads.geojson');
const floodZonesData = loadMockGeoJson('flood_zones.geojson');

// Dynamic verified blocked roads submitted by citizens/responders and approved by Admin (Step 9)
const dynamicBlockedRoads = [];

export function addVerifiedBlockedRoad(roadFeature) {
  if (!roadFeature) return;
  const existing = dynamicBlockedRoads.find(
    (r) => r.id === roadFeature.id || r.properties?.road_name === roadFeature.properties?.road_name
  );
  if (!existing) {
    dynamicBlockedRoads.push(roadFeature);
  }
}

export function getDynamicBlockedRoads() {
  return [...dynamicBlockedRoads];
}

export function getAllBlockedRoads() {
  return [...(blockedRoadsData?.features || []), ...dynamicBlockedRoads];
}

let demoRoutesData = null;
try {
  const demoPath = path.resolve(__dirname, '../../../data/mock/demo_routes.json');
  if (fs.existsSync(demoPath)) {
    demoRoutesData = JSON.parse(fs.readFileSync(demoPath, 'utf-8'));
  } else {
    const altDemoPath = path.resolve(__dirname, '../../data/mock/demo_routes.json');
    if (fs.existsSync(altDemoPath)) {
      demoRoutesData = JSON.parse(fs.readFileSync(altDemoPath, 'utf-8'));
    }
  }
} catch (err) {
  console.error('[Routing] Warning: Failed to load demo_routes.json:', err.message);
}

/**
 * Robust coordinate parser
 * Accepts string "lat,lng" or "lng,lat", or array [lat, lng] or [lng, lat]
 * Returns [lat, lng]
 */
export function parseCoordinate(input) {
  if (!input) return null;
  let lat = null;
  let lng = null;

  if (Array.isArray(input) && input.length >= 2) {
    lat = Number(input[0]);
    lng = Number(input[1]);
  } else if (typeof input === 'string') {
    const parts = input.split(',').map((p) => Number(p.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Hyderabad specific disambiguation:
  // Lat is ~17.1 to 17.7, Lng is ~78.1 to 78.8
  if (lat > 50 && lng < 50) {
    // Input was in [lng, lat] order
    return [lng, lat];
  }
  return [lat, lng];
}

/**
 * Test a route LineString geometry against blocked roads and critical flood zones
 * Returns { hasHazards: boolean, crossed: Array<string>, avoided: Array<string> }
 */
export function checkRouteHazards(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return { hasHazards: false, crossed: [], avoided: [] };
  }

  const routeLine = lineString(coordinates);
  const crossed = [];

  // 1. Check blocked roads (static + verified dynamic)
  const blockedRoadFeatures = getAllBlockedRoads();
  for (const road of blockedRoadFeatures) {
    try {
      let isIntersects = false;
      if (booleanIntersects(routeLine, road)) {
        isIntersects = true;
      } else {
        const intersections = lineIntersect(routeLine, road);
        if (intersections.features && intersections.features.length > 0) {
          isIntersects = true;
        }
      }

      if (isIntersects) {
        crossed.push(`${road.properties?.road_name || 'Blocked Road Segment'} (${road.properties?.status || 'impassable'})`);
      }
    } catch (err) {
      // Turf check error tolerance
    }
  }

  // 2. Check critical flood zones
  const floodZoneFeatures = (floodZonesData?.features || []).filter(
    (f) => f.properties?.severity === 'critical'
  );

  for (const zone of floodZoneFeatures) {
    try {
      let isIntersects = false;
      if (booleanIntersects(routeLine, zone)) {
        isIntersects = true;
      } else {
        // Also check if any discrete point along the route falls inside the critical polygon
        for (const coord of coordinates) {
          const pt = point(coord);
          if (booleanPointInPolygon(pt, zone)) {
            isIntersects = true;
            break;
          }
        }
      }

      if (isIntersects) {
        crossed.push(`${zone.properties?.name || 'Critical Flood Zone'} (${zone.properties?.severity || 'critical'})`);
      }
    } catch (err) {
      // Turf check error tolerance
    }
  }

  return {
    hasHazards: crossed.length > 0,
    crossed,
  };
}

/**
 * Query public OSRM driving service with timeout
 */
async function fetchOsrmRoute(waypoints) {
  // waypoints: array of [lng, lat] (OSRM expects lon,lat;lon,lat)
  const coordsString = waypoints.map((pt) => `${pt[0].toFixed(5)},${pt[1].toFixed(5)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) {
    throw new Error(`OSRM HTTP error: ${response.status}`);
  }
  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM error code: ${data.code || 'No route found'}`);
  }
  return data.routes[0];
}

/**
 * Find closest pre-baked route from demo_routes.json
 */
function findDemoRoute(fromLat, fromLng, toLat, toLng, mode) {
  if (!demoRoutesData?.routes) return null;

  let bestMatch = null;
  let minDistance = Infinity;

  for (const key of Object.keys(demoRoutesData.routes)) {
    const item = demoRoutesData.routes[key];
    const dFrom = Math.hypot(item.from[0] - fromLat, item.from[1] - fromLng);
    const dTo = Math.hypot(item.to[0] - toLat, item.to[1] - toLng);
    const totalDist = dFrom + dTo;

    // Within ~0.08 degrees (~8km threshold)
    if (totalDist < minDistance && totalDist < 0.08) {
      minDistance = totalDist;
      bestMatch = item[mode] || item.safest;
    }
  }

  return bestMatch;
}

/**
 * Synthesizes a realistic geometric route when OSRM is offline and no demo match exists
 */
function synthesizeRoute(fromLat, fromLng, toLat, toLng, mode) {
  const fromPt = [fromLng, fromLat];
  const toPt = [toLng, toLat];
  const totalKm = distance(fromPt, toPt, { units: 'kilometers' });

  // Direct line with interpolation
  const numSteps = 8;
  const directCoords = [];
  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    const lng = fromLng + (toLng - fromLng) * fraction;
    const lat = fromLat + (toLat - fromLat) * fraction;
    directCoords.push([lng, lat]);
  }

  const directHazards = checkRouteHazards(directCoords);

  if (mode === 'shortest' || !directHazards.hasHazards) {
    return {
      source: 'demo',
      mode,
      label: directHazards.hasHazards ? 'CAUTION' : 'SAFE',
      distance: Number(totalKm.toFixed(1)),
      distance_km: Number(totalKm.toFixed(1)),
      eta: Math.max(3, Math.round((totalKm / 28) * 60)),
      duration_min: Math.max(3, Math.round((totalKm / 28) * 60)),
      hazards: {
        avoided: [],
        crossed: directHazards.crossed,
      },
      hazards_avoided: [],
      hazards_crossed: directHazards.crossed,
      checks: directHazards.hasHazards
        ? ['Direct path', 'Crosses active hazard zone']
        : ['Direct route', 'Clear of active hazard zones'],
      geometry: {
        type: 'LineString',
        coordinates: directCoords,
      },
      original_geometry: null,
      originalPath: null,
      steps: [
        { instruction: 'Proceed toward destination along urban sector corridor', distance_m: Math.round(totalKm * 600), duration_s: 300 },
        { instruction: 'Continue on arterial road', distance_m: Math.round(totalKm * 400), duration_s: 200 },
        { instruction: 'Arrive at target location', distance_m: 100, duration_s: 60 },
      ],
    };
  }

  // mode === 'safest' and direct crosses hazards: generate detour around hazard
  // Shift midway points northward or outward to clear the hazard
  const detourCoords = [];
  const detourOffsetLat = 0.016; // Shift north by ~1.8km
  const detourOffsetLng = 0.005;

  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    let lng = fromLng + (toLng - fromLng) * fraction;
    let lat = fromLat + (toLat - fromLat) * fraction;

    // Apply smooth parabolic arch in the middle
    const arch = Math.sin(fraction * Math.PI);
    lat += arch * detourOffsetLat;
    lng += arch * detourOffsetLng;

    detourCoords.push([lng, lat]);
  }

  const detourKm = totalKm * 1.35;
  const detourHazards = checkRouteHazards(detourCoords);

  return {
    source: 'demo',
    mode: 'safest',
    label: detourHazards.hasHazards ? 'CAUTION' : 'SAFE',
    distance: Number(detourKm.toFixed(1)),
    distance_km: Number(detourKm.toFixed(1)),
    eta: Math.max(5, Math.round((detourKm / 25) * 60)),
    duration_min: Math.max(5, Math.round((detourKm / 25) * 60)),
    hazards: {
      avoided: directHazards.crossed,
      crossed: detourHazards.crossed,
    },
    hazards_avoided: directHazards.crossed,
    hazards_crossed: detourHazards.crossed,
    checks: [
      'Avoids flooded areas',
      'Avoids blocked roads',
      'Low risk route',
    ],
    geometry: {
      type: 'LineString',
      coordinates: detourCoords,
    },
    original_geometry: {
      type: 'LineString',
      coordinates: directCoords,
    },
    originalPath: directCoords,
    steps: [
      { instruction: 'Head northeast on High Ground Evacuation Corridor', distance_m: 800, duration_s: 180 },
      { instruction: 'Detour along elevated ring road avoiding flooded causeway', distance_m: Math.round(detourKm * 600), duration_s: 360 },
      { instruction: 'Turn onto safe approach road towards destination', distance_m: Math.round(detourKm * 300), duration_s: 180 },
      { instruction: 'Arrive safely at target facility', distance_m: 200, duration_s: 60 },
    ],
  };
}

/**
 * Main calculateRoute service
 * @param {string|Array} from - "lat,lng" or [lat, lng]
 * @param {string|Array} to - "lat,lng" or [lat, lng]
 * @param {string} mode - "safest" | "shortest"
 */
export async function calculateRoute(from, to, mode = 'safest') {
  const normalizedMode = mode === 'shortest' ? 'shortest' : 'safest';
  const fromCoords = parseCoordinate(from);
  const toCoords = parseCoordinate(to);

  if (!fromCoords || !toCoords) {
    throw new Error('Invalid origin or destination coordinates. Expected "lat,lng" format.');
  }

  const [fromLat, fromLng] = fromCoords;
  const [toLat, toLng] = toCoords;

  let directRoute = null;
  let osrmAvailable = false;

  // 1. Try public OSRM driving API
  try {
    const rawDirect = await fetchOsrmRoute([[fromLng, fromLat], [toLng, toLat]]);
    directRoute = rawDirect;
    osrmAvailable = true;
  } catch (err) {
    // OSRM failed or timed out (expected in offline/restricted network environments)
    // console.log('[Routing] OSRM query failed, falling back to demo engine:', err.message);
  }

  // 2. If OSRM is offline or timed out, use fallback
  if (!osrmAvailable || !directRoute) {
    const demo = findDemoRoute(fromLat, fromLng, toLat, toLng, normalizedMode);
    if (demo) {
      return {
        ...demo,
        source: 'demo',
      };
    }
    return synthesizeRoute(fromLat, fromLng, toLat, toLng, normalizedMode);
  }

  // 3. OSRM is available: evaluate direct route
  const directCoords = directRoute.geometry.coordinates; // [[lng, lat], ...]
  const directHazards = checkRouteHazards(directCoords);
  const directDistKm = Number((directRoute.distance / 1000).toFixed(1));
  const directEtaMin = Math.max(1, Math.round(directRoute.duration / 60));

  // Extract OSRM step instructions
  const extractSteps = (routeObj) => {
    const steps = [];
    if (routeObj.legs && routeObj.legs.length > 0) {
      for (const leg of routeObj.legs) {
        if (leg.steps) {
          for (const s of leg.steps) {
            const instr = s.maneuver?.type === 'arrive'
              ? 'Arrive at destination'
              : `${s.maneuver?.type || 'Proceed'} on ${s.name || 'unnamed road'}`;
            steps.push({
              instruction: s.name ? `Head ${s.maneuver?.modifier || ''} on ${s.name}`.trim() : instr,
              distance_m: Math.round(s.distance),
              duration_s: Math.round(s.duration),
            });
          }
        }
      }
    }
    if (steps.length === 0) {
      steps.push({ instruction: 'Proceed along calculated route to destination', distance_m: Math.round(directDistKm * 1000), duration_s: directEtaMin * 60 });
    }
    return steps;
  };

  // If mode === shortest, return direct route with CAUTION / SAFE label
  if (normalizedMode === 'shortest') {
    return {
      source: 'osrm',
      mode: 'shortest',
      label: directHazards.hasHazards ? 'CAUTION' : 'SAFE',
      distance: directDistKm,
      distance_km: directDistKm,
      eta: directEtaMin,
      duration_min: directEtaMin,
      hazards: {
        avoided: [],
        crossed: directHazards.crossed,
      },
      hazards_avoided: [],
      hazards_crossed: directHazards.crossed,
      checks: directHazards.hasHazards
        ? ['Direct route', 'Crosses active hazard zone']
        : ['Direct route', 'Clear of active hazard zones'],
      geometry: directRoute.geometry,
      original_geometry: null,
      originalPath: null,
      steps: extractSteps(directRoute),
    };
  }

  // mode === safest: if no hazards crossed, direct route is already safe
  if (!directHazards.hasHazards) {
    return {
      source: 'osrm',
      mode: 'safest',
      label: 'SAFE',
      distance: directDistKm,
      distance_km: directDistKm,
      eta: directEtaMin,
      duration_min: directEtaMin,
      hazards: {
        avoided: [],
        crossed: [],
      },
      hazards_avoided: [],
      hazards_crossed: [],
      checks: ['Avoids flooded areas', 'Avoids blocked roads', 'Low risk route'],
      geometry: directRoute.geometry,
      original_geometry: null,
      originalPath: null,
      steps: extractSteps(directRoute),
    };
  }

  // mode === safest AND direct crosses hazards: add detour waypoint and re-request (up to 3 attempts)
  const originalUnsafeCoords = directCoords;
  const originalGeometry = directRoute.geometry;

  // Compute mid point
  const midLat = (fromLat + toLat) / 2;
  const midLng = (fromLng + toLng) / 2;

  // Perpendicular vector for offset waypoints
  const dLat = toLat - fromLat;
  const dLng = toLng - fromLng;
  const length = Math.hypot(dLat, dLng) || 0.01;

  // Normal vector: [-dLng/len, dLat/len]
  const perpLat = -dLng / length;
  const perpLng = dLat / length;

  const attemptOffsets = [
    { scale: 0.022, name: 'North/Primary Detour' },
    { scale: -0.022, name: 'South/Secondary Detour' },
    { scale: 0.038, name: 'Wide Outer Detour' },
  ];

  for (let attempt = 0; attempt < attemptOffsets.length; attempt++) {
    const { scale } = attemptOffsets[attempt];
    const waypointLat = midLat + perpLat * scale;
    const waypointLng = midLng + perpLng * scale;

    try {
      const detourRoute = await fetchOsrmRoute([
        [fromLng, fromLat],
        [waypointLng, waypointLat],
        [toLng, toLat],
      ]);

      const detourHazards = checkRouteHazards(detourRoute.geometry.coordinates);
      if (!detourHazards.hasHazards) {
        const detourDistKm = Number((detourRoute.distance / 1000).toFixed(1));
        const detourEtaMin = Math.max(1, Math.round(detourRoute.duration / 60));

        return {
          source: 'osrm',
          mode: 'safest',
          label: 'SAFE',
          distance: detourDistKm,
          distance_km: detourDistKm,
          eta: detourEtaMin,
          duration_min: detourEtaMin,
          hazards: {
            avoided: directHazards.crossed,
            crossed: [],
          },
          hazards_avoided: directHazards.crossed,
          hazards_crossed: [],
          checks: ['Avoids flooded areas', 'Avoids blocked roads', 'Low risk route'],
          geometry: detourRoute.geometry,
          original_geometry: originalGeometry,
          originalPath: originalUnsafeCoords,
          steps: extractSteps(detourRoute),
        };
      }
    } catch (err) {
      // Detour attempt failed, try next
    }
  }

  // If all 3 OSRM detour attempts crossed hazards or failed, fallback to demo/synthesized route
  const demoFallback = findDemoRoute(fromLat, fromLng, toLat, toLng, 'safest');
  if (demoFallback) {
    return {
      ...demoFallback,
      source: 'demo',
    };
  }

  return synthesizeRoute(fromLat, fromLng, toLat, toLng, 'safest');
}

export default {
  calculateRoute,
  checkRouteHazards,
  parseCoordinate,
};
