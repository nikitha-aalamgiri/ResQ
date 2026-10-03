import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { onSOSEvent } from '../../lib/broadcast';
import { FloodMap, Layers, Legend } from '../../components/map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import { HYDERABAD_CENTER } from '../../data/mockData';
import {
  Bell,
  Radio,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  LifeBuoy,
  Users,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Power
} from 'lucide-react';

export const ResponderDashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Online / Offline Availability Toggle (Requirement 1)
  const [isOnline, setIsOnline] = useState(profile?.is_available ?? true);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Notifications Bell State (Requirement 1)
  const [showNotificationTray, setShowNotificationTray] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  // Map Layer State
  const [layers, setLayers] = useState({
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: true,
    rainfall: false,
  });

  const [responderLocation, setResponderLocation] = useState([17.3780, 78.5020]);
  const [locating, setLocating] = useState(false);

  // Track known incident IDs to trigger "NEW CRITICAL INCIDENT" toast (Requirement 5)
  const knownIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  const fetchIncidents = async () => {
    try {
      const res = await apiFetch('/sos');
      if (res.success && res.data) {
        const list = res.data;

        // Check for new incoming incidents to trigger real-time toast alert (Requirement 5)
        if (!initialLoadRef.current) {
          for (const inc of list) {
            if (!knownIdsRef.current.has(inc.id)) {
              setToast({
                title: `NEW ${inc.priority?.toUpperCase()} INCIDENT #${inc.id}`,
                message: `${inc.emergency_type} reported at ${inc.address}. Persons: ${inc.people_count}`,
                type: inc.priority === 'critical' ? 'critical' : 'high',
                actionLabel: 'View Incident',
                onAction: () => navigate(`/responder/incidents/${inc.id}`),
              });
              setUnreadNotifications((prev) => prev + 1);
              break;
            }
          }
        }

        // Update known IDs
        knownIdsRef.current = new Set(list.map((i) => i.id));
        initialLoadRef.current = false;
        setIncidents(list);
      }
    } catch (err) {
      console.warn('Could not query incidents:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    // Instant cross-window event synchronization
    const unsubscribeBus = onSOSEvent((event) => {
      if (event.type === 'NEW_SOS' && event.sos) {
        const inc = event.sos;
        setToast({
          title: `NEW ${(inc.priority || 'CRITICAL').toUpperCase()} INCIDENT #${inc.id}`,
          message: `${inc.emergency_type || inc.type || 'Distress'} reported at ${inc.address || 'Field Area'}. Persons: ${inc.people_count || 1}`,
          type: inc.priority === 'critical' ? 'critical' : 'high',
          actionLabel: 'View Incident',
          onAction: () => navigate(`/responder/incidents/${inc.id}`),
        });
        setUnreadNotifications((prev) => prev + 1);
        fetchIncidents();
      } else if (event.type === 'SOS_STATUS_CHANGED' || event.type === 'SOS_ASSIGNED') {
        fetchIncidents();
      }
    });

    // Supabase Realtime Channel for sos_requests
    const channel = supabase
      .channel('public:sos_requests:responder_dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_requests' }, () => {
        fetchIncidents();
      })
      .subscribe();

    // Polling fallback
    const interval = setInterval(fetchIncidents, 4000);

    return () => {
      unsubscribeBus();
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Toggle Availability
  const handleToggleAvailability = async () => {
    setTogglingOnline(true);
    const nextState = !isOnline;
    try {
      await apiFetch('/responder/availability', {
        method: 'PATCH',
        body: JSON.stringify({ is_available: nextState }),
      });
      setIsOnline(nextState);
      setToast({
        title: nextState ? 'Status: Online' : 'Status: Offline',
        message: nextState
          ? 'You are active and dispatch-ready for incoming water rescue calls.'
          : 'You are now marked Offline on the dispatch board.',
        type: nextState ? 'low' : 'info',
      });
    } catch (err) {
      setIsOnline(nextState);
    } finally {
      setTogglingOnline(false);
    }
  };

  // Map Locator
  const handleLocateResponder = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setResponderLocation(coords);
          setLocating(false);
          mapRef.current?.flyTo(coords[0], coords[1], 15);
        },
        () => {
          const fallback = [17.3780, 78.5020];
          setResponderLocation(fallback);
          setLocating(false);
          mapRef.current?.flyTo(fallback[0], fallback[1], 15);
        },
        { timeout: 5000 }
      );
    } else {
      const fallback = [17.3780, 78.5020];
      setResponderLocation(fallback);
      setLocating(false);
      mapRef.current?.flyTo(fallback[0], fallback[1], 15);
    }
  };

  // Stat Counts
  const criticalCount = incidents.filter((i) => i.priority === 'critical' && i.status !== 'RESOLVED').length;
  const highCount = incidents.filter((i) => i.priority === 'high' && i.status !== 'RESOLVED').length;
  const mediumCount = incidents.filter((i) => (i.priority === 'medium' || i.priority === 'low') && i.status !== 'RESOLVED').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  // My Assigned Incidents (assigned to current user or Inspector Vikram demo)
  const myAssignedIncidents = incidents.filter(
    (i) => i.assigned_responder_id === user?.id || (user?.email?.includes('vikram') && i.assigned_responder_id)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in max-w-sm">
          <div className={`p-4 rounded-md border text-xs shadow-lg ${
            toast.type === 'critical' ? 'bg-[#FDF2F2] border-[#F8D2D0] text-[#B42318]' : 'bg-[#EDF6F1] border-[#C3E4D1] text-[#3B7A57]'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>{toast.title}</span>
              <button type="button" onClick={() => setToast(null)} className="text-muted-text hover:text-navy-ink font-bold">✕</button>
            </div>
            <p className="mt-1 text-navy-ink leading-snug">{toast.message}</p>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={toast.onAction}
                className="mt-2 px-2.5 py-1 rounded bg-navy-ink text-white text-[11px] font-semibold hover:bg-navy-ink/90 transition-colors"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Header: Situation Overview, Notification Bell & Online/Offline Toggle (Requirement 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-ink">
              Good Morning, {profile?.full_name || 'Inspector K. Vikram'}
            </h1>
            <Badge variant="high" size="sm">Field Unit Alpha</Badge>
          </div>
          <p className="text-xs text-muted-text mt-1 font-mono">
            Situation: <span className="text-navy-ink font-semibold">Hyderabad Sector • 6 Active Inundation Hazard Zones • Musi River Corridor High Alert</span>
          </p>
        </div>

        {/* Right Header Controls: Notification Bell + Online/Offline Toggle */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationTray(!showNotificationTray)}
              className="relative p-2 rounded-md border border-app-border bg-surface hover:bg-app-bg text-navy-ink transition-colors"
              title="Operational Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B42318] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Notification Dropdown Tray */}
            {showNotificationTray && (
              <div className="absolute right-0 mt-2 w-72 bg-surface rounded-md border border-app-border shadow-lg p-3 z-50 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-app-border pb-1.5 font-bold text-navy-ink">
                  <span>Distress Notifications</span>
                  <button
                    type="button"
                    onClick={() => { setUnreadNotifications(0); setShowNotificationTray(false); }}
                    className="text-[10px] text-teal-deep hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="divide-y divide-app-border space-y-1.5 max-h-48 overflow-y-auto">
                  <div className="pt-1.5">
                    <p className="font-semibold text-[#B42318]">Critical SOS #FQ1024</p>
                    <p className="text-[11px] text-muted-text">Musi Riverbed Chaderghat • 4 persons trapped</p>
                  </div>
                  <div className="pt-1.5">
                    <p className="font-semibold text-[#B54708]">High Alert #FQ1025</p>
                    <p className="text-[11px] text-muted-text">Begumpet Rasoolpura Nala • Medical priority</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Online / Offline Availability Toggle (Requirement 1) */}
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={togglingOnline}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all ${
              isOnline
                ? 'border-[#C3E4D1] bg-[#EDF6F1] text-[#3B7A57] hover:bg-[#DEF0E5]'
                : 'border-[#FADCC3] bg-[#FEF6EE] text-[#B54708] hover:bg-[#FCECDD]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#3B7A57] animate-pulse' : 'bg-[#B54708]'}`} />
            <span>{isOnline ? 'Online (Ready)' : 'Offline (Standby)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Four Tinted Stat Cards (Requirement 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Critical (Red) */}
        <Card className="border-[#F8D2D0] bg-[#FDF2F2]">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-[#B42318] uppercase tracking-wider font-mono">
              Critical Distress
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-[#B42318]">{criticalCount}</h3>
              <Badge variant="critical" size="sm">Life Threat</Badge>
            </div>
            <p className="text-[11px] text-[#8E1C12] mt-1">Trapped in fast water / injured</p>
          </CardContent>
        </Card>

        {/* High (Orange) */}
        <Card className="border-[#FADCC3] bg-[#FEF6EE]">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-[#B54708] uppercase tracking-wider font-mono">
              High Priority
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-[#B54708]">{highCount}</h3>
              <Badge variant="high" size="sm">Urgent Evac</Badge>
            </div>
            <p className="text-[11px] text-[#913706] mt-1">Medical / water breaching homes</p>
          </CardContent>
        </Card>

        {/* Medium (Amber) */}
        <Card className="border-[#F5EDB8] bg-[#FEFAEC]">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-[#A16207] uppercase tracking-wider font-mono">
              Medium Priority
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-[#A16207]">{mediumCount}</h3>
              <Badge variant="medium" size="sm">Assistance</Badge>
            </div>
            <p className="text-[11px] text-[#7A4B05] mt-1">Food, water, or shelter request</p>
          </CardContent>
        </Card>

        {/* Resolved (Green) */}
        <Card className="border-[#C3E4D1] bg-[#EDF6F1]">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-[#3B7A57] uppercase tracking-wider font-mono">
              Resolved Cases
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-[#3B7A57]">{resolvedCount}</h3>
              <Badge variant="low" size="sm">Completed</Badge>
            </div>
            <p className="text-[11px] text-[#2F6145] mt-1">Safely extracted & sheltered</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. My Assigned Incidents List (Requirement 1) */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">My Assigned Incidents</CardTitle>
              <CardDescription>Incidents currently claimed by your unit</CardDescription>
            </div>
            <Link to="/responder/triage">
              <Button variant="outline" size="sm" icon={ExternalLink}>
                View All Queue ({incidents.length})
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {myAssignedIncidents.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-text space-y-2">
              <p>No active incidents currently assigned to your unit.</p>
              <Link to="/responder/triage">
                <Button variant="primary" size="sm">
                  Claim Incidents from Triage Queue
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-app-border text-xs">
              {myAssignedIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-app-bg transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-navy-ink">{inc.id}</span>
                      <Badge
                        variant={
                          inc.priority === 'critical'
                            ? 'critical'
                            : inc.priority === 'high'
                            ? 'high'
                            : 'medium'
                        }
                        size="sm"
                      >
                        {inc.priority}
                      </Badge>
                      <Badge variant="teal" size="sm">{inc.status}</Badge>
                    </div>
                    <p className="font-semibold text-navy-ink">
                      {inc.emergency_type} • {inc.people_count} {inc.people_count === 1 ? 'person' : 'persons'}
                    </p>
                    <p className="text-[11px] text-muted-text flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-md">{inc.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right shrink-0">
                    <div className="text-[11px] font-mono text-muted-text">
                      <p className="text-navy-ink font-bold">~{inc.distance_km || '1.2'} km away</p>
                      <p className="text-[10px] text-muted-text flex items-center sm:justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inc.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link to={`/responder/incidents/${inc.id}`}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                      <Link to={`/responder/incidents/${inc.id}/update`}>
                        <Button variant="danger" size="sm">
                          Update Status
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Live Map (Nearby Incidents) using FloodMap with Legend (Requirement 1) */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Live Map (Nearby Incidents)</CardTitle>
              <CardDescription>
                Tactical spatial overview of nearby distress calls, shelters, and flooded corridors
              </CardDescription>
            </div>
            <Link to="/responder/map">
              <Button variant="outline" size="sm" icon={ExternalLink}>
                Fullscreen Operations Map
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          <FloodMap
            ref={mapRef}
            layers={layers}
            height="460px"
            center={HYDERABAD_CENTER}
            zoom={12}
            userLocation={responderLocation}
            onSelect={(type, data) => {
              if (type === 'sos' && data?.id) {
                navigate(`/responder/incidents/${data.id}`);
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
    </div>
  );
};

export default ResponderDashboard;
