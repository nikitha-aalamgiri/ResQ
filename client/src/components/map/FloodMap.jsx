import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
 * Controller Component to handle map resize and dynamic fly-to pan/zoom
 */
function MapController({ flyToTarget, onMapReady }) {
  const map = useMap();

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
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map, onMapReady]);

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
}, ref) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Expose imperative flyTo and zoom methods to parent callers
  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoomLevel = 14) => {
      if (mapInstance) {
        mapInstance.flyTo([lat, lng], zoomLevel, { duration: 1.2 });
      } else {
        setFlyToTarget({ lat, lng, zoom: zoomLevel });
      }
    },
    zoomIn: () => mapInstance?.zoomIn(),
    zoomOut: () => mapInstance?.zoomOut(),
    invalidateSize: () => mapInstance?.invalidateSize(),
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
        {/* 1. Calm Light Basemap (CartoDB Positron) per Task 1 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapController
          flyToTarget={flyToTarget}
          onMapReady={(m) => setMapInstance(m)}
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
        {activeRoads.map((road) => (
          <React.Fragment key={road.id}>
            <Polyline
              positions={road.polyline}
              pathOptions={{
                color: '#B42318',
                dashArray: '6, 6',
                weight: 4,
                opacity: 0.9,
              }}
            />
            <Marker
              position={[road.lat, road.lng]}
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
          </React.Fragment>
        ))}

        {/* 5. Relief Shelters: Green House Icon + Requirement 5 Popup */}
        {activeShelters.map((shelter) => {
          const occPct = Math.round((shelter.occupancy / shelter.capacity) * 100);
          return (
            <Marker
              key={shelter.id}
              position={[shelter.lat, shelter.lng]}
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
                  <p className="text-[11px] text-muted-text">{shelter.location}</p>

                  {/* Capacity / Occupied Progress per Requirement 5 */}
                  <div className="p-2 rounded bg-app-bg border border-app-border space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>Sheltered: <strong>{shelter.occupancy}</strong></span>
                      <span className="text-muted-text">Cap: {shelter.capacity}</span>
                    </div>
                    <div className="w-full bg-[#E2DED6] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#3B7A57] h-full" style={{ width: `${occPct}%` }}></div>
                    </div>
                    <span className="text-[10px] text-muted-text">{occPct}% Full</span>
                  </div>

                  {/* Supply Chips per Requirement 5 */}
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

                  <div className="pt-1 flex items-center justify-between border-t border-app-border">
                    <span className="font-mono text-[10px] text-muted-text">{shelter.contact}</span>
                    <a
                      href={`tel:${shelter.contact}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-deep hover:underline"
                    >
                      <Phone className="w-3 h-3" /> Call Desk
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 6. Emergency Hospitals: Red Cross Icon */}
        {activeHospitals.map((hosp) => (
          <Marker
            key={hosp.id}
            position={[hosp.lat, hosp.lng]}
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
                    <span className="font-bold text-navy-ink">{hosp.icu_beds} Free</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[10px]">General</span>
                    <span className="font-bold text-navy-ink">{hosp.general_beds} Free</span>
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
        ))}

        {/* 7. SOS Incidents: Colored by priority per Task 1 + Requirement 5 Popup */}
        {activeSos.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lng]}
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
                    {incident.type}
                  </h4>
                  <p className="text-[11px] text-muted-text mt-0.5">{incident.location}</p>
                </div>

                <div className="p-2 rounded bg-app-bg border border-app-border text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-text">Citizen:</span>
                    <span className="font-medium text-navy-ink">{incident.citizen}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-muted-text">Trapped:</span>
                    <span className="font-bold text-navy-ink">{incident.people} Persons</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-text">Assigned:</span>
                    <span className="text-teal-deep truncate max-w-[130px]">{incident.assigned}</span>
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
        ))}

        {/* 8. Rescue Teams / Responders: Blue Vehicle */}
        {activeResponders.map((team) => (
          <Marker
            key={team.id}
            position={[team.lat, team.lng]}
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
                  {team.callsign}
                </h4>
                <p className="text-[11px] text-muted-text">{team.agency}</p>
                <div className="p-2 rounded bg-app-bg text-[11px] font-mono space-y-1">
                  <div>Commander: <strong>{team.commander}</strong></div>
                  <div>Vehicle: {team.vehicle}</div>
                  <div>Mission: {team.status}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 9a. Original Unsafe Path (Thin grey dashed line when detour is applied) */}
        {unsafeRoute && unsafeRoute.length > 0 && (
          <Polyline
            positions={unsafeRoute.map((pt) => {
              if (Array.isArray(pt)) return pt[0] > 50 ? [pt[1], pt[0]] : [pt[0], pt[1]];
              if (pt.lat && pt.lng) return [pt.lat, pt.lng];
              return pt;
            })}
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
            positions={route.map((pt) => {
              if (Array.isArray(pt)) return pt[0] > 50 ? [pt[1], pt[0]] : [pt[0], pt[1]];
              if (pt.lat && pt.lng) return [pt.lat, pt.lng];
              return pt;
            })}
            pathOptions={{
              color: routeColor || '#4F46E5',
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}

        {/* 9c. Optional Explicit Destination Marker */}
        {destination && (
          <Marker
            position={destination[0] > 50 ? [destination[1], destination[0]] : destination}
            icon={shelterIcon}
          >
            <Popup className="floodwatch-popup">
              <div className="p-1 text-xs">
                <p className="font-bold text-navy-ink">{destinationLabel}</p>
                <p className="text-[10px] text-muted-text font-mono mt-0.5">
                  Lat: {(destination[0] > 50 ? destination[1] : destination[0]).toFixed(4)}, Lng: {(destination[0] > 50 ? destination[0] : destination[1]).toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 10. User Location Marker: Blue Dot with Ring */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup className="floodwatch-popup">
              <div className="p-1 text-xs">
                <p className="font-bold text-navy-ink">Your Current Location</p>
                <p className="text-[10px] text-muted-text font-mono mt-0.5">
                  Lat: {userLocation[0].toFixed(4)}, Lng: {userLocation[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
});

FloodMap.displayName = 'FloodMap';
export default FloodMap;
