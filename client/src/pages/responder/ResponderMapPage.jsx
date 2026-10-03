import React, { useState, useRef } from 'react';
import { FloodMap, Layers, Legend } from '../../components/map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Modal, Toast } from '../../components/ui';
import { HYDERABAD_CENTER, SOS_INCIDENTS } from '../../data/mockData';
import { Radio, Phone, Users, AlertTriangle, Send, CheckCircle2, Shield, Navigation } from 'lucide-react';

export const ResponderMapPage = () => {
  const mapRef = useRef(null);

  const [layers, setLayers] = useState({
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: true,
    rainfall: false,
  });

  const [userLocation, setUserLocation] = useState([17.3780, 78.5020]); // NDRF Unit 3 base
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
          setToast({
            title: 'Responder Telemetry Acquired',
            message: `Unit GPS locked at [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`,
            type: 'low'
          });
        },
        (err) => {
          // GPS Denied Fallback
          const fallback = [17.3780, 78.5020];
          setUserLocation(fallback);
          setLocating(false);
          mapRef.current?.flyTo(fallback[0], fallback[1], 15);
          setToast({
            title: 'Responder Base Fallback',
            message: 'GPS unavailable. Centered on NDRF Boat Unit 3 deployment coordinates.',
            type: 'info'
          });
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

  // Called when popup or list clicks an incident
  const handleSelectIncident = (type, item) => {
    if (type === 'sos') {
      setSelectedIncident(item);
      setModalOpen(true);
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

      {/* Header & Responder Quick Layer Toggles */}
      <div className="bg-surface p-4 rounded-md border border-app-border space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-navy-ink font-mono">
                TACTICAL INCIDENT DISPATCH MAP
              </h2>
              <Badge variant="high" size="sm">Field Live</Badge>
            </div>
            <p className="text-xs text-muted-text font-mono">
              Live distress telemetry • Click any red marker to open incident dossier
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-text font-mono">Nearby Incidents:</span>
            <Badge variant="critical" mono>3 Active</Badge>
          </div>
        </div>

        {/* Responder Compact Toggles */}
        <Layers
          role="responder"
          layers={layers}
          onToggleLayer={handleToggleLayer}
        />
      </div>

      {/* Map View */}
      <div className="relative">
        <FloodMap
          ref={mapRef}
          layers={layers}
          height="550px"
          center={HYDERABAD_CENTER}
          zoom={13}
          userLocation={userLocation}
          onSelect={handleSelectIncident}
        />

        {/* Floating Legend with Controls */}
        <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
          <Legend
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onLocateUser={handleLocateResponder}
            locating={locating}
          />
        </div>
      </div>

      {/* Active Incident Dossier Modal (Requirement 4: "open incident link") */}
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
                  title: 'Incident Claimed',
                  message: `NDRF Rescue Team assigned to ${selectedIncident?.id}`,
                  type: 'low'
                });
                setModalOpen(false);
              }}
            >
              Accept Field Assignment
            </Button>
          </>
        }
      >
        {selectedIncident && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF9F6] rounded-md border border-app-border space-y-1.5">
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
                <span className="font-bold text-[#B42318]">{selectedIncident.people} Individuals</span>
              </div>
            </div>

            <div className="p-2.5 border border-[#F8D2D0] bg-[#FDF2F2] rounded text-[#B42318]">
              <strong>Special Triage Need:</strong> {selectedIncident.special}
            </div>

            <div className="p-2 border border-app-border rounded bg-app-bg text-[11px] font-mono">
              GPS Coordinates: {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResponderMapPage;
