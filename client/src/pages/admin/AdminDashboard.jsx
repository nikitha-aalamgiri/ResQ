import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import { ShieldAlert, RotateCcw, CheckCircle2, Radio, Compass, Building2, Bell, AlertTriangle } from 'lucide-react';
import { FloodMap, Layers, Legend } from '../../components/map';
import { HYDERABAD_CENTER } from '../../data/mockData';

export const AdminDashboard = () => {
  const { profile, user } = useAuth();
  const mapRef = useRef(null);
  const [apiResult, setApiResult] = useState(null);
  const [testingApi, setTestingApi] = useState(false);
  const [toast, setToast] = useState(null);

  // Admin Master GIS Layers
  const [layers, setLayers] = useState({
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: true,
    rainfall: true,
  });

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

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
            message: `Terminal located at [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`,
            type: 'low'
          });
        },
        () => {
          const fallback = [17.3850, 78.4867];
          setUserLocation(fallback);
          setLocating(false);
          mapRef.current?.flyTo(fallback[0], fallback[1], 14);
          setToast({
            title: 'SEOC Master Headquarters',
            message: 'GPS fallback: State Disaster Operations Center, Hyderabad.',
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

  // Test calling protected GET /api/me and /api/admin/system
  const testAdminApi = async () => {
    setTestingApi(true);
    try {
      const meData = await apiFetch('/me');
      const adminData = await apiFetch('/admin/system');
      setApiResult({ success: true, me: meData, admin: adminData });
    } catch (err) {
      setApiResult({ success: false, error: err.message, status: err.status });
    } finally {
      setTestingApi(false);
    }
  };

  useEffect(() => {
    testAdminApi();
  }, []);

  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-navy-ink font-mono">
              SEOC CENTRAL COMMAND // {profile?.full_name || 'Suresh Reddy'}
            </h2>
            <Badge variant="critical" size="sm">Admin Level 4</Badge>
          </div>
          <p className="text-xs text-muted-text mt-1 font-mono">
            Clearance Agency: <span className="text-navy-ink font-semibold">{profile?.agency_name || 'TSDMA State Operations'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={testAdminApi}
            loading={testingApi}
          >
            Verify Admin Clearance (/api/admin/system)
          </Button>
        </div>
      </div>

      {/* Backend API Verification Card */}
      {apiResult && (
        <div className={`p-4 rounded-md border text-xs font-mono ${
          apiResult.success ? 'bg-[#EDF6F1] border-[#C3E4D1] text-[#3B7A57]' : 'bg-[#FDF2F2] border-[#F8D2D0] text-[#B42318]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              ADMINISTRATIVE API VERIFICATION: GET /api/me & /api/admin/system
            </span>
            <Badge variant={apiResult.success ? 'low' : 'critical'} size="sm">
              HTTP {apiResult.success ? '200 OK' : apiResult.status || '500'}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-navy-ink">
            Verified Role: <span className="font-bold">{apiResult.me?.role || 'admin'}</span> | 
            Clearance Level: <span className="text-muted-text">{apiResult.admin?.clearance || 'SEOC Admin'}</span> | 
            Admin Contact: <span className="text-muted-text">{apiResult.me?.email}</span>
          </p>
        </div>
      )}

      {/* High-Level Command Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Total Distress SOS</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">5 Incidents</h4>
            <p className="text-[11px] text-[#B42318] mt-0.5">2 Critical • 2 Assigned • 1 Resolved</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Flood Hazard Zones</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">6 Zones Active</h4>
            <p className="text-[11px] text-[#B54708] mt-0.5">Musi River Basin at 4.2m</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Relief Shelter Total</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">2,540 / 4,500</h4>
            <p className="text-[11px] text-[#3B7A57] mt-0.5">5 Operational Camps</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Impassable Routes</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">3 Blocked</h4>
            <p className="text-[11px] text-muted-text mt-0.5">Moosarambagh causeway closed</p>
          </CardContent>
        </Card>
      </div>

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

      {/* SEOC Geospatial Operations Map Card */}
      <Card className="border-app-border overflow-hidden">
        <CardHeader className="bg-[#FAF9F6] border-b border-app-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>SEOC Live Tactical GIS Command</CardTitle>
                <Badge variant="teal" size="sm">Realtime Telemetry</Badge>
              </div>
              <CardDescription>
                Unified multi-agency spatial feed: flood inundation polygons, live SOS requests, shelters, and impassable routes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/admin/map'}
              >
                Expand Fullscreen GIS Terminal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-start gap-4">
            {/* Map Canvas */}
            <div className="relative flex-1 w-full min-h-[480px]">
              <FloodMap
                ref={mapRef}
                layers={layers}
                height="480px"
                center={HYDERABAD_CENTER}
                zoom={12}
                userLocation={userLocation}
              />

              {/* Floating Legend */}
              <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
                <Legend
                  onZoomIn={() => mapRef.current?.zoomIn()}
                  onZoomOut={() => mapRef.current?.zoomOut()}
                  onLocateUser={handleLocateSEOC}
                  locating={locating}
                />
              </div>
            </div>

            {/* Admin Right-Hand Checklist Panel (Requirement 2 & 4) */}
            <Layers
              role="admin"
              layers={layers}
              onToggleLayer={handleToggleLayer}
              className="shrink-0 w-full lg:w-72"
            />
          </div>
        </CardContent>
      </Card>

      {/* Multi-Agency Deployment Status */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Multi-Agency Rescue Deployment Matrix</CardTitle>
              <CardDescription>NDRF, GHMC Disaster Response Force, and Telangana SDRF units</CardDescription>
            </div>
            <Button variant="danger" size="sm" icon={Bell}>
              Issue Emergency Broadcast Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-app-border text-xs">
            <div className="grid grid-cols-12 px-4 py-2.5 font-semibold text-muted-text uppercase bg-[#FAF9F6]">
              <div className="col-span-4">Agency / Battalion</div>
              <div className="col-span-3">Assigned Lead Officer</div>
              <div className="col-span-3">Operational Zone</div>
              <div className="col-span-2 text-right">Unit Readiness</div>
            </div>
            <div className="grid grid-cols-12 px-4 py-3 items-center">
              <div className="col-span-4 font-medium text-navy-ink">10th Battalion NDRF</div>
              <div className="col-span-3 text-muted-text">Inspector K. Vikram</div>
              <div className="col-span-3 font-mono">Chaderghat & Moosarambagh</div>
              <div className="col-span-2 text-right"><Badge variant="low" size="sm">Active (In Boat)</Badge></div>
            </div>
            <div className="grid grid-cols-12 px-4 py-3 items-center">
              <div className="col-span-4 font-medium text-navy-ink">GHMC DRF Team Alpha</div>
              <div className="col-span-3 text-muted-text">Capt. Ananya Rao</div>
              <div className="col-span-3 font-mono">Begumpet Rasoolpura Nala</div>
              <div className="col-span-2 text-right"><Badge variant="low" size="sm">Active (Rescue Truck)</Badge></div>
            </div>
            <div className="grid grid-cols-12 px-4 py-3 items-center">
              <div className="col-span-4 font-medium text-navy-ink">Telangana SDRF Heavy Unit</div>
              <div className="col-span-3 text-muted-text">SI Rajesh Verma</div>
              <div className="col-span-3 font-mono">Tolichowki & Yousufguda</div>
              <div className="col-span-2 text-right"><Badge variant="low" size="sm">Standby Reserve</Badge></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
