import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { onSOSEvent } from '../../lib/broadcast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import {
  CheckCircle2,
  Clock,
  Radio,
  Phone,
  Navigation,
  AlertTriangle,
  RotateCcw,
  List,
  ChevronRight,
  ShieldCheck,
  User,
  Users,
  MapPin,
  ExternalLink,
  LifeBuoy
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createSOSIcon, createResponderIcon } from '../../components/map/mapIcons';

export const SOSStatusPage = () => {
  const { id: paramId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [sosId, setSosId] = useState(paramId || null);
  const [sosData, setSosData] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch all citizen requests and select active request
  const fetchCitizenRequests = async () => {
    try {
      const res = await apiFetch('/sos/mine');
      if (res.success && res.data) {
        setMyRequests(res.data);
        if (!paramId && res.data.length > 0) {
          setSosId(res.data[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not fetch citizen requests:', err.message);
    }
  };

  // Fetch specific SOS details
  const fetchSOSDetail = async (idToFetch) => {
    if (!idToFetch) return;
    try {
      const res = await apiFetch(`/sos/${idToFetch}`);
      if (res.success && res.data) {
        setSosData(res.data);
      }
    } catch (err) {
      console.error('Error fetching SOS detail:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitizenRequests();
  }, []);

  useEffect(() => {
    const currentTargetId = paramId || sosId;
    if (currentTargetId) {
      setSosId(currentTargetId);
      fetchSOSDetail(currentTargetId);
    }
  }, [paramId, sosId]);

  // Supabase Realtime Subscription + Polling Fallback + Cross-Window Instant Sync
  useEffect(() => {
    if (!sosId) return;

    // Instant cross-window sync
    const unsubscribeBus = onSOSEvent((event) => {
      if (event.sosId === sosId || event.type === 'SOS_STATUS_CHANGED' || event.type === 'SOS_ASSIGNED') {
        fetchSOSDetail(sosId);
        setToast({
          title: 'Live Telemetry Update',
          message: `Emergency response status: ${event.status || 'Assigned to Responder Unit'}`,
          type: 'low'
        });
      }
    });

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel(`public:sos_requests:id=eq.${sosId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_requests', filter: `id=eq.${sosId}` },
        (payload) => {
          fetchSOSDetail(sosId);
          setToast({
            title: 'Live Telemetry Update',
            message: `SOS status updated: ${payload.new?.status || 'Active'}`,
            type: 'low'
          });
        }
      )
      .subscribe();

    // 2. High-Frequency Polling Fallback (handles mock drill mode updates)
    const interval = setInterval(() => {
      fetchSOSDetail(sosId);
    }, 4000);

    return () => {
      unsubscribeBus();
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [sosId]);

  if (loading && !sosData) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-3">
        <Radio className="w-8 h-8 text-teal-deep animate-pulse mx-auto" />
        <p className="font-mono text-xs text-muted-text">Connecting to SEOC Distress Feed...</p>
      </div>
    );
  }

  if (!sosData && !loading) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-surface border border-app-border rounded-md text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-[#B42318] mx-auto" />
        <h3 className="font-bold text-navy-ink">No Active SOS Request Found</h3>
        <p className="text-xs text-muted-text">
          You currently have no emergency requests registered in the Hyderabad command center.
        </p>
        <Link to="/citizen/sos">
          <Button variant="danger" size="md">
            Trigger Emergency SOS
          </Button>
        </Link>
      </div>
    );
  }

  // Determine current timeline status
  const currentStatus = sosData.status?.toUpperCase() || 'WAITING';
  const isAssigned = ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ARRIVED'].includes(currentStatus);
  const isArrived = ['ARRIVED', 'IN_PROGRESS', 'RESOLVED'].includes(currentStatus);
  const isRescued = ['RESOLVED'].includes(currentStatus);

  // Coordinates
  const citizenCoords = [sosData.latitude || 17.3750, sosData.longitude || 78.4867];
  const responderCoords = sosData.responder?.current_coords || [
    citizenCoords[0] + 0.007,
    citizenCoords[1] - 0.005,
  ];

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-16">
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

      {/* Incident Status Top Bar */}
      <div className="bg-surface p-4 rounded-md border border-app-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-text font-mono uppercase">Incident ID:</span>
            <span className="font-mono font-bold text-lg text-navy-ink">{sosData.id}</span>
            <Badge
              variant={
                sosData.priority === 'critical' ? 'critical' : sosData.priority === 'high' ? 'high' : 'medium'
              }
              size="sm"
            >
              {sosData.priority?.toUpperCase()} PRIORITY
            </Badge>
          </div>
          <p className="text-[11px] text-muted-text mt-0.5">
            Reported: {new Date(sosData.created_at).toLocaleTimeString()} • {sosData.address}
          </p>
        </div>

        {/* My Requests List Button (Requirement 5) */}
        <Button
          variant="outline"
          size="sm"
          icon={List}
          onClick={() => setShowHistoryModal(true)}
        >
          My Requests ({myRequests.length})
        </Button>
      </div>

      {/* Mini-Map: Your Location & Assigned Responder Telemetry (Requirement 5) */}
      <Card className="border-app-border overflow-hidden">
        <CardHeader className="py-2.5 bg-[#FAF9F6] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-deep" />
            <CardTitle className="text-xs font-mono uppercase">Live Extraction Telemetry Map</CardTitle>
          </div>
          {isAssigned && (
            <Badge variant="low" mono size="sm">
              Distance: {sosData.responder?.distance_km || '1.1'} km away
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0 relative">
          <div className="h-52 w-full">
            <MapContainer
              center={citizenCoords}
              zoom={14}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CartoDB'
              />
              {/* Citizen Marker */}
              <Marker position={citizenCoords} icon={createSOSIcon(sosData.priority || 'critical')}>
                <Popup>
                  <div className="text-xs font-sans">
                    <p className="font-bold text-navy-ink">Your SOS Position</p>
                    <p className="text-muted-text text-[11px]">{sosData.address}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Responder Marker if Assigned */}
              {isAssigned && (
                <>
                  <Marker position={responderCoords} icon={createResponderIcon()}>
                    <Popup>
                      <div className="text-xs font-sans">
                        <p className="font-bold text-teal-deep">Assigned Rescue Unit</p>
                        <p className="text-[11px]">{sosData.responder?.unit || 'NDRF Boat Unit'}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[citizenCoords, responderCoords]}
                    color="#0284C7"
                    dashArray="5, 8"
                    weight={2}
                  />
                </>
              )}
            </MapContainer>
          </div>

          <div className="p-2.5 bg-surface border-t border-app-border text-[11px] flex items-center justify-between text-muted-text font-mono">
            <span>Citizen: [{citizenCoords[0].toFixed(4)}, {citizenCoords[1].toFixed(4)}]</span>
            {isAssigned && (
              <span className="text-teal-deep font-semibold">
                ETA: {sosData.responder?.eta_minutes || 12} mins
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* VERTICAL TIMELINE (Requirement 5) */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Rescue Deployment Timeline</CardTitle>
            <span className="text-[11px] text-teal-deep flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#3B7A57] animate-pulse" />
              Live Realtime Feed
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2DED6]">
            
            {/* Step 1: Request Sent */}
            <div className="relative">
              <span className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-[#3B7A57] text-white flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-navy-ink text-sm">1. Request Sent & Logged</h4>
                  <span className="text-[10px] font-mono text-muted-text">
                    {new Date(sosData.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-muted-text mt-0.5">
                  SOS signal received by SEOC Command Center. Priority set to{' '}
                  <span className="font-semibold uppercase text-navy-ink">{sosData.priority}</span>.
                </p>
              </div>
            </div>

            {/* Step 2: Responder Assigned */}
            <div className="relative">
              <span className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center ${
                isAssigned ? 'bg-[#3B7A57] text-white' : 'bg-[#E2DED6] text-muted-text animate-pulse'
              }`}>
                {isAssigned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-navy-ink text-sm">2. Responder Assigned</h4>
                  {isAssigned && (
                    <Badge variant="teal" size="sm">En Route</Badge>
                  )}
                </div>

                {/* Assigned Card with Team Alpha (Matching Mockup Requirement) */}
                {isAssigned ? (
                  <div className="mt-2.5 p-3.5 rounded-md border border-[#C4DCDE] bg-[#F0F7F7] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-deep text-xs">
                        Team Alpha is on the way, ETA: {sosData.responder?.eta_minutes || 12} minutes
                      </span>
                      <Badge variant="low" size="sm">Active Boat</Badge>
                    </div>
                    <div className="text-[11px] text-navy-ink space-y-1 pt-1 border-t border-[#D5E8EA]">
                      <p><span className="text-muted-text">Battalion:</span> {sosData.responder?.unit || '10th Battalion NDRF'}</p>
                      <p><span className="text-muted-text">Lead Officer:</span> {sosData.responder?.lead || 'Inspector K. Vikram'}</p>
                      <p><span className="text-muted-text">Craft:</span> {sosData.responder?.vehicle || 'Zodiac Inflatable Boat'}</p>
                    </div>
                    <div className="pt-1">
                      <a
                        href={`tel:${sosData.responder?.phone || '+919440011221'}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-deep text-white text-xs font-semibold hover:bg-teal-deep/90 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call Unit Commander ({sosData.responder?.phone || '+91 94400 11221'})
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-text mt-0.5">
                    Command center is assigning the closest water rescue boat. Please remain elevated and keep your phone on.
                  </p>
                )}
              </div>
            </div>

            {/* Step 3: Responder Arrived */}
            <div className="relative">
              <span className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center ${
                isArrived ? 'bg-[#3B7A57] text-white' : 'bg-[#E2DED6] text-muted-text'
              }`}>
                {isArrived ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              </span>
              <div>
                <h4 className={`text-sm font-bold ${isArrived ? 'text-navy-ink' : 'text-muted-text'}`}>
                  3. Responder Arrived
                </h4>
                <p className="text-xs text-muted-text mt-0.5">
                  {isArrived
                    ? 'Unit is on-site at your coordinates preparing extraction rigging.'
                    : 'Rescue craft will sound horn and signal with strobe lights upon arrival.'}
                </p>
              </div>
            </div>

            {/* Step 4: Rescued / Safe */}
            <div className="relative">
              <span className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center ${
                isRescued ? 'bg-[#3B7A57] text-white' : 'bg-[#E2DED6] text-muted-text'
              }`}>
                {isRescued ? <ShieldCheck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              </span>
              <div>
                <h4 className={`text-sm font-bold ${isRescued ? 'text-[#3B7A57]' : 'text-muted-text'}`}>
                  4. Rescued & Transferred
                </h4>
                <p className="text-xs text-muted-text mt-0.5">
                  {isRescued
                    ? 'Successfully extracted and transferred to designated safe relief shelter.'
                    : 'Safe transport to nearest operational relief camp.'}
                </p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Emergency Guidance Strip */}
      <div className="p-3.5 rounded-md bg-[#FAF9F6] border border-app-border text-xs text-muted-text space-y-1">
        <p className="font-semibold text-navy-ink">Critical Safety Reminders:</p>
        <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
          <li>Do not enter moving water to meet the boat; wait until secured by lifeline.</li>
          <li>Wave a brightly colored cloth or phone flashlight if light conditions dim.</li>
          <li>Keep infants, elderly, and medical supplies closest to the extraction hatch.</li>
        </ul>
      </div>

      {/* "My Requests" Modal Drawer (Requirement 5) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3 animate-in fade-in">
          <div className="bg-surface w-full max-w-md rounded-lg border border-app-border shadow-lg overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-app-border flex items-center justify-between bg-[#FAF9F6]">
              <div>
                <h3 className="font-bold text-navy-ink text-sm">My SOS Requests History</h3>
                <p className="text-[11px] text-muted-text">All distress calls dispatched from this device</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-muted-text hover:text-navy-ink text-xs font-bold px-2 py-1"
              >
                Close
              </button>
            </div>
            <div className="p-3 overflow-y-auto divide-y divide-app-border">
              {myRequests.length === 0 ? (
                <p className="text-xs text-muted-text text-center py-6">No previous SOS requests recorded.</p>
              ) : (
                myRequests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => {
                      setSosId(req.id);
                      setShowHistoryModal(false);
                      navigate(`/citizen/sos/${req.id}`);
                    }}
                    className={`w-full p-3 text-left hover:bg-app-bg transition-colors flex items-center justify-between ${
                      req.id === sosId ? 'bg-teal-light/30' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-navy-ink">{req.id}</span>
                        <Badge
                          variant={req.priority === 'critical' ? 'critical' : req.priority === 'high' ? 'high' : 'medium'}
                          size="sm"
                        >
                          {req.priority}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-text mt-1">{req.emergency_type} • {req.address}</p>
                      <p className="text-[10px] text-muted-text font-mono">{new Date(req.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={req.status === 'ASSIGNED' ? 'teal' : req.status === 'WAITING' ? 'high' : 'low'} size="sm">
                      {req.status}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSStatusPage;
