import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
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
  CheckCircle2,
  Navigation,
  MessageSquare,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { MapContainer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ResQTileLayer } from '../../lib/mapConfig';
import { createSOSIcon, createResponderIcon } from '../../components/map/mapIcons';

export const IncidentDetailsPage = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  // Tab state: 'overview' | 'sms'
  const [activeTab, setActiveTab] = useState('overview');
  const [smsLogs, setSmsLogs] = useState([]);
  const [smsPreviews, setSmsPreviews] = useState([]);
  const [loadingSms, setLoadingSms] = useState(false);

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

  // Fetch SMS Logs & dev preview
  const fetchSmsData = async () => {
    if (!id) return;
    setLoadingSms(true);
    try {
      const res = await apiFetch(`/sos/${id}/sms-logs`);
      if (res && res.success) {
        setSmsLogs(res.data || []);
      }
      // If admin, fetch rendered dev preview text
      try {
        const devRes = await apiFetch(`/dev/sms-preview/${id}`);
        if (devRes && devRes.success) {
          setSmsPreviews(devRes.previews || []);
        }
      } catch (_e) {
        // Dev preview may only be available for admins or non-prod
      }
    } catch (err) {
      console.warn('Could not fetch SMS logs:', err.message);
    } finally {
      setLoadingSms(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    fetchSmsData();
  }, [id]);

  // Realtime subscription for sms_logs
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`incident-sms-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sms_logs', filter: `sos_id=eq.${id}` },
        () => {
          fetchSmsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
            onClick={() => navigate(profile?.role === 'admin' ? '/admin/dispatch' : '/responder/triage')}
          >
            {profile?.role === 'admin' ? 'Back to Dispatch' : 'Back to Queue'}
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

          {/* Navigate to Incident Button (Step 6) */}
          <Link to={`/responder/incidents/${incident.id}/navigate`}>
            <Button variant="primary" size="sm" icon={Navigation}>
              Navigate to Incident
            </Button>
          </Link>

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

      {/* Tab Switcher: Incident Dossier & SMS Log */}
      <div className="flex items-center gap-2 border-b border-app-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-teal-light text-teal-deep border border-[#c4dcde]'
              : 'text-muted-text hover:text-navy-ink hover:bg-app-bg border border-transparent'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Incident Dossier</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('sms');
            fetchSmsData();
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'sms'
              ? 'bg-teal-light text-teal-deep border border-[#c4dcde]'
              : 'text-muted-text hover:text-navy-ink hover:bg-app-bg border border-transparent'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{t('admin.smsLogTab')}</span>
          {smsLogs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-teal-deep text-white font-mono text-[10px]">
              {smsLogs.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'overview' ? (
        /* Main Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Incident Info & Media */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 7: Recommended Shelter after RESCUED */}
          {(incident.status === 'RESCUED' || incident.status === 'RESOLVED' || incident.recommended_shelter) && (
            <Card className="border-[#C3E4D1] bg-[#FAFDFB]">
              <CardHeader className="bg-[#EDF6F1] py-2.5 border-b border-[#C3E4D1]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#3B7A57]" />
                    <CardTitle className="text-sm font-mono text-navy-ink">
                      Recommended Shelter: {incident.recommended_shelter?.name || incident.shelter_name || 'LB Stadium Relief Camp'}
                    </CardTitle>
                  </div>
                  <Badge variant="teal" size="sm">
                    {incident.status === 'RESOLVED' ? 'Transfer Completed' : 'Victim Transfer Target'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="text-muted-text">{incident.recommended_shelter?.address || 'Fateh Maidan Road, Basheer Bagh, Hyderabad'}</p>
                  <p className="text-[11px] font-mono text-[#3B7A57] mt-0.5">
                    Available beds: {incident.recommended_shelter?.spare_capacity || 320} • ~{incident.recommended_shelter?.drive_time_mins || 8} min drive
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/citizen/route?shelter=${incident.recommended_shelter?.id || 'sh-hyd-02'}`}>
                    <Button variant="primary" size="sm" icon={Navigation}>
                      Navigate to Shelter
                    </Button>
                  </Link>
                  <Link to="/responder/shelters">
                    <Button variant="outline" size="sm">
                      All Shelters
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

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
                  <ResQTileLayer />
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
                <div className="flex items-center gap-2">
                  <span>Dist: ~2.4 km</span>
                  <span className="text-teal-deep font-semibold">ETA: ~9 mins</span>
                </div>
                <Link to={`/responder/incidents/${incident.id}/navigate`}>
                  <Button variant="ghost" size="sm" icon={Navigation} className="text-xs text-teal-deep font-semibold h-7 px-2">
                    Tactical Route
                  </Button>
                </Link>
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
      ) : (
        /* SMS Log Tab View */
        <Card className="border-app-border">
          <CardHeader className="bg-[#FAF9F6] py-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-deep" />
                <CardTitle className="text-sm">{t('admin.smsLogsTitle')}</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-text mt-0.5">
                Auditable lifecycle notification records dispatched to citizen's registered mobile
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchSmsData}
              loading={loadingSms}
            >
              {t('common.refresh')}
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {smsLogs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-app-border rounded-md bg-app-bg space-y-2">
                <MessageSquare className="w-8 h-8 text-muted-text/50 mx-auto" />
                <p className="text-xs font-medium text-muted-text">{t('admin.noSmsLogs')}</p>
                <p className="text-[11px] text-muted-text">
                  SMS notifications trigger automatically during incident creation, assignment, and status transitions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {smsLogs.map((log) => {
                  const matchingPreview = smsPreviews.find(
                    (p) => p.event_type === log.event_type || p.provider_request_id === log.provider_request_id
                  );
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-md border border-app-border bg-surface space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-navy-ink">{log.event_type}</span>
                          <span className="text-muted-text font-mono text-[11px]">
                            {log.phone_masked}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.status === 'sent'
                                ? 'low'
                                : log.status === 'failed'
                                ? 'critical'
                                : log.status === 'skipped'
                                ? 'medium'
                                : 'teal'
                            }
                            size="sm"
                          >
                            {log.status === 'sent'
                              ? t('admin.smsStatusSent')
                              : log.status === 'failed'
                              ? t('admin.smsStatusFailed')
                              : log.status === 'skipped'
                              ? t('admin.smsStatusSkipped')
                              : t('admin.smsStatusPending')}
                          </Badge>
                          <span className="text-[11px] font-mono text-muted-text">
                            {new Date(log.sent_at || log.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {log.error_code && (
                        <div className="p-2 rounded bg-[#FEF3F2] border border-[#FECDCA] text-[11px] text-[#B42318] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {t(`errors.${log.error_code}`) || log.error_code}
                          </span>
                        </div>
                      )}

                      {(matchingPreview?.message || log.preview) && (
                        <div className="p-2.5 rounded bg-app-bg border border-app-border text-navy-ink text-[11px] font-mono leading-relaxed">
                          <span className="text-muted-text block text-[10px] uppercase font-sans font-semibold mb-0.5">
                            {t('admin.smsPreview')} ({log.provider}):
                          </span>
                          "{matchingPreview?.message || log.preview}"
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-text font-mono pt-1">
                        <span>{t('admin.smsProvider')}: {log.provider}</span>
                        <span>Req ID: {log.provider_request_id || 'n/a'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
