import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { FloodMap, Layers, Legend } from '../../components/map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Modal, Toast } from '../../components/ui';
import { HYDERABAD_CENTER } from '../../data/mockData';
import { Radio, Shield, CheckCircle2, RotateCcw, AlertTriangle, MapPin, Users, Phone, Send } from 'lucide-react';

export const ResponderDashboard = () => {
  const { profile, user } = useAuth();
  const mapRef = useRef(null);

  const [apiResult, setApiResult] = useState(null);
  const [testingApi, setTestingApi] = useState(false);
  const [layers, setLayers] = useState({
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: true,
    rainfall: false,
  });
  const [userLocation, setUserLocation] = useState([17.3780, 78.5020]);
  const [locating, setLocating] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const handleToggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLocateResponder = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocating(false);
          mapRef.current?.flyTo(coords[0], coords[1], 15);
        },
        () => {
          const fallback = [17.3780, 78.5020];
          setUserLocation(fallback);
          setLocating(false);
          mapRef.current?.flyTo(fallback[0], fallback[1], 15);
        },
        { timeout: 5000 }
      );
    } else {
      const fallback = [17.3780, 78.5020];
      setUserLocation(fallback);
      setLocating(false);
      mapRef.current?.flyTo(fallback[0], fallback[1], 15);
    }
  };

  // Test calling protected GET /api/me and /api/responder/status
  const testProtectedApi = async () => {
    setTestingApi(true);
    try {
      const meData = await apiFetch('/me');
      const responderData = await apiFetch('/responder/status');
      setApiResult({ success: true, me: meData, responder: responderData });
    } catch (err) {
      setApiResult({ success: false, error: err.message, status: err.status });
    } finally {
      setTestingApi(false);
    }
  };

  useEffect(() => {
    testProtectedApi();
  }, []);

  return (
    <div className="space-y-6">
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

      {/* Unit Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-navy-ink font-mono">
              FIELD CONSOLE // {profile?.full_name || 'Inspector K. Vikram'}
            </h2>
            <Badge variant="high" size="sm">Responder</Badge>
          </div>
          <p className="text-xs text-muted-text mt-1 font-mono">
            Assigned Unit: <span className="text-navy-ink font-semibold">{profile?.agency_name || 'NDRF Battalion 10'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={testProtectedApi}
            loading={testingApi}
          >
            Verify Server Auth (/api/me)
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
              PROTECTED API VERIFICATION: GET /api/me & /api/responder/status
            </span>
            <Badge variant={apiResult.success ? 'low' : 'critical'} size="sm">
              HTTP {apiResult.success ? '200 OK' : apiResult.status || '500'}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-navy-ink">
            Verified Role: <span className="font-bold">{apiResult.me?.role || 'responder'}</span> | 
            User ID: <span className="text-muted-text">{apiResult.me?.id}</span> | 
            Unit Message: <span className="text-muted-text">{apiResult.responder?.message}</span>
          </p>
        </div>
      )}

      {/* LIVE SHARED MAP EMBED ON RESPONDER DASHBOARD */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Field Operations Live Triage Map</CardTitle>
              <CardDescription>
                Real-time situational map of nearby SOS calls, road blockages, and shelters
              </CardDescription>
            </div>
            <Layers
              role="responder"
              layers={layers}
              onToggleLayer={handleToggleLayer}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          <FloodMap
            ref={mapRef}
            layers={layers}
            height="460px"
            center={HYDERABAD_CENTER}
            zoom={13}
            userLocation={userLocation}
            onSelect={(type, item) => {
              if (type === 'sos') {
                setSelectedIncident(item);
                setModalOpen(true);
              }
            }}
          />
          <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
            <Legend
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              onLocateUser={handleLocateResponder}
              locating={locating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Assigned To Unit</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">1 Incident</h4>
            <p className="text-[11px] text-[#B54708] mt-0.5">FQ1025 • Boat Team 3 Deployed</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Open Triage Queue</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">2 Unassigned</h4>
            <p className="text-[11px] text-[#B42318] mt-0.5">Critical Terrace Rescue Needed</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Sector Relief Capacity</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">56% Occupied</h4>
            <p className="text-[11px] text-[#3B7A57] mt-0.5">1,960 beds available in sector</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Triage Priority */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Field Assignment: FQ1025</CardTitle>
              <CardDescription>Direct life-safety triage assigned to your NDRF team</CardDescription>
            </div>
            <Badge variant="high" size="sm">High Priority</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-app-bg rounded border border-app-border space-y-1.5">
              <span className="font-semibold text-navy-ink uppercase text-[10px] tracking-wider">Civilian Details</span>
              <p className="text-sm font-bold text-navy-ink">Lakshmi Narayana</p>
              <p className="text-muted-text font-mono flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-teal-deep" />
                +91-9849033332
              </p>
              <p className="text-muted-text font-mono">Chaderghat, Al-Madina Heights, Flat 202</p>
            </div>
            <div className="p-3 bg-app-bg rounded border border-app-border space-y-1.5">
              <span className="font-semibold text-navy-ink uppercase text-[10px] tracking-wider">Rescue Constraints</span>
              <p className="font-medium text-[#B42318]">Medical Distress: Diabetic insulin requirement</p>
              <p className="text-muted-text">Water level 2.5m on ground floor. Inflatable boat rescue required from 2nd floor balcony.</p>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm">Report Road Obstruction</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedIncident({
                  id: 'FQ1025',
                  citizen: 'Lakshmi Narayana',
                  phone: '+91-9849033332',
                  priority: 'high',
                  type: 'Medical Distress / Insulin Required',
                  location: 'Chaderghat, Al-Madina Heights',
                  people: 2,
                  special: 'Diabetic patient needs refrigerated medication and boat evacuation',
                  lat: 17.3785,
                  lng: 78.4910
                });
                setModalOpen(true);
              }}
            >
              Open Incident Dossier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Incident Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedIncident ? `Triage Dossier: ${selectedIncident.id}` : 'Incident Details'}
        description="Life-safety emergency dispatch record in Hyderabad sector"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => {
                setToast({
                  title: 'Incident Status Updated',
                  message: `Rescue unit deployed to ${selectedIncident?.id}`,
                  type: 'low'
                });
                setModalOpen(false);
              }}
            >
              Update Field Status
            </Button>
          </>
        }
      >
        {selectedIncident && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF9F6] rounded-md border border-app-border space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-navy-ink text-sm">{selectedIncident.citizen}</span>
                <Badge variant={selectedIncident.priority}>{selectedIncident.priority}</Badge>
              </div>
              <p className="font-mono text-muted-text flex items-center gap-1">
                <Phone className="w-3 h-3 text-teal-deep" />
                {selectedIncident.phone}
              </p>
              <p className="text-navy-ink font-medium">{selectedIncident.type}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 border border-app-border rounded bg-surface">
                <span className="text-muted-text block">Location</span>
                <span className="font-medium text-navy-ink">{selectedIncident.location}</span>
              </div>
              <div className="p-2 border border-app-border rounded bg-surface">
                <span className="text-muted-text block">Persons Trapped</span>
                <span className="font-bold text-[#B42318]">{selectedIncident.people} Persons</span>
              </div>
            </div>
            <div className="p-2.5 border border-[#F8D2D0] bg-[#FDF2F2] rounded text-[#B42318]">
              <strong>Special Triage Need:</strong> {selectedIncident.special}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResponderDashboard;
