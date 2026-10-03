import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent } from '../../lib/broadcast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Modal, Toast } from '../../components/ui';
import {
  AlertTriangle,
  MapPin,
  Copy,
  Check,
  Building2,
  HeartPulse,
  Compass,
  Phone,
  Radio,
  User,
  Users,
  ChevronLeft,
  LifeBuoy,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createSOSIcon, createResponderIcon } from '../../components/map/mapIcons';

export const IncidentDetailsPage = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  // Claiming / Take state
  const [taking, setTaking] = useState(false);

  // Support Request Modal State (Step 5 & 9)
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportType, setSupportType] = useState('Inflatable Boat Reinforcement');
  const [supportUrgency, setSupportUrgency] = useState('high');
  const [supportNotes, setSupportNotes] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);

  const fetchIncident = async () => {
    try {
      const res = await apiFetch(`/sos/${id}`);
      if (res.success && res.data) {
        setIncident(res.data);
      } else {
        throw new Error(res.error || 'Failed to load incident');
      }
    } catch (err) {
      setToast({
        title: 'Error Loading Incident',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  // Copy coordinates to clipboard
  const handleCopyCoords = () => {
    if (!incident) return;
    const coordsText = `${incident.latitude}, ${incident.longitude}`;
    navigator.clipboard.writeText(coordsText);
    setCopied(true);
    setToast({
      title: 'Coordinates Copied',
      message: `${coordsText} copied to clipboard for GPS navigation`,
      type: 'low',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  // Claim / Assign to Me (Atomic 409 check)
  const handleAssignToMe = async () => {
    setTaking(true);
    try {
      const res = await apiFetch(`/sos/${id}/take`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: `Assigned to ${profile?.full_name || 'Responder Unit'} (${profile?.agency_name || '10th Battalion NDRF'})`,
        }),
      });

      if (res.success) {
        broadcastSOSEvent({
          type: 'SOS_ASSIGNED',
          sosId: id,
          responderId: user?.id,
          responderName: profile?.full_name || 'Rescue Team',
        });

        setToast({
          title: 'Incident Claimed',
          message: `You are now assigned to incident ${id}. Status set to ACCEPTED.`,
          type: 'low',
        });
        fetchIncident();
      }
    } catch (err) {
      // Handles 409 Conflict gracefully per prompt requirements
      const isConflict = err.status === 409 || err.message?.includes('already assigned');
      setToast({
        title: isConflict ? 'Incident Already Assigned' : 'Claim Failed',
        message: isConflict
          ? `Incident already assigned to ${err.data?.assigned_to || 'another rescue unit'}`
          : err.message || 'Another responder has already claimed this incident.',
        type: isConflict ? 'high' : 'critical',
      });
    } finally {
      setTaking(false);
    }
  };

  // Submit Support Request (Step 5 & 9)
  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    setSubmittingSupport(true);
    try {
      const res = await apiFetch('/support-requests', {
        method: 'POST',
        body: JSON.stringify({
          sos_id: id,
          support_type: supportType,
          urgency: supportUrgency,
          notes: supportNotes,
        }),
      });

      if (res.success) {
        setToast({
          title: 'Support Request Dispatched',
          message: `Request for ${supportType} logged in SEOC central dispatch.`,
          type: 'low',
        });
        setSupportModalOpen(false);
        setSupportNotes('');
        fetchIncident();
      }
    } catch (err) {
      setToast({
        title: 'Support Request Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setSubmittingSupport(false);
    }
  };

  if (loading && !incident) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-3 font-mono text-xs text-muted-text">
        <Radio className="w-8 h-8 text-teal-deep animate-pulse mx-auto" />
        <p>Loading incident #{id} telemetry...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-surface border border-app-border rounded-md text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-[#B42318] mx-auto" />
        <h3 className="font-bold text-navy-ink">Incident #{id} Not Found</h3>
        <Button variant="outline" size="sm" onClick={() => navigate('/responder/triage')}>
          Back to Incidents Queue
        </Button>
      </div>
    );
  }

  const isAssignedToMe = incident.assigned_responder_id === user?.id;
  const isAlreadyAssigned = Boolean(incident.assigned_responder_id) && !isAssignedToMe;
  const currentCoords = [incident.latitude, incident.longitude];
  const responderCoords = [17.3780, 78.5020];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
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

      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-md border border-app-border">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            onClick={() => navigate('/responder/triage')}
          >
            Back to Queue
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono font-bold text-lg text-navy-ink">{incident.id}</h2>
              <Badge
                variant={
                  incident.priority === 'critical'
                    ? 'critical'
                    : incident.priority === 'high'
                    ? 'high'
                    : 'medium'
                }
                size="sm"
              >
                {incident.priority?.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="teal" size="sm">
                STATUS: {incident.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-text mt-0.5">
              Citizen: <span className="text-navy-ink font-semibold">{incident.citizen_name}</span> •{' '}
              <a href={`tel:${incident.citizen_phone}`} className="text-teal-deep hover:underline">
                {incident.citizen_phone}
              </a>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Assign to Me Button */}
          {!isAssignedToMe && (
            <Button
              variant="primary"
              size="sm"
              icon={LifeBuoy}
              onClick={handleAssignToMe}
              loading={taking}
              disabled={taking || isAlreadyAssigned}
            >
              {isAlreadyAssigned ? 'Assigned to Other Unit' : 'Assign to Me'}
            </Button>
          )}

          {/* Request Support Button */}
          <Button
            variant="outline"
            size="sm"
            icon={Radio}
            onClick={() => setSupportModalOpen(true)}
          >
            Request Support
          </Button>

          {/* Update Status Button */}
          <Link to={`/responder/incidents/${incident.id}/update`}>
            <Button variant="danger" size="sm" icon={ShieldAlert}>
              Update Status
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Incident Info & Media */}
        <div className="lg:col-span-2 space-y-5">
          {/* Incident Information Card (Requirement 3) */}
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3">
              <CardTitle className="text-sm">Incident Information</CardTitle>
              <CardDescription>Verified telemetry from citizen distress signal</CardDescription>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-app-border text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-muted-text font-medium">Emergency Category:</span>
                <span className="font-bold text-navy-ink text-sm">{incident.emergency_type}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-muted-text font-medium">Persons in Danger:</span>
                <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-navy-ink">
                  <Users className="w-4 h-4 text-teal-deep" />
                  <span>{incident.people_count} {incident.people_count === 1 ? 'person' : 'persons'}</span>
                </div>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-muted-text font-medium">Injuries / Trauma:</span>
                {incident.anyone_injured ? (
                  <Badge variant="critical" size="sm">Yes - Immediate Medical Triage Required</Badge>
                ) : (
                  <Badge variant="low" size="sm">No Injuries Reported</Badge>
                )}
              </div>

              {/* Coordinates with Copy Icon (Requirement 3) */}
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-muted-text font-medium">GPS Coordinates:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-navy-ink font-semibold">
                    {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="p-1 rounded hover:bg-app-bg text-muted-text hover:text-navy-ink transition-colors"
                    title="Copy Coordinates"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#3B7A57]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="py-2.5 flex justify-between items-start gap-4">
                <span className="text-muted-text font-medium shrink-0">Address:</span>
                <span className="text-right text-navy-ink font-medium">{incident.address}</span>
              </div>

              {incident.landmark && (
                <div className="py-2.5 flex justify-between items-start gap-4">
                  <span className="text-muted-text font-medium shrink-0">Landmark:</span>
                  <span className="text-right text-navy-ink">{incident.landmark}</span>
                </div>
              )}

              {incident.special_needs && (
                <div className="py-2.5 flex flex-col gap-1">
                  <span className="text-muted-text font-medium">Special Needs / Situation Description:</span>
                  <p className="p-2.5 bg-app-bg rounded border border-app-border text-navy-ink leading-relaxed font-sans">
                    {incident.special_needs}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media Section (Requirement 3) */}
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3">
              <CardTitle className="text-sm">Scene Media & Photos</CardTitle>
              <CardDescription>On-site citizen uploads & visual assessments</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {incident.photo_url ? (
                <div className="space-y-3">
                  <div className="relative rounded-md overflow-hidden border border-app-border max-h-72 bg-black flex items-center justify-center">
                    <img
                      src={incident.photo_url}
                      alt="Incident scene"
                      className="w-full h-full max-h-72 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white font-mono text-[10px]">
                      Incident #{incident.id} Upload
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-app-border rounded-md bg-app-bg text-muted-text space-y-2">
                  <Camera className="w-6 h-6 mx-auto text-muted-text/60" />
                  <p className="text-xs">No scene photos attached by reporting citizen.</p>
                  <p className="text-[10px] text-muted-text">Field responders can attach photos via the Update Status page.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Mini Map & Nearest Facilities */}
        <div className="space-y-5">
          {/* Mini Map (Requirement 3) */}
          <Card className="border-app-border overflow-hidden">
            <CardHeader className="py-2.5 bg-[#FAF9F6] flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-deep" />
                <CardTitle className="text-xs uppercase font-mono">Incident Mini-Map</CardTitle>
              </div>
              <Link to="/responder/map">
                <Button variant="ghost" size="sm" icon={ExternalLink}>
                  View on Map
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 relative">
              <div className="h-56 w-full">
                <MapContainer
                  center={currentCoords}
                  zoom={13}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CartoDB'
                  />
                  <Marker position={currentCoords} icon={createSOSIcon(incident.priority || 'critical')}>
                    <Popup>
                      <div className="text-xs">
                        <p className="font-bold text-navy-ink">Distress: #{incident.id}</p>
                        <p className="text-muted-text text-[11px]">{incident.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Marker position={responderCoords} icon={createResponderIcon()}>
                    <Popup>
                      <div className="text-xs font-bold text-teal-deep">Your Base Location</div>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[currentCoords, responderCoords]}
                    color="#1F6F78"
                    dashArray="6, 8"
                    weight={2}
                  />
                </MapContainer>
              </div>
              <div className="p-2.5 bg-surface border-t border-app-border text-[11px] flex items-center justify-between font-mono text-muted-text">
                <span>Dist: ~1.2 km</span>
                <span className="text-teal-deep font-semibold">ETA: ~12 mins</span>
              </div>
            </CardContent>
          </Card>

          {/* Nearest Facilities Card (Requirement 3) */}
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3">
              <CardTitle className="text-xs uppercase font-mono">Nearest Facilities & Assets</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3 text-xs">
              {/* Nearest Shelter */}
              <div className="p-2.5 rounded bg-app-bg border border-app-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy-ink flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-deep" />
                    Kotla Vijaya Bhaskara Stadium
                  </span>
                  <Badge variant="low" size="sm">1.4 km</Badge>
                </div>
                <p className="text-[11px] text-muted-text">Relief Camp • Occupancy: 520 / 800 • Desk: 040-23456781</p>
              </div>

              {/* Nearest Hospital */}
              <div className="p-2.5 rounded bg-app-bg border border-app-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy-ink flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-[#B42318]" />
                    Osmania General Hospital
                  </span>
                  <Badge variant="critical" size="sm">0.8 km</Badge>
                </div>
                <p className="text-[11px] text-muted-text">Level 1 Trauma Center • ICU Beds: 14 • Ambulances: 4 Ready</p>
              </div>

              {/* Safe Route Corridor */}
              <div className="p-2.5 rounded bg-[#EDF6F1] border border-[#C3E4D1] text-[#3B7A57] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  <span className="font-semibold text-[11px]">Safe Route Corridor Open</span>
                </div>
                <span className="text-[10px] font-mono">via NH65 Elevated Bypass</span>
              </div>
            </CardContent>
          </Card>

          {/* Incident Timeline Logs Preview */}
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-2.5">
              <CardTitle className="text-xs uppercase font-mono">Incident Status Log</CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-2">
              {(incident.timeline || []).map((log, idx) => (
                <div key={idx} className="pb-2 border-b border-app-border last:border-b-0 space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-navy-ink font-mono text-[11px]">{log.status}</span>
                    <span className="text-[10px] text-muted-text font-mono">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-text leading-snug">{log.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Support Request Modal (Requirement 3 & Step 9 wiring) */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface max-w-md w-full p-5 rounded-lg border border-app-border shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-2.5">
              <div>
                <h3 className="font-bold text-navy-ink text-sm">Request Specialized Field Support</h3>
                <p className="text-[11px] text-muted-text">Incident #{incident.id} • SEOC Command Dispatch</p>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="text-muted-text hover:text-navy-ink p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSupport} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-navy-ink mb-1">Support Asset Type</label>
                <select
                  value={supportType}
                  onChange={(e) => setSupportType(e.target.value)}
                  className="w-full p-2 bg-surface border border-app-border rounded focus:outline-none focus:ring-1 focus:ring-teal-deep text-xs"
                >
                  <option value="Inflatable Boat Reinforcement">Inflatable Boat Reinforcement (NDRF Zodiac)</option>
                  <option value="Advanced Medical Triage / Paramedic">Advanced Medical Triage / Paramedic Unit</option>
                  <option value="SDRF Heavy Winch Truck">SDRF Heavy Winch Truck / Crane</option>
                  <option value="Helicopter Airdrop Basket">IAF / Coast Guard Helicopter Airdrop Basket</option>
                  <option value="Diver Squad">Deep Water Scuba Diver Squad</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-navy-ink mb-1">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['critical', 'high', 'medium'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setSupportUrgency(u)}
                      className={`py-1.5 rounded border text-xs capitalize transition-colors ${
                        supportUrgency === u
                          ? 'border-teal-deep bg-teal-light text-teal-deep font-bold'
                          : 'border-app-border bg-surface text-muted-text'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-navy-ink mb-1">Operational Notes / Reason</label>
                <textarea
                  rows={3}
                  value={supportNotes}
                  onChange={(e) => setSupportNotes(e.target.value)}
                  placeholder="e.g. Current too fast for single zodiac; 4 bed-bound patients on roof."
                  className="w-full p-2.5 bg-surface border border-app-border rounded focus:outline-none focus:ring-1 focus:ring-teal-deep text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-app-border">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  type="submit"
                  loading={submittingSupport}
                >
                  Submit Support Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetailsPage;
