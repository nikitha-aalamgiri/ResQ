import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
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
  Building2,
  RotateCcw,
  Clock,
  Milestone,
  Check
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { SHELTERS } from '../../data/mockData';
import { getLastRoute, saveLastRoute } from '../../lib/offlineStore';

// Preset locations in Hyderabad for quick drill simulation
const PRESET_ORIGINS = [
  {
    id: 'musi-chaderghat',
    name: 'Musi River Basin - Chaderghat (Current GPS)',
    lat: 17.3750,
    lng: 78.4830,
    risk: 'critical'
  },
  {
    id: 'begumpet-station',
    name: 'Begumpet Station Road',
    lat: 17.4440,
    lng: 78.4710,
    risk: 'critical'
  },
  {
    id: 'tolichowki-colony',
    name: 'Nadeem Colony, Tolichowki',
    lat: 17.4020,
    lng: 78.4050,
    risk: 'high'
  },
  {
    id: 'hyderabad-central',
    name: 'SEOC Command Center (Nampally)',
    lat: 17.3850,
    lng: 78.4867,
    risk: 'low'
  }
];

export function SafeRoutePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected Origin & Destination
  const defaultOrigin = PRESET_ORIGINS[0];
  const [origin, setOrigin] = useState(defaultOrigin);
  const [selectedShelterId, setSelectedShelterId] = useState(
    searchParams.get('shelter') || 'sh-03' // Default to Saroornagar (triggers Moosarambagh detour demo)
  );

  // Routing Mode: 'safest' vs 'shortest'
  const [mode, setMode] = useState('safest');
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState(null);
  const [error, setError] = useState(null);

  // Turn-by-Turn Navigation active state
  const [navigating, setNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Find currently selected shelter object
  const selectedShelter = SHELTERS.find((s) => s.id === selectedShelterId) || SHELTERS[2]; // Fallback to Saroornagar

  // Fetch Route from Server with offline cache fallback
  const fetchRoute = async () => {
    setLoading(true);
    setError(null);

    const isOffline = !navigator.onLine || localStorage.getItem('resq_simulated_offline') === 'true';
    if (isOffline) {
      const cached = getLastRoute();
      if (cached) {
        setRouteData(cached);
        setLoading(false);
        return;
      }
    }

    const fromParam = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`;
    const toParam = `${selectedShelter.lat.toFixed(4)},${selectedShelter.lng.toFixed(4)}`;

    try {
      const res = await apiFetch(`/route?from=${fromParam}&to=${toParam}&mode=${mode}`);
      setRouteData(res);
      if (res && res.route) {
        saveLastRoute(res);
      }
    } catch (err) {
      console.warn('[SafeRoutePage] Route query error, checking local route cache:', err);
      const cached = getLastRoute();
      if (cached) {
        setRouteData(cached);
      } else {
        setError('Could not calculate evacuation route. Using cached safety corridor.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [origin, selectedShelterId, mode]);

  // Turn-by-turn icon helper
  const getStepIcon = (instruction) => {
    const text = instruction.toLowerCase();
    if (text.includes('right')) return CornerUpRight;
    if (text.includes('left')) return CornerUpLeft;
    if (text.includes('arrive') || text.includes('hub') || text.includes('stadium')) return Flag;
    return ArrowUp;
  };

  const isSafe = routeData?.label === 'SAFE';

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white p-5 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-teal-light text-[11px] font-mono mb-1.5">
              <Compass className="w-3.5 h-3.5 text-teal-light" />
              <span>EVACUATION NAVIGATION ENGINE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Safe Evacuation Route
            </h1>
            <p className="text-xs sm:text-sm text-[#C4D9DF] mt-0.5 max-w-xl">
              Calculates flood-safe corridors avoiding active nala breaches, submerged causeways, and critical inundation basins.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/citizen/dashboard">
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                Dashboard
              </Button>
            </Link>
            <Link to="/citizen/map">
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                Full Map
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Info Card on Left, Large Interactive Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Route Configuration & Recommended Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Origin & Destination Selector Card */}
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3 border-b border-app-border">
              <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-text">
                Trip Waypoints
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              {/* From: Current Location */}
              <div>
                <label className="block text-[11px] font-semibold text-navy-ink uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-deep" /> From (Your Current Location)
                  </span>
                  <span className="text-[10px] text-muted-text font-mono">GPS Verified</span>
                </label>
                <select
                  value={origin.id}
                  onChange={(e) => {
                    const found = PRESET_ORIGINS.find((p) => p.id === e.target.value);
                    if (found) setOrigin(found);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-md border border-app-border bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
                >
                  {PRESET_ORIGINS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-text font-mono px-1">
                  <span>Lat: {origin.lat.toFixed(4)}, Lng: {origin.lng.toFixed(4)}</span>
                  <span className={origin.risk === 'critical' ? 'text-[#B42318] font-bold' : 'text-[#3B7A57]'}>
                    {origin.risk.toUpperCase()} RISK SECTOR
                  </span>
                </div>
              </div>

              {/* To: Selected Shelter */}
              <div>
                <label className="block text-[11px] font-semibold text-navy-ink uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#3B7A57]" /> To (Selected Shelter)
                  </span>
                  <span className="text-[10px] text-[#3B7A57] font-semibold">Verified Safe</span>
                </label>
                <select
                  value={selectedShelterId}
                  onChange={(e) => setSelectedShelterId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-app-border bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
                >
                  {SHELTERS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.occupancy}/{s.capacity} beds)
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-text px-1">
                  <span className="truncate max-w-[200px]">{selectedShelter.location}</span>
                  <span className="font-mono text-teal-deep font-semibold">
                    {selectedShelter.capacity - selectedShelter.occupancy} beds free
                  </span>
                </div>
              </div>

              {/* Route Mode Toggle (Radio Toggle: Safest Route vs Shortest Route) */}
              <div className="pt-2 border-t border-app-border">
                <span className="block text-[11px] font-semibold text-navy-ink uppercase tracking-wider mb-2">
                  Routing Mode
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                      mode === 'safest'
                        ? 'bg-[#EDF6F1] border-[#3B7A57] text-[#2F6145] font-semibold'
                        : 'bg-app-bg border-app-border text-muted-text hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="routingMode"
                      value="safest"
                      checked={mode === 'safest'}
                      onChange={() => setMode('safest')}
                      className="text-teal-deep focus:ring-teal-deep"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs">Safest Route</span>
                      <span className="text-[10px] font-normal opacity-80">Avoids all hazards</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                      mode === 'shortest'
                        ? 'bg-[#FEF6EE] border-[#B54708] text-[#B54708] font-semibold'
                        : 'bg-app-bg border-app-border text-muted-text hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="routingMode"
                      value="shortest"
                      checked={mode === 'shortest'}
                      onChange={() => setMode('shortest')}
                      className="text-[#B54708] focus:ring-[#B54708]"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs">Shortest Route</span>
                      <span className="text-[10px] font-normal opacity-80">Direct path</span>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. "Recommended Route" Card */}
          <Card className={`border ${isSafe ? 'border-[#C3E4D1]' : 'border-[#FADCC3]'} overflow-hidden shadow-sm`}>
            <CardHeader className={`py-3 ${isSafe ? 'bg-[#EDF6F1]' : 'bg-[#FEF6EE]'} border-b ${isSafe ? 'border-[#C3E4D1]' : 'border-[#FADCC3]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className={`w-4 h-4 ${isSafe ? 'text-[#3B7A57]' : 'text-[#B54708]'}`} />
                  <CardTitle className="text-sm">
                    {mode === 'safest' ? 'Recommended Safe Evacuation' : 'Direct Shortest Path'}
                  </CardTitle>
                </div>
                <Badge variant={isSafe ? 'low' : 'high'} size="sm">
                  {routeData?.label || (isSafe ? 'SAFE' : 'CAUTION')}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              {/* Telemetry Metrics: Distance & ETA */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-app-bg border border-app-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-surface border border-app-border">
                    <Milestone className="w-4 h-4 text-teal-deep" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-text uppercase tracking-wider block">Distance</span>
                    <span className="font-mono text-base font-bold text-navy-ink">
                      {routeData ? `${routeData.distance_km || routeData.distance} km` : '4.1 km'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-surface border border-app-border">
                    <Clock className="w-4 h-4 text-teal-deep" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-text uppercase tracking-wider block">Estimated ETA</span>
                    <span className="font-mono text-base font-bold text-navy-ink">
                      {routeData ? `${routeData.duration_min || routeData.eta} min` : '18 min'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Safety Checks List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-navy-ink uppercase tracking-wider block">
                  Route Assessment Checklist
                </span>
                {isSafe ? (
                  <div className="space-y-1.5 text-xs text-navy-ink">
                    <div className="flex items-center gap-2 p-1.5 rounded bg-[#EDF6F1] border border-[#C3E4D1]">
                      <Check className="w-4 h-4 text-[#3B7A57] shrink-0" />
                      <span className="font-medium text-[#2F6145]">Avoids flooded areas</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-[#EDF6F1] border border-[#C3E4D1]">
                      <Check className="w-4 h-4 text-[#3B7A57] shrink-0" />
                      <span className="font-medium text-[#2F6145]">Avoids blocked roads</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-[#EDF6F1] border border-[#C3E4D1]">
                      <Check className="w-4 h-4 text-[#3B7A57] shrink-0" />
                      <span className="font-medium text-[#2F6145]">Low risk route</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs text-[#8E1C12]">
                    <div className="flex items-start gap-2 p-2 rounded bg-[#FDF2F2] border border-[#F8D2D0]">
                      <AlertOctagon className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#B42318] block">Crosses Active Hazard Corridor</span>
                        <span className="text-[11px] text-[#8E1C12]">
                          Direct path intersects flooded causeway and critical inundation basin.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hazards Avoided / Crossed Details */}
              {routeData?.hazards_avoided && routeData.hazards_avoided.length > 0 && (
                <div className="p-2.5 rounded bg-surface border border-app-border text-[11px] space-y-1">
                  <span className="font-semibold text-[#3B7A57] uppercase text-[10px] tracking-wider block">
                    Hazards Bypassed via Detour:
                  </span>
                  {routeData.hazards_avoided.map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-muted-text">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3B7A57]" />
                      <span>{typeof h === 'string' ? h : h.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {routeData?.hazards_crossed && routeData.hazards_crossed.length > 0 && (
                <div className="p-2.5 rounded bg-[#FEF6EE] border border-[#FADCC3] text-[11px] space-y-1">
                  <span className="font-semibold text-[#B54708] uppercase text-[10px] tracking-wider block">
                    Critical Hazards Crossed on Direct Path:
                  </span>
                  {routeData.hazards_crossed.map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[#B54708]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{typeof h === 'string' ? h : h.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Start Navigation Action Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full text-xs font-semibold py-2.5 shadow-sm"
                  icon={Navigation}
                  onClick={() => setNavigating(!navigating)}
                >
                  {navigating ? 'Hide Navigation Steps' : 'Start Navigation'}
                </Button>
              </div>

              {/* Mandatory Requirement Label */}
              <div className="pt-1 text-center">
                <p className="text-[11px] text-muted-text italic">
                  Demo routing based on mock data
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Turn-by-Turn Navigation Steps Panel (Triggered by Start Navigation) */}
          {navigating && routeData?.steps && (
            <Card className="border-app-border animate-in fade-in slide-in-from-top-2 duration-200">
              <CardHeader className="bg-[#FAF9F6] py-2.5 border-b border-app-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-teal-deep" />
                  <CardTitle className="text-xs uppercase font-mono">Turn-by-Turn Directions</CardTitle>
                </div>
                <span className="text-[10px] font-mono text-muted-text">
                  Step {activeStepIndex + 1} of {routeData.steps.length}
                </span>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-72 overflow-y-auto">
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

        {/* Right Column: High-Visibility Leaflet Map (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-navy-ink uppercase tracking-wider">
                Live Evacuation Canvas
              </span>
              <span className="text-[11px] text-muted-text">
                (Route in Indigo • Detour vs Direct)
              </span>
            </div>

            {routeData?.originalPath && (
              <div className="flex items-center gap-2 text-[10px] text-muted-text font-mono bg-surface px-2.5 py-1 rounded border border-app-border">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#6B7280]"></span>
                <span>Original Direct Path (Detoured)</span>
              </div>
            )}
          </div>

          {/* Interactive Map Component */}
          <div className="relative rounded-lg overflow-hidden border border-app-border bg-surface shadow-sm">
            <FloodMap
              height="580px"
              center={[origin.lat, origin.lng]}
              zoom={13}
              route={routeData?.geometry?.coordinates || []}
              routeColor="#4F46E5"
              unsafeRoute={routeData?.originalPath || null}
              userLocation={[origin.lat, origin.lng]}
              destination={[selectedShelter.lat, selectedShelter.lng]}
              destinationLabel={selectedShelter.name}
              layers={{
                zones: true,
                shelters: true,
                hospitals: true,
                roads: true,
                sos: false,
                responders: false,
              }}
            />

            {/* Map Legend Overlay at Bottom Right */}
            <div className="absolute bottom-3 right-3 z-[1000] bg-surface/95 backdrop-blur-xs p-2.5 rounded-md border border-app-border shadow-sm text-[11px] space-y-1.5 max-w-[210px]">
              <span className="font-mono text-[10px] font-bold text-navy-ink uppercase block border-b border-app-border pb-1">
                Route Visual Legend
              </span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 rounded bg-[#4F46E5]"></span>
                <span className="text-navy-ink font-medium">Active Evacuation Route (Indigo)</span>
              </div>
              {routeData?.originalPath && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-[#6B7280]"></span>
                  <span className="text-muted-text">Bypassed Unsafe Path</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-[#B42318]"></span>
                <span className="text-[#B42318]">Blocked Road Barrier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SafeRoutePage;
