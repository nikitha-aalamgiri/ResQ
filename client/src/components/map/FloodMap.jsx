import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  MapContainer,
  Polygon,
  Polyline,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ResQTileLayer, normalizeLatLng, HYDERABAD_BOUNDS } from '../../lib/mapConfig';

import {
  HYDERABAD_CENTER,
  FLOOD_ZONES,
  SHELTERS,
  HOSPITALS,
  BLOCKED_ROADS,
  SOS_INCIDENTS,
  RESCUE_TEAMS
} from '../../data/mockData';
import {
  shelterIcon,
  hospitalIcon,
  createSosIcon,
  responderIcon,
  blockedRoadIcon,
  userLocationIcon
} from './mapIcons';
import { Badge, Button } from '../ui';
import { Phone, Users, AlertTriangle, ExternalLink, ArrowRight, Shield } from 'lucide-react';

/**
 * Controller Component to handle map resize, initial fitBounds, and dynamic fly-to pan/zoom
 */
function MapController({ flyToTarget, onMapReady, initialFitBounds }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }

    // Leaflet in Vite fix: Invalidate size after mount and tab render
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    const container = map.getContainer();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      ro = new ResizeObserver(() => {
        map.invalidateSize();
      });
      ro.observe(container);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (ro && container) ro.disconnect();
    };
  }, [map, onMapReady]);

  // Initial fitBounds to demo area on first load (Part A Requirement 5)
  useEffect(() => {
    if (initialFitBounds && !fittedRef.current && map) {
      fittedRef.current = true;
      try {
        map.fitBounds(HYDERABAD_BOUNDS, { padding: [20, 20], maxZoom: 13 });
      } catch (e) {
        map.setView(HYDERABAD_CENTER, 12);
      }
    }
  }, [map, initialFitBounds]);

  useEffect(() => {
    if (flyToTarget && flyToTarget.lat && flyToTarget.lng) {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 14, {
        duration: 1.2,
      });
    }
  }, [map, flyToTarget]);

  return null;
}

