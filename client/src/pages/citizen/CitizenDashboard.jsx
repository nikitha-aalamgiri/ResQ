import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FloodMap, Layers, Legend } from '../../components/map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import { HYDERABAD_CENTER } from '../../data/mockData';
import { AlertCircle, Building2, MapPin, Phone, ShieldCheck, LifeBuoy, ArrowRight, Compass } from 'lucide-react';

export const CitizenDashboard = () => {
  const { profile, user } = useAuth();
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
  const [toast, setToast] = useState(null);

  const handleToggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectLocation = (loc) => {
    if (mapRef.current) {
      mapRef.current.flyTo(loc.lat, loc.lng, 15);
    }
  };

  const handleLocateUser = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocating(false);
          mapRef.current?.flyTo(coords[0], coords[1], 15);
          setToast({
            title: 'GPS Location Located',
            message: `Centered on your position [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`,
            type: 'low'
          });
        },
        (err) => {
          // GPS Denied Fallback
          const fallback = [17.3750, 78.4867];
          setUserLocation(fallback);
          setLocating(false);
          mapRef.current?.flyTo(fallback[0], fallback[1], 15);
          setToast({
            title: 'Location Fallback',
            message: 'GPS unavailable. Positioned in Hyderabad civilian sector.',
            type: 'info'
          });
        },
        { timeout: 5000 }
      );
    } else {
      const fallback = [17.3750, 78.4867];
      setUserLocation(fallback);
      setLocating(false);
      mapRef.current?.flyTo(fallback[0], fallback[1], 15);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-navy-ink">
              Welcome, {profile?.full_name || 'Resident'}
            </h2>
            <Badge variant="teal" size="sm">Citizen Portal</Badge>
          </div>
          <p className="text-xs text-muted-text mt-1">
            Registered Email: <span className="font-mono text-navy-ink">{user?.email}</span> • Hyderabad Sector
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/citizen/sos">
            <Button variant="danger" size="sm" icon={AlertCircle}>
              Trigger Emergency SOS
            </Button>
          </Link>
        </div>
      </div>

      {/* Flood Safety Advisory Alert */}
      <div className="p-4 rounded-md bg-[#FEF6EE] border border-[#FADCC3] flex items-start gap-3 text-xs">
        <AlertCircle className="w-5 h-5 text-severity-high shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-[#B54708] text-sm">Active Inundation Advisory: Musi River Corridor</h4>
          <p className="text-navy-ink mt-0.5 leading-relaxed">
            Residents in Chaderghat, Moosarambagh, and low-lying nala basins should prepare for regulated evacuation. Do not attempt crossing causeways or underpasses.
          </p>
        </div>
      </div>

      {/* LIVE SHARED MAP COMPONENT (Task 1, 2, 3) */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Live Regional Inundation & Shelter Map</CardTitle>
                <CardDescription>
                  Interactive spatial map of safe shelters, hospitals, flooded zones, and road closures
                </CardDescription>
              </div>
              <Badge variant="teal">Sector Map Live</Badge>
            </div>
            {/* Citizen Layer Chips + Search Box */}
            <Layers
              role="citizen"
              layers={layers}
              onToggleLayer={handleToggleLayer}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          <FloodMap
            ref={mapRef}
            layers={layers}
            height="460px"
            center={HYDERABAD_CENTER}
            zoom={12}
            userLocation={userLocation}
          />
          {/* Legend + Zoom + My Location */}
          <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
            <Legend
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              onLocateUser={handleLocateUser}
              locating={locating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Citizen Operational Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: My SOS Status */}
        <Card className="border-app-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Distress Incident</CardTitle>
              <Badge variant="critical" mono size="sm">FQ1024</Badge>
            </div>
            <CardDescription>Live tracking of submitted emergency request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-app-bg rounded border border-app-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-text">Status:</span>
                <Badge variant="critical" size="sm">Open / In Queue</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-text">Triage Priority:</span>
                <span className="font-bold text-[#B42318]">Critical Priority</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-text">Location:</span>
                <span className="font-medium">Moosarambagh Riverbed</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-text">
              10th Battalion NDRF boat squad is currently en route to your sector. Stay on your elevated floor or terrace.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Nearest Relief Shelter */}
        <Card className="border-app-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nearest Relief Camp</CardTitle>
              <Badge variant="low" size="sm">Open</Badge>
            </div>
            <CardDescription>Designated safe shelter with food and power</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-navy-ink">Kotla Vijaya Bhaskara Reddy Stadium</p>
              <p className="text-muted-text text-[11px]">Yousufguda Main Rd, Hyderabad</p>
            </div>
            <div className="p-2.5 bg-app-bg rounded border border-app-border space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span>Occupancy:</span>
                <span>520 / 800 (65%)</span>
              </div>
              <div className="w-full bg-[#E2DED6] h-1.5 rounded-full overflow-hidden">
                <div className="bg-teal-deep h-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-text text-[11px]">
              <Phone className="w-3.5 h-3.5 text-teal-deep" />
              <span>Camp Desk: +91-9849100001</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Emergency Helplines */}
        <Card className="border-app-border">
          <CardHeader>
            <CardTitle>Emergency Contacts</CardTitle>
            <CardDescription>Government disaster rescue dispatch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-app-bg border border-app-border">
              <span className="font-medium text-navy-ink">National Emergency</span>
              <span className="font-mono font-bold text-teal-deep">112</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-app-bg border border-app-border">
              <span className="font-medium text-navy-ink">Telangana Disaster Control</span>
              <span className="font-mono font-bold text-teal-deep">1070</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-app-bg border border-app-border">
              <span className="font-medium text-navy-ink">GHMC Flood Helpline</span>
              <span className="font-mono font-bold text-teal-deep">040-21111111</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CitizenDashboard;
