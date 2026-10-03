import React, { useState, useRef } from 'react';
import { FloodMap, Layers, Legend } from '../../components/map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import { HYDERABAD_CENTER } from '../../data/mockData';
import { AlertCircle, MapPin, Building2, Phone, Compass, Info, CheckCircle2 } from 'lucide-react';

export const CitizenMapPage = () => {
  const mapRef = useRef(null);

  const [layers, setLayers] = useState({
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: false,
    rainfall: false,
  });

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [toast, setToast] = useState(null);

  const handleToggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectLocation = (loc) => {
    if (mapRef.current) {
      mapRef.current.flyTo(loc.lat, loc.lng, 15);
    }
    setSelectedEntity({ type: loc.category.toLowerCase(), data: loc.data });
  };

  // Requirement 3: "My location" button with GPS-denied fallback
  const handleLocateUser = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setLocating(false);
          if (mapRef.current) {
            mapRef.current.flyTo(coords[0], coords[1], 15);
          }
          setToast({
            title: 'GPS Location Acquired',
            message: `Centered on your current device coordinates [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`,
            type: 'low'
          });
        },
        (error) => {
          // GPS-Denied Fallback per Requirement 3
          console.warn('[GPS Fallback]:', error.message);
          const fallbackCoords = [17.3750, 78.4867]; // Real Hyderabad civilian location
          setUserLocation(fallbackCoords);
          setLocating(false);
          if (mapRef.current) {
            mapRef.current.flyTo(fallbackCoords[0], fallbackCoords[1], 15);
          }
          setToast({
            title: 'GPS Simulation Fallback',
            message: 'Location access restricted. Centered on Hyderabad Sector civilian coordinates.',
            type: 'info'
          });
        },
        { timeout: 6000 }
      );
    } else {
      const fallbackCoords = [17.3750, 78.4867];
      setUserLocation(fallbackCoords);
      setLocating(false);
      if (mapRef.current) {
        mapRef.current.flyTo(fallbackCoords[0], fallbackCoords[1], 15);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-in fade-in">
          <Toast
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Header & Layer Controls (Citizen Version: Chip row + Search Box) */}
      <div className="bg-surface p-4 rounded-md border border-app-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-navy-ink">Citizen Evacuation & Safety Map</h2>
            <p className="text-xs text-muted-text">
              Real-time spatial visualization of flood corridors, active shelters, emergency hospitals, and impassable routes.
            </p>
          </div>
          <Badge variant="teal">Hyderabad Sector</Badge>
        </div>

        {/* Citizen Layer Chips & Search */}
        <Layers
          role="citizen"
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onSelectLocation={handleSelectLocation}
        />
      </div>

      {/* Map Canvas with Floating Controls */}
      <div className="relative">
        <FloodMap
          ref={mapRef}
          layers={layers}
          height="540px"
          center={HYDERABAD_CENTER}
          zoom={12}
          userLocation={userLocation}
          onSelect={(type, data) => setSelectedEntity({ type, data })}
        />

        {/* Floating Legend with Zoom & Locate Buttons (Bottom Right / Top Right) */}
        <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
          <Legend
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onLocateUser={handleLocateUser}
            locating={locating}
          />
        </div>
      </div>

      {/* Selected Entity Inspector Tray */}
      {selectedEntity && (
        <Card className="border-app-border animate-in fade-in">
          <CardHeader className="bg-[#FAF9F6] py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-text uppercase tracking-wider">
                  Inspected Feature
                </span>
                <Badge variant="teal">{selectedEntity.type}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEntity(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            <h4 className="text-sm font-bold text-navy-ink">
              {selectedEntity.data.name || selectedEntity.data.id}
            </h4>
            <p className="text-muted-text">
              {selectedEntity.data.description || selectedEntity.data.reason || selectedEntity.data.location || selectedEntity.data.address}
            </p>
            {selectedEntity.data.contact && (
              <div className="flex items-center gap-2 pt-1 font-mono text-teal-deep">
                <Phone className="w-3.5 h-3.5" />
                <span>Contact Desk: {selectedEntity.data.contact}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CitizenMapPage;
