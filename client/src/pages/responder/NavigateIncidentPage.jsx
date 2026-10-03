import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FloodMap } from '../../components/map/FloodMap';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button
} from '../../components/ui';
import {
  Compass,
  Navigation,
  Shield,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Flag,
  MapPin,
  ChevronLeft,
  Clock,
  Milestone,
  Check,
  ShieldAlert,
  Radio,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { SOS_INCIDENTS } from '../../data/mockData';

export function NavigateIncidentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Responder Location (Base Station Alpha)
  const responderCoords = [17.3780, 78.5020];

  // Incident State
  const [incident, setIncident] = useState(null);
  const [loadingIncident, setLoadingIncident] = useState(true);

  // Avoid Flooded Areas Toggle (on = safest, off = shortest)
  const [avoidFloodedAreas, setAvoidFloodedAreas] = useState(true);

  // Route State
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [error, setError] = useState(null);

  // Turn-by-Turn Navigation active state
  const [navigating, setNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // 1. Fetch Incident Data
  useEffect(() => {
    let isMounted = true;

    async function loadIncident() {
      setLoadingIncident(true);
      try {
        const res = await apiFetch(`/sos/${id}`);
        if (isMounted && res) {
          setIncident(res);
        }
      } catch (err) {
        console.warn('[NavigateIncidentPage] Server fetch failed, checking mock data:', err);
        // Fallback to mock incidents
        const mock = SOS_INCIDENTS.find((s) => s.id === id) || {
          id: id || 'FQ1024',
          type: 'trapped',
          emergency_type: 'Trapped Civilians',
          priority: 'critical',
          status: 'ACCEPTED',
          latitude: 17.3745,
          longitude: 78.5135,
          address: 'Moosarambagh Bridge South Approach',
          citizen_name: 'M. Arif',
          people_count: 4,
          anyone_injured: true,
        };
        if (isMounted) setIncident(mock);
      } finally {
        if (isMounted) setLoadingIncident(false);
      }
    }

    loadIncident();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // 2. Fetch Route when Incident or Toggle Changes
  useEffect(() => {
    if (!incident) return;

    let isMounted = true;
    async function loadRoute() {
      setLoadingRoute(true);
      setError(null);

      const incLat = incident.latitude || incident.lat || 17.3745;
      const incLng = incident.longitude || incident.lng || 78.5135;

      const fromParam = `${responderCoords[0]},${responderCoords[1]}`;
      const toParam = `${incLat},${incLng}`;
      const modeParam = avoidFloodedAreas ? 'safest' : 'shortest';

      try {
        const res = await apiFetch(`/route?from=${fromParam}&to=${toParam}&mode=${modeParam}`);
        if (isMounted) {
          setRouteData(res);
        }
      } catch (err) {
        console.error('[NavigateIncidentPage] Route query failed:', err);
        if (isMounted) {
          setError('Failed to fetch real-time OSRM route. Check connectivity.');
        }
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    }

    loadRoute();
    return () => {
      isMounted = false;
    };
  }, [incident, avoidFloodedAreas]);

  const isSafe = routeData?.label === 'SAFE';

  const getStepIcon = (instruction) => {
    const text = instruction.toLowerCase();
    if (text.includes('right')) return CornerUpRight;
    if (text.includes('left')) return CornerUpLeft;
    if (text.includes('arrive') || text.includes('distress') || text.includes('incident')) return Flag;
    return ArrowUp;
  };

  const incLat = incident?.latitude || incident?.lat || 17.3745;
  const incLng = incident?.longitude || incident?.lng || 78.5135;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-md border border-app-border">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            onClick={() => navigate(`/responder/incidents/${id}`)}
          >
            Back to Incident
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-navy-ink font-mono">
                NAVIGATE TO #{id || 'FQ1024'}
              </h1>
              <Badge variant={isSafe ? 'low' : 'high'} size="sm">
                ROUTE: {routeData?.label || (isSafe ? 'SAFE' : 'CAUTION')}
              </Badge>
              {incident?.priority && (
                <Badge variant={incident.priority === 'critical' ? 'critical' : 'high'} size="sm">
                  {incident.priority.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-text mt-0.5">
              Tactical turn-by-turn guidance for emergency deployment units
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/responder/incidents/${id}/update`}>
            <Button variant="danger" size="sm" icon={ShieldAlert}>
              Update Status
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Left Info Panel (5 cols) & Large Map (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Info Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3 border-b border-app-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-text">
                Mission Waypoints & Telemetry
              </CardTitle>
              <Badge variant="teal" size="sm">NDRF Tactical Link</Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 text-xs">
              {/* Your Location */}
              <div className="p-2.5 rounded bg-app-bg border border-app-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-text font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-deep" /> Your Location
                  </span>
                  <span className="font-mono text-[10px] text-teal-deep font-semibold">Active Base</span>
                </div>
                <p className="font-bold text-navy-ink text-xs mt-1">Field Station Alpha (Amberpet Base)</p>
                <p className="font-mono text-[10px] text-muted-text mt-0.5">
                  Lat: {responderCoords[0].toFixed(4)}, Lng: {responderCoords[1].toFixed(4)}
                </p>
              </div>

              {/* Destination with Incident ID and Distance */}
              <div className="p-2.5 rounded bg-app-bg border border-app-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-text font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#B42318]" /> Destination Incident
                  </span>
                  <Badge variant="critical" size="sm">#{id || 'FQ1024'}</Badge>
                </div>
                <p className="font-bold text-navy-ink text-xs mt-1">
                  {incident?.address || 'Moosarambagh Bridge South Approach'}
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-muted-text">Category: {incident?.emergency_type || incident?.type || 'Distress'}</span>
                  <span className="font-mono font-bold text-navy-ink">
                    Dist: {routeData ? `${routeData.distance_km || routeData.distance} km` : '2.4 km'}
                  </span>
                </div>
              </div>

              {/* Metrics Grid: ETA, Distance, Route Type */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-surface border border-app-border text-center">
                <div>
                  <span className="text-[10px] text-muted-text uppercase tracking-wider block">ETA</span>
                  <span className="font-mono text-sm font-bold text-teal-deep">
                    {routeData ? `${routeData.duration_min || routeData.eta} min` : '9 min'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-text uppercase tracking-wider block">Distance</span>
                  <span className="font-mono text-sm font-bold text-navy-ink">
                    {routeData ? `${routeData.distance_km || routeData.distance} km` : '2.4 km'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-text uppercase tracking-wider block">Route Type</span>
                  <span className={`font-mono text-xs font-bold block mt-0.5 ${isSafe ? 'text-[#3B7A57]' : 'text-[#B54708]'}`}>
                    {routeData?.label || (isSafe ? 'SAFE' : 'CAUTION')}
                  </span>
                </div>
              </div>

              {/* "Avoid Flooded Areas" Toggle (on = safest, off = shortest) */}
              <div className="p-3 rounded-md border border-app-border bg-[#FAF9F6] flex items-center justify-between">
                <div>
                  <span className="font-bold text-navy-ink text-xs block">
                    Avoid Flooded Areas
                  </span>
                  <span className="text-[10px] text-muted-text">
                    {avoidFloodedAreas
                      ? 'ON: Routing around closed causeways & flood basins'
                      : 'OFF: Direct route taking nearest arterial roads'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setAvoidFloodedAreas(!avoidFloodedAreas)}
                  className={`p-1 rounded-full transition-colors ${
                    avoidFloodedAreas ? 'text-[#3B7A57]' : 'text-muted-text'
                  }`}
                  title={avoidFloodedAreas ? 'Switch to Shortest' : 'Switch to Safest'}
                >
                  {avoidFloodedAreas ? (
                    <ToggleRight className="w-8 h-8 fill-current text-[#3B7A57]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 fill-current text-muted-text" />
                  )}
                </button>
              </div>

              {/* Hazards Status Box */}
              {isSafe ? (
                <div className="p-2.5 rounded bg-[#EDF6F1] border border-[#C3E4D1] text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#2F6145]">
                    <Check className="w-3.5 h-3.5" />
                    <span>Safe Tactical Corridor Active</span>
                  </div>
                  <p className="text-[#3B7A57]">
                    Bypasses blocked Moosarambagh Causeway via elevated Amberpet ridge.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-[#FEF6EE] border border-[#FADCC3] text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#B54708]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Caution: High-Risk Approach Path</span>
                  </div>
                  <p className="text-[#B54708]">
                    Path directly approaches impassable Moosarambagh Causeway (3.5ft water). High-clearance truck or boat required.
                  </p>
                </div>
              )}

              {/* Start Navigation Button */}
              <div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full text-xs font-semibold py-2.5 shadow-sm"
                  icon={Navigation}
                  onClick={() => setNavigating(!navigating)}
                >
                  {navigating ? 'Hide Tactical Steps' : 'Start Navigation'}
                </Button>
              </div>

              {/* Mandatory Requirement Notice */}
              <div className="text-center pt-1">
                <p className="text-[11px] text-muted-text italic">
                  Demo routing based on mock data
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Turn-by-Turn Navigation Steps Drawer */}
          {navigating && routeData?.steps && (
            <Card className="border-app-border animate-in fade-in slide-in-from-top-2 duration-200">
              <CardHeader className="bg-[#FAF9F6] py-2.5 border-b border-app-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-teal-deep" />
                  <CardTitle className="text-xs uppercase font-mono">Tactical Instructions</CardTitle>
                </div>
                <span className="text-[10px] font-mono text-muted-text">
                  Step {activeStepIndex + 1} of {routeData.steps.length}
                </span>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {routeData.steps.map((step, idx) => {
                  const StepIcon = getStepIcon(step.instruction);
                  const isCurrent = idx === activeStepIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveStepIndex(idx)}
                      className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isCurrent
                          ? 'bg-teal-light/40 border-teal-deep text-navy-ink shadow-xs'
                          : 'bg-app-bg border-app-border text-muted-text hover:bg-surface'
                      }`}
                    >
                      <div className={`p-1.5 rounded shrink-0 ${isCurrent ? 'bg-teal-deep text-white' : 'bg-surface border border-app-border text-muted-text'}`}>
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${isCurrent ? 'font-bold text-navy-ink' : 'font-medium'}`}>
                          {step.instruction}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-text mt-1 font-mono">
                          <span>Dist: {step.distance_m}m</span>
                          <span>~{Math.round(step.duration_s / 60) || 1} min</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Large Tactical Map (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-navy-ink uppercase tracking-wider">
                Tactical GIS Operations Canvas
              </span>
              <span className="text-[11px] text-muted-text">
                (Route in Indigo • Detour vs Direct)
              </span>
            </div>

            {routeData?.originalPath && (
              <div className="flex items-center gap-2 text-[10px] text-muted-text font-mono bg-surface px-2.5 py-1 rounded border border-app-border">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#6B7280]"></span>
                <span>Original Unsafe Path (Detoured)</span>
              </div>
            )}
          </div>

          <div className="relative rounded-lg overflow-hidden border border-app-border bg-surface shadow-sm">
            <FloodMap
              height="600px"
              center={[17.3760, 78.5080]}
              zoom={14}
              route={routeData?.geometry?.coordinates || []}
              routeColor="#4F46E5"
              unsafeRoute={routeData?.originalPath || null}
              userLocation={responderCoords}
              destination={[incLat, incLng]}
              destinationLabel={`Incident #${id || 'FQ1024'}`}
              layers={{
                zones: true,
                shelters: true,
                hospitals: true,
                roads: true,
                sos: true,
                responders: true,
              }}
            />

            {/* Map Legend Overlay at Bottom Right */}
            <div className="absolute bottom-3 right-3 z-[1000] bg-surface/95 backdrop-blur-xs p-2.5 rounded-md border border-app-border shadow-sm text-[11px] space-y-1.5 max-w-[210px]">
              <span className="font-mono text-[10px] font-bold text-navy-ink uppercase block border-b border-app-border pb-1">
                Field Legend
              </span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 rounded bg-[#4F46E5]"></span>
                <span className="text-navy-ink font-medium">Tactical Deployment Route</span>
              </div>
              {routeData?.originalPath && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-[#6B7280]"></span>
                  <span className="text-muted-text">Bypassed Direct Path</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-[#B42318]"></span>
                <span className="text-[#B42318]">Impassable Road Barrier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NavigateIncidentPage;
