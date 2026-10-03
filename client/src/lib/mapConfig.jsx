import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';

/**
 * ResQ Unified Map Tile Configuration & Provider Management
 * Single source of truth for tile providers across the entire application.
 * Replaces CARTO dependency completely.
 */

// Hyderabad Metropolitan Simulation Bounds [South-West, North-East]
export const HYDERABAD_BOUNDS = [
  [17.3000, 78.3000], // SW corner: Rajendranagar / Financial District
  [17.5300, 78.5800], // NE corner: Alwal / Uppal Corridor
];

export const HYDERABAD_CENTER = [17.3850, 78.4867];

/**
 * Registered Tile Providers
 */
export const TILE_PROVIDERS = [
  // Optional Keyed Provider from environment variables (e.g. MapTiler, Stadia)
  ...(import.meta.env.VITE_MAP_TILE_URL ? [{
    id: 'keyed',
    name: 'Custom Keyed Provider',
    url: import.meta.env.VITE_MAP_TILE_URL,
    attribution: import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; Map Provider',
    maxZoom: 19,
  }] : []),

  // Default: OpenStreetMap Standard Tiles (No API key required)
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },

  // Fallback: Esri World Light Gray Canvas
  {
    id: 'esri',
    name: 'Esri World Light Gray',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  }
];

// Active Provider State
let currentProviderIndex = 0;
const providerListeners = new Set();
const tileErrorTimestamps = [];

export function getActiveTileConfig() {
  return TILE_PROVIDERS[currentProviderIndex] || TILE_PROVIDERS[0];
}

export function subscribeTileProvider(callback) {
  providerListeners.add(callback);
  return () => providerListeners.delete(callback);
}

/**
 * Switch to the next available tile provider
 */
export function switchToNextProvider(reason = 'manual') {
  currentProviderIndex = (currentProviderIndex + 1) % TILE_PROVIDERS.length;
  const active = getActiveTileConfig();

  // Dispatch toast notification event to UI shell
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('resq:toast', {
      detail: {
        title: 'Map Source Switched',
        message: `Switched map source to ${active.name}${reason === 'error' ? ' due to tile loading errors' : ''}.`,
        type: 'info'
      }
    }));
  }

  providerListeners.forEach((fn) => {
    try {
      fn(active);
    } catch (e) {
      console.warn('[mapConfig] Listener error:', e);
    }
  });

  return active;
}

/**
 * Record a tile error. If > 8 errors occur within 10 seconds, trigger fallback.
 */
export function recordTileError() {
  const now = Date.now();
  tileErrorTimestamps.push(now);

  // Filter timestamps within the last 10 seconds
  const recentErrors = tileErrorTimestamps.filter((t) => now - t <= 10000);
  tileErrorTimestamps.length = 0;
  tileErrorTimestamps.push(...recentErrors);

  if (recentErrors.length >= 8) {
    console.warn(`[mapConfig] Detected ${recentErrors.length} tile errors within 10s. Switching provider...`);
    tileErrorTimestamps.length = 0; // Reset
    switchToNextProvider('error');
  }
}

/**
 * Normalizes any coordinate representation into Leaflet [lat, lng].
 * Resolves coordinate swap where GeoJSON provides [lng, lat].
 * In Hyderabad Sector: Longitude is ~78.x°E and Latitude is ~17.x°N.
 */
export function normalizeLatLng(coord) {
  if (!coord) return null;
  let lat = null;
  let lng = null;

  if (Array.isArray(coord)) {
    if (coord.length < 2) return null;
    const first = Number(coord[0]);
    const second = Number(coord[1]);
    // If first is longitude (> 50 for Hyderabad region) and second is latitude (< 40)
    if (first > 50 && second < 40) {
      lat = second;
      lng = first;
    } else {
      lat = first;
      lng = second;
    }
  } else if (typeof coord === 'object') {
    const rawLat = coord.lat ?? coord.latitude;
    const rawLng = coord.lng ?? coord.longitude;
    if (rawLat != null && rawLng != null) {
      const numLat = Number(rawLat);
      const numLng = Number(rawLng);
      if (numLat > 50 && numLng < 40) {
        lat = numLng;
        lng = numLat;
      } else {
        lat = numLat;
        lng = numLng;
      }
    }
  }

  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  return [lat, lng];
}

/**
 * Reusable Tile Layer Component for React-Leaflet
 * Subscribes to provider switches and handles tileerror events automatically.
 */
export const ResQTileLayer = () => {
  const [activeConfig, setActiveConfig] = useState(getActiveTileConfig());

  useEffect(() => {
    const unsubscribe = subscribeTileProvider((newConfig) => {
      setActiveConfig(newConfig);
    });
    return unsubscribe;
  }, []);

  const handleTileError = useCallback(() => {
    recordTileError();
  }, []);

  return (
    <TileLayer
      key={activeConfig.id}
      url={activeConfig.url}
      attribution={activeConfig.attribution}
      maxZoom={activeConfig.maxZoom || 19}
      eventHandlers={{
        tileerror: handleTileError,
      }}
    />
  );
};

/**
 * Map View Reset & Invalidation Controller
 * Attaches to map to handle invalidateSize and bounds fitting.
 */
export const MapLifecycleController = ({ resetTrigger, initialFitBounds = true }) => {
  const map = useMap();
  const initializedRef = useRef(false);

  // Invalidate size on mount and after layout shifts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (map) {
        map.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  // Initial fitBounds to demo area
  useEffect(() => {
    if (initialFitBounds && map && !initializedRef.current) {
      initializedRef.current = true;
      try {
        map.fitBounds(HYDERABAD_BOUNDS, { padding: [20, 20], maxZoom: 13 });
      } catch (e) {
        map.setView(HYDERABAD_CENTER, 12);
      }
    }
  }, [map, initialFitBounds]);

  // Respond to reset view trigger
  useEffect(() => {
    if (resetTrigger && map) {
      try {
        map.fitBounds(HYDERABAD_BOUNDS, { padding: [20, 20], maxZoom: 13 });
      } catch (e) {
        map.setView(HYDERABAD_CENTER, 12);
      }
    }
  }, [resetTrigger, map]);

  return null;
};
