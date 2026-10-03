import React, { useState, useRef } from 'react';
import { FloodMap, Layers, Legend } from '../../components/map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import { HYDERABAD_CENTER } from '../../data/mockData';
import { ShieldAlert, Radio, Compass, Building2, Bell, CheckCircle2 } from 'lucide-react';

export const AdminMapPage = () => {
  const mapRef = useRef(null);

  const [layers, setLayers] = useState({
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: true,
    rainfall: true, // Enabled for Admin radar view
  });

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleToggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLocateSEOC = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocating(false);
          mapRef.current?.flyTo(coords[0], coords[1], 14);
          setToast({
            title: 'SEOC Geolocation Locked',
            message: `Terminal positioned at [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`,
            type: 'low'
          });
        },
        (err) => {
          // GPS Denied Fallback
          const fallback = [17.3850, 78.4867];
          setUserLocation(fallback);
          setLocating(false);
          mapRef.current?.flyTo(fallback[0], fallback[1], 14);
          setToast({
            title: 'SEOC Master Headquarters',
            message: 'GPS fallback: Centered on State Disaster Operations Center, Hyderabad.',
            type: 'info'
          });
        },
        { timeout: 5000 }
      );
    } else {
      const fallback = [17.3850, 78.4867];
      setUserLocation(fallback);
      setLocating(false);
      mapRef.current?.flyTo(fallback[0], fallback[1], 14);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in">
          <Toast
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-navy-ink font-mono">
              SEOC UNIFIED GEOSPATIAL COMMAND TERMINAL
            </h2>
            <Badge variant="critical" size="sm">Admin Master</Badge>
          </div>
          <p className="text-xs text-muted-text font-mono">
            State Emergency Operations Center • Integrated Multi-Agency GIS Layer Console
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-text">Active GIS Feeds:</span>
          <Badge variant="teal">7 Feeds Live</Badge>
        </div>
      </div>

      {/* Map + Checklist Panel Layout (Admin Version) */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* Map Canvas */}
        <div className="relative flex-1 w-full">
          <FloodMap
            ref={mapRef}
            layers={layers}
            height="580px"
            center={HYDERABAD_CENTER}
            zoom={12}
            userLocation={userLocation}
            onSelect={(type, data) => setSelectedItem({ type, data })}
          />

          {/* Floating Legend */}
          <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
            <Legend
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              onLocateUser={handleLocateSEOC}
              onResetView={() => mapRef.current?.resetView()}
              locating={locating}
            />
          </div>
        </div>

        {/* Admin Right-Hand Checklist Panel (Requirement 2) */}
        <Layers
          role="admin"
          layers={layers}
          onToggleLayer={handleToggleLayer}
          className="shrink-0"
        />
      </div>

      {/* Inspected Feature Tray */}
      {selectedItem && (
        <Card className="border-app-border animate-in fade-in">
          <CardHeader className="py-2.5 bg-[#FAF9F6] flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              Inspected Item: {selectedItem.data.name || selectedItem.data.id || selectedItem.data.callsign}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
              Dismiss
            </Button>
          </CardHeader>
          <CardContent className="p-3 text-xs text-muted-text font-mono">
            <pre className="overflow-x-auto p-2 bg-app-bg rounded border border-app-border">
              {JSON.stringify(selectedItem.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminMapPage;