export const FloodMap = forwardRef(({
  layers = {
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: true,
    rainfall: false,
  },
  markers = null,
  route = null,
  routeColor = '#4F46E5', // Indigo as requested
  unsafeRoute = null,
  destination = null,
  destinationLabel = 'Destination',
  height = '500px',
  center = HYDERABAD_CENTER,
  zoom = 12,
  userLocation = null,
  onSelect = null,
  className = '',
  initialFitBounds = true,
}, ref) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Expose imperative flyTo, zoom, resetView, and invalidateSize methods to parent callers
  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoomLevel = 14) => {
      const pos = normalizeLatLng([lat, lng]);
      if (mapInstance && pos) {
        mapInstance.flyTo(pos, zoomLevel, { duration: 1.2 });
      } else if (pos) {
        setFlyToTarget({ lat: pos[0], lng: pos[1], zoom: zoomLevel });
      }
    },
    zoomIn: () => mapInstance?.zoomIn(),
    zoomOut: () => mapInstance?.zoomOut(),
    invalidateSize: () => mapInstance?.invalidateSize(),
    resetView: () => {
      if (mapInstance) {
        try {
          mapInstance.fitBounds(HYDERABAD_BOUNDS, { padding: [20, 20], maxZoom: 13 });
        } catch (e) {
          mapInstance.setView(HYDERABAD_CENTER, 12);
        }
      }
    },
  }));

  const activeZones = layers.zones !== false ? FLOOD_ZONES : [];
  const activeShelters = layers.shelters !== false ? SHELTERS : [];
  const activeHospitals = layers.hospitals !== false ? HOSPITALS : [];
  const activeRoads = layers.roads !== false ? BLOCKED_ROADS : [];
  const activeSos = layers.sos !== false ? SOS_INCIDENTS : [];
  const activeResponders = layers.responders !== false ? RESCUE_TEAMS : [];

  return (
    <div
      className={`relative w-full rounded-md overflow-hidden border border-app-border bg-[#EFECE6] ${className}`}
      style={{ height, minHeight: '350px' }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // We provide custom clean zoom buttons per DESIGN.md
      >
        {/* Single Source of Truth Tile Layer (OSM standard, Esri fallback, Keyed env) */}
        <ResQTileLayer />

        <MapController
          flyToTarget={flyToTarget}
          onMapReady={(m) => setMapInstance(m)}
          initialFitBounds={initialFitBounds}
        />

        {/* 2. Mock Rainfall Intensity Heat Overlay (Admin Toggle) */}
        {layers.rainfall && (
          <>
            <Circle
              center={[17.3750, 78.4900]}
              radius={3500}
              pathOptions={{
                fillColor: '#1F6F78',
                fillOpacity: 0.18,
                stroke: false,
              }}
            />
            <Circle
              center={[17.4420, 78.4720]}
              radius={2800}
              pathOptions={{
                fillColor: '#B42318',
                fillOpacity: 0.20,
                stroke: false,
              }}
            />
          </>
        )}

        {/* 3. Flood Zones: Soft polygons at low opacity matching mockup colors */}
        {activeZones.map((zone) => {
          const isHighRisk = zone.severity === 'critical';
          const isWarning = zone.severity === 'high';
          const isMedium = zone.severity === 'medium';
          const isSafe = zone.severity === 'low';

          const fillColor = isHighRisk
            ? '#B42318'
            : isWarning
            ? '#B54708'
            : isMedium
            ? '#A16207'
            : '#3B7A57';

          return (
            <Polygon
              key={zone.id}
              positions={zone.polygon}
              pathOptions={{
                color: fillColor,
                fillColor: fillColor,
                fillOpacity: isSafe ? 0.15 : 0.25,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onSelect && onSelect('zone', zone),
              }}
            >
              <Popup className="floodwatch-popup">
                <div className="p-1 space-y-1.5 min-w-[200px] text-xs">
                  <div className="flex items-center justify-between border-b border-app-border pb-1">
                    <span className="font-mono font-bold text-navy-ink">{zone.zone_code}</span>
                    <Badge variant={zone.severity}>{zone.severity_label}</Badge>
                  </div>
                  <h4 className="font-semibold text-navy-ink text-sm leading-tight">
                    {zone.name}
                  </h4>
                  <div className="p-2 rounded bg-app-bg text-[11px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-text">Water Level:</span>
                      <span className="font-bold text-navy-ink">{zone.water_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-text">Threshold:</span>
                      <span className="text-muted-text">{zone.threshold}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-text leading-normal">
                    {zone.description}
                  </p>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 4. Blocked Roads: Red Dashed Line + No-Entry Icon */}
        {activeRoads.map((road) => {
          const roadPos = normalizeLatLng(road);
          const poly = (road.polyline || []).map(normalizeLatLng).filter(Boolean);
          return (
            <React.Fragment key={road.id}>
              {poly.length > 0 && (
                <Polyline
                  positions={poly}
                  pathOptions={{
                    color: '#B42318',
                    dashArray: '6, 6',
                    weight: 4,
                    opacity: 0.9,
                  }}
                />
              )}
              {roadPos && (
                <Marker
                  position={roadPos}
                  icon={blockedRoadIcon}
                  eventHandlers={{
                    click: () => onSelect && onSelect('road', road),
                  }}
                >
                  <Popup className="floodwatch-popup">
                    <div className="p-1 space-y-1.5 min-w-[220px] text-xs">
                      <div className="flex items-center justify-between border-b border-app-border pb-1">
                        <Badge variant="critical">Road Blocked</Badge>
                        <span className="text-[10px] text-muted-text font-mono">Choke Point</span>
                      </div>
                      <h4 className="font-bold text-navy-ink text-sm leading-tight">
                        {road.name}
                      </h4>
                      <p className="text-[11px] text-muted-text">{road.area}</p>
                      <div className="p-2 rounded bg-[#FDF2F2] border border-[#F8D2D0] text-[11px] text-[#B42318]">
                        <strong>Obstruction:</strong> {road.reason}
                      </div>
                      <div className="p-2 rounded bg-[#EDF6F1] text-[11px] text-[#3B7A57]">
                        <strong>Recommended Diversion:</strong> {road.divert}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {/* 5. Relief Shelters: Green House Icon */}
        {activeShelters.map((shelter) => {
          const shelterPos = normalizeLatLng(shelter);
          if (!shelterPos) return null;
          const occPct = Math.round(((shelter.occupancy || 0) / (shelter.capacity || 1)) * 100);
          return (
            <Marker
              key={shelter.id}
              position={shelterPos}
              icon={shelterIcon}
              eventHandlers={{
                click: () => onSelect && onSelect('shelter', shelter),
              }}
            >
              <Popup className="floodwatch-popup">
                <div className="p-1 space-y-2 min-w-[240px] text-xs">
                  <div className="flex items-center justify-between border-b border-app-border pb-1">
                    <Badge variant="low" size="sm">Relief Shelter</Badge>
                    <span className="font-mono text-[10px] text-[#3B7A57] font-semibold">
                      {shelter.status === 'open' ? 'OPERATIONAL' : 'NEAR CAPACITY'}
                    </span>
                  </div>
                  <h4 className="font-bold text-navy-ink text-sm leading-tight">
                    {shelter.name}
                  </h4>
                  <p className="text-[11px] text-muted-text">{shelter.location || shelter.address}</p>

                  {/* Capacity / Occupied Progress per Requirement 5 */}
                  <div className="p-2 rounded bg-app-bg border border-app-border space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>Sheltered: <strong>{shelter.occupancy ?? 0}</strong></span>
                      <span className="text-muted-text">Cap: {shelter.capacity ?? 500}</span>
                    </div>
                    <div className="w-full bg-[#E2DED6] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#3B7A57] h-full" style={{ width: `${occPct}%` }}></div>
                    </div>
                    <span className="text-[10px] text-muted-text">{occPct}% Full</span>
                  </div>

                  {/* Supply Chips per Requirement 5 */}
                  {shelter.chips && shelter.chips.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold text-muted-text uppercase tracking-wider block mb-1">
                        Available Relief Stocks
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {shelter.chips.map((chip, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-teal-light text-teal-deep text-[10px] border border-[#c4dcde]">
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between border-t border-app-border">
                    <span className="font-mono text-[10px] text-muted-text">{shelter.contact || shelter.contact_phone}</span>
                    {(shelter.contact || shelter.contact_phone) && (
                      <a
                        href={`tel:${shelter.contact || shelter.contact_phone}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-deep hover:underline"
                      >
                        <Phone className="w-3 h-3" /> Call Desk
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 6. Emergency Hospitals: Red Cross Icon */}
        {activeHospitals.map((hosp) => {
          const hospPos = normalizeLatLng(hosp);
          if (!hospPos) return null;
          return (
            <Marker
              key={hosp.id}
              position={hospPos}
              icon={hospitalIcon}
              eventHandlers={{
                click: () => onSelect && onSelect('hospital', hosp),
              }}
            >
              <Popup className="floodwatch-popup">
                <div className="p-1 space-y-1.5 min-w-[210px] text-xs">
                  <div className="flex items-center justify-between border-b border-app-border pb-1">
                    <Badge variant="critical" size="sm">Emergency Trauma</Badge>
                    <span className="text-[10px] text-[#3B7A57] font-semibold">24/7 OPEN</span>
                  </div>
                  <h4 className="font-bold text-navy-ink text-sm leading-tight">
                    {hosp.name}
                  </h4>
                  <p className="text-[11px] text-muted-text">{hosp.address}</p>

                  <div className="grid grid-cols-2 gap-2 p-2 rounded bg-app-bg text-[11px] font-mono">
                    <div>
                      <span className="text-muted-text block text-[10px]">ICU Beds</span>
                      <span className="font-bold text-navy-ink">{hosp.icu_beds || 0} Free</span>
                    </div>
                    <div>
                      <span className="text-muted-text block text-[10px]">General</span>
                      <span className="font-bold text-navy-ink">{hosp.general_beds || 0} Free</span>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-between items-center border-t border-app-border text-[11px]">
                    <span className="font-mono text-muted-text">{hosp.phone}</span>
                    <a href={`tel:${hosp.phone}`} className="text-teal-deep font-semibold hover:underline">
                      Emergency Call
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 7. SOS Incidents: Colored by priority per Task 1 + Requirement 5 Popup */}
        {activeSos.map((incident) => {
          const sosPos = normalizeLatLng(incident);
          if (!sosPos) return null;
          return (
            <Marker
              key={incident.id}
              position={sosPos}
              icon={createSosIcon(incident.priority)}
              eventHandlers={{
                click: () => onSelect && onSelect('sos', incident),
              }}
            >
              <Popup className="floodwatch-popup">
                <div className="p-1 space-y-2 min-w-[230px] text-xs">
                  <div className="flex items-center justify-between border-b border-app-border pb-1">
                    <span className="font-mono font-bold text-navy-ink">{incident.id}</span>
                    <Badge variant={incident.priority}>{incident.priority}</Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-ink text-sm leading-tight">
                      {incident.type || incident.emergency_type}
                    </h4>
                    <p className="text-[11px] text-muted-text mt-0.5">{incident.location || incident.address}</p>
                  </div>

                  <div className="p-2 rounded bg-app-bg border border-app-border text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-text">Citizen:</span>
                      <span className="font-medium text-navy-ink">{incident.citizen || incident.citizen_name || 'Citizen'}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-muted-text">Trapped:</span>
                      <span className="font-bold text-navy-ink">{incident.people || incident.people_count || 1} Persons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-text">Assigned:</span>
                      <span className="text-teal-deep truncate max-w-[130px]">{incident.assigned || 'Unassigned'}</span>
                    </div>
                  </div>

                  {incident.special && (
                    <p className="text-[11px] text-[#B42318] bg-[#FDF2F2] p-1.5 rounded">
                      <strong>Triage Flag:</strong> {incident.special}
                    </p>
                  )}

                  {/* View / Open Incident Action per Requirement 5 */}
                  <div className="pt-1 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => onSelect && onSelect('sos', incident)}
                    >
                      View Incident Dossier
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 8. Rescue Teams / Responders: Blue Vehicle */}
        {activeResponders.map((team) => {
          const teamPos = normalizeLatLng(team);
          if (!teamPos) return null;
          return (
            <Marker
              key={team.id}
              position={teamPos}
              icon={responderIcon}
              eventHandlers={{
                click: () => onSelect && onSelect('team', team),
              }}
            >
              <Popup className="floodwatch-popup">
                <div className="p-1 space-y-1.5 min-w-[210px] text-xs">
                  <div className="flex items-center justify-between border-b border-app-border pb-1">
                    <Badge variant="teal" size="sm">Rescue Squad</Badge>
                    <span className="font-mono text-[10px] text-teal-deep">ACTIVE</span>
                  </div>
                  <h4 className="font-bold text-navy-ink text-sm leading-tight">
                    {team.callsign || team.name}
                  </h4>
                  <p className="text-[11px] text-muted-text">{team.agency || team.agency_name}</p>
                  <div className="p-2 rounded bg-app-bg text-[11px] font-mono space-y-1">
                    <div>Commander: <strong>{team.commander || team.full_name}</strong></div>
                    <div>Vehicle: {team.vehicle || 'Rescue Vessel'}</div>
                    <div>Mission: {team.status || 'Active Patrol'}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 9a. Original Unsafe Path (Thin grey dashed line when detour is applied) */}
        {unsafeRoute && unsafeRoute.length > 0 && (
          <Polyline
            positions={unsafeRoute.map(normalizeLatLng).filter(Boolean)}
            pathOptions={{
              color: '#6B7280',
              weight: 2.5,
              dashArray: '6, 8',
              opacity: 0.85,
            }}
          />
        )}

        {/* 9b. Active Route Polyline (Indigo #4F46E5) */}
        {route && route.length > 0 && (
          <Polyline
            positions={route.map(normalizeLatLng).filter(Boolean)}
            pathOptions={{
              color: routeColor || '#4F46E5',
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}

        {/* 9c. Optional Explicit Destination Marker */}
        {destination && (() => {
          const destPos = normalizeLatLng(destination);
          if (!destPos) return null;
          return (
            <Marker position={destPos} icon={shelterIcon}>
              <Popup className="floodwatch-popup">
                <div className="p-1 text-xs">
                  <p className="font-bold text-navy-ink">{destinationLabel}</p>
                  <p className="text-[10px] text-muted-text font-mono mt-0.5">
                    Lat: {destPos[0].toFixed(4)}, Lng: {destPos[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })()}

        {/* 10. User Location Marker: Blue Dot with Ring */}
        {userLocation && (() => {
          const userPos = normalizeLatLng(userLocation);
          if (!userPos) return null;
          return (
            <Marker position={userPos} icon={userLocationIcon}>
              <Popup className="floodwatch-popup">
                <div className="p-1 text-xs">
                  <p className="font-bold text-navy-ink">Your Current Location</p>
                  <p className="text-[10px] text-muted-text font-mono mt-0.5">
                    Lat: {userPos[0].toFixed(4)}, Lng: {userPos[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })()}
      </MapContainer>
    </div>
  );
});

FloodMap.displayName = 'FloodMap';
export default FloodMap;
