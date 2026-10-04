import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { FloodMap, Layers, Legend } from '../../components/map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import { HYDERABAD_CENTER } from '../../data/mockData';
import {
  AlertTriangle,
  Building2,
  Compass,
  Bell,
  Phone,
  MapPin,
  Navigation,
  ArrowRight,
  ShieldAlert,
  Info,
  ExternalLink,
  LifeBuoy,
  X
} from 'lucide-react';
import { useLang } from '../../context/LangContext';
import { HazardReportModal } from '../../components/common/HazardReportModal';
import { PrepareOfflineCard } from '../../components/offline/PrepareOfflineCard';

export const CitizenDashboard = () => {
  const { profile, user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  // Map Layer State
  const [layers, setLayers] = useState({
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: false,
    rainfall: false,
  });

  // Location & Risk State
  const [userCoords, setUserCoords] = useState([17.3750, 78.4867]);
  const [riskData, setRiskData] = useState(null);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState(null);

  // Coming Up Dialog State (For Step 6 & 7 buttons)
  const [comingUpModal, setComingUpModal] = useState(null);

  // Active SOS quick tracker
  const [activeSOS, setActiveSOS] = useState(null);
  const [showHazardModal, setShowHazardModal] = useState(false);

  // Fetch Risk Assessment for Coordinates
  const fetchRiskForLocation = async (lat, lng) => {
    try {
      const data = await apiFetch(`/risk?lat=${lat}&lng=${lng}`);
      setRiskData(data);
    } catch (err) {
      console.warn('Risk assessment error:', err.message);
    }
  };

  // Check if citizen has active SOS
  const checkActiveSOS = async () => {
    try {
      const res = await apiFetch('/sos/mine');
      if (res.success && res.data && res.data.length > 0) {
        setActiveSOS(res.data[0]);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchRiskForLocation(userCoords[0], userCoords[1]);
    checkActiveSOS();
  }, []);

  // GPS Locator
  const handleLocateUser = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserCoords(coords);
          setLocating(false);
          fetchRiskForLocation(coords[0], coords[1]);
          mapRef.current?.flyTo(coords[0], coords[1], 15);
          setToast({
            title: 'Location Acquired',
            message: `Position updated to [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`,
            type: 'low',
          });
        },
        (err) => {
          // GPS Denied Fallback
          const fallback = [17.3750, 78.4867];
          setUserCoords(fallback);
          setLocating(false);
          fetchRiskForLocation(fallback[0], fallback[1]);
          mapRef.current?.flyTo(fallback[0], fallback[1], 15);
          setToast({
            title: 'GPS Fallback Active',
            message: 'GPS unavailable. Positioned in Hyderabad sector.',
            type: 'info',
          });
        },
        { timeout: 6000 }
      );
    } else {
      const fallback = [17.3750, 78.4867];
      setUserCoords(fallback);
      setLocating(false);
      fetchRiskForLocation(fallback[0], fallback[1]);
      mapRef.current?.flyTo(fallback[0], fallback[1], 15);
    }
  };

  const handleToggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectLocation = (loc) => {
    if (mapRef.current) {
      mapRef.current.flyTo(loc.lat, loc.lng, 15);
      setUserCoords([loc.lat, loc.lng]);
      fetchRiskForLocation(loc.lat, loc.lng);
    }
  };

  // Mask coordinates (e.g. 17.37**° N, 78.48**° E per Mockup Screen 2)
  const maskCoordinate = (coord) => {
    return `${coord.toFixed(2)}**°`;
  };

  // Risk styling tokens
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return { border: 'border-[#F8D2D0]', bg: 'bg-[#FDF2F2]', text: 'text-[#B42318]', badge: 'critical' };
      case 'high':
        return { border: 'border-[#FADCC3]', bg: 'bg-[#FEF6EE]', text: 'text-[#B54708]', badge: 'high' };
      case 'medium':
        return { border: 'border-[#F5EDB8]', bg: 'bg-[#FEFAEC]', text: 'text-[#A16207]', badge: 'medium' };
      default:
        return { border: 'border-[#C3E4D1]', bg: 'bg-[#EDF6F1]', text: 'text-[#3B7A57]', badge: 'low' };
    }
  };

  const currentRiskColor = getRiskColor(riskData?.risk_level || 'high');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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

      {/* ========================================================================= */}
      {/* SCREEN 1: LANDING / HOME HERO & TILES */}
      {/* ========================================================================= */}

      {/* 1. Hero Container with Allowed Gradient (DESIGN.md Section 2) */}
      <div className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white p-6 sm:p-7 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-teal-light text-[11px] font-mono mb-2">
              <span className="w-2 h-2 rounded-full bg-[#3B7A57] animate-pulse" />
              HYDERABAD DISASTER RESPONSE PLATFORM
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {t('heroTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[#C4D9DF] mt-1 max-w-xl leading-relaxed font-sans">
              {t('heroSubtitle')}
            </p>
          </div>

          {activeSOS && (
            <div className="shrink-0 bg-white/10 p-3 rounded-md border border-white/20 text-xs">
              <span className="text-[#C4D9DF] font-mono text-[10px] uppercase">Active Distress SOS</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-bold text-white">{activeSOS.id}</span>
                <Badge variant={activeSOS.status === 'ASSIGNED' ? 'teal' : 'critical'} size="sm">
                  {activeSOS.status}
                </Badge>
              </div>
              <Link
                to={`/citizen/sos/${activeSOS.id}`}
                className="inline-flex items-center gap-1 text-[11px] text-teal-light hover:underline font-semibold mt-1"
              >
                Track Rescue Live <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* "Use my current location" bar */}
        <div className="mt-5 p-2 rounded-md bg-white/10 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 px-2 text-xs text-white/90 w-full sm:w-auto">
            <MapPin className="w-4 h-4 text-teal-light shrink-0" />
            <span className="truncate">
              {riskData?.zone_name || 'Detecting flood risk at your current location...'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={locating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-white text-navy-ink hover:bg-white/90 text-xs font-semibold transition-colors shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 text-teal-deep ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? t('acquiringGps') : t('useCurrentLocation')}</span>
          </button>
        </div>
      </div>

      {/* 2. Four Tinted Tiles (Screen 1 Mockup) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tile 1: I Need Help (Red) */}
        <Link
          to="/citizen/sos"
          className="p-4 rounded-md border border-[#F8D2D0] bg-[#FDF2F2] hover:bg-[#FCE8E8] transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded bg-[#B42318] text-white">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-[#B42318] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-3">
            <h3 className="font-bold text-[#B42318] text-sm sm:text-base">{t('iNeedHelp')}</h3>
            <p className="text-[11px] text-[#8E1C12] mt-0.5 leading-snug">
              {t('iNeedHelpDesc')}
            </p>
          </div>
        </Link>

        {/* Tile 2: Find Shelter (Blue) - Step 7 */}
        <Link
          to="/citizen/shelters"
          className="p-4 rounded-md border border-[#B2DDFF] bg-[#EFF8FF] hover:bg-[#E0F2FE] transition-all flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded bg-[#175CD3] text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-[#175CD3] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-3">
            <h3 className="font-bold text-[#175CD3] text-sm sm:text-base">{t('findShelter')}</h3>
            <p className="text-[11px] text-[#1554C0] mt-0.5 leading-snug">
              {t('findShelterDesc')}
            </p>
          </div>
        </Link>

        {/* Tile 3: Safe Route (Green) */}
        <Link
          to="/citizen/route"
          className="p-4 rounded-md border border-[#C3E4D1] bg-[#EDF6F1] hover:bg-[#DEF0E5] transition-all flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded bg-[#3B7A57] text-white">
              <Compass className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-[#3B7A57] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-3">
            <h3 className="font-bold text-[#3B7A57] text-sm sm:text-base">{t('safeRouteTile')}</h3>
            <p className="text-[11px] text-[#2F6145] mt-0.5 leading-snug">
              {t('safeRouteDesc')}
            </p>
          </div>
        </Link>

        {/* Tile 4: View Alerts (Purple/Indigo Tint) */}
        <Link
          to="/citizen/alerts"
          className="p-4 rounded-md border border-[#DDD6FE] bg-[#F5F3FF] hover:bg-[#EDE9FE] transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded bg-[#5925DC] text-white">
              <Bell className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-[#5925DC] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-3">
            <h3 className="font-bold text-[#5925DC] text-sm sm:text-base">{t('viewAlerts')}</h3>
            <p className="text-[11px] text-[#4A1FB8] mt-0.5 leading-snug">
              {t('viewAlertsDesc')}
            </p>
          </div>
        </Link>
      </div>

      {/* 3. Emergency Contacts Strip (Tap-to-call, Screen 1 Mockup) */}
      <div className="bg-surface p-4 rounded-md border border-app-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-navy-ink uppercase tracking-wider">
            {t('emergencyContactsTitle')}
          </span>
          <span className="text-[11px] text-muted-text">Toll-Free 24x7</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <a
            href="tel:112"
            className="flex items-center justify-between p-2.5 rounded bg-app-bg hover:bg-[#EAE6DE] border border-app-border transition-colors text-xs"
          >
            <div>
              <p className="font-medium text-navy-ink">{t('police')}</p>
              <p className="text-[10px] text-muted-text">National Dispatch</p>
            </div>
            <span className="font-mono font-bold text-teal-deep text-sm">112</span>
          </a>

          <a
            href="tel:108"
            className="flex items-center justify-between p-2.5 rounded bg-app-bg hover:bg-[#EAE6DE] border border-app-border transition-colors text-xs"
          >
            <div>
              <p className="font-medium text-navy-ink">{t('ambulance')}</p>
              <p className="text-[10px] text-muted-text">Medical Rescue</p>
            </div>
            <span className="font-mono font-bold text-[#B42318] text-sm">108</span>
          </a>

          <a
            href="tel:101"
            className="flex items-center justify-between p-2.5 rounded bg-app-bg hover:bg-[#EAE6DE] border border-app-border transition-colors text-xs"
          >
            <div>
              <p className="font-medium text-navy-ink">{t('fire')}</p>
              <p className="text-[10px] text-muted-text">SDRF Boat Unit</p>
            </div>
            <span className="font-mono font-bold text-[#B54708] text-sm">101</span>
          </a>

          <a
            href="tel:1098"
            className="flex items-center justify-between p-2.5 rounded bg-app-bg hover:bg-[#EAE6DE] border border-app-border transition-colors text-xs"
          >
            <div>
              <p className="font-medium text-navy-ink">{t('childHelpline')}</p>
              <p className="text-[10px] text-muted-text">Vulnerable Support</p>
            </div>
            <span className="font-mono font-bold text-[#5925DC] text-sm">1098</span>
          </a>
        </div>
      </div>

      {/* Prepare for Offline Card (Phase 1) */}
      <PrepareOfflineCard />

      {/* ========================================================================= */}
      {/* SCREEN 2: LOCATION & RISK STATUS CARD */}
      {/* ========================================================================= */}
      <Card className={`border ${currentRiskColor.border} overflow-hidden shadow-sm`}>
        <CardHeader className={`${currentRiskColor.bg} border-b ${currentRiskColor.border} py-3.5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={currentRiskColor.badge} size="sm">
                  {riskData?.risk_level ? `${riskData.risk_level.toUpperCase()} RISK` : 'HIGH INUNDATION RISK'}
                </Badge>
                <span className="text-xs text-muted-text font-mono">
                  Coordinates: {maskCoordinate(userCoords[0])} N, {maskCoordinate(userCoords[1])} E
                </span>
              </div>
              <h2 className="text-lg font-bold text-navy-ink mt-1">
                {riskData?.zone_name || 'Musi River Basin - Chaderghat Sector'}
              </h2>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={MapPin}
              onClick={() => {
                const el = document.getElementById('citizen-shared-map');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View on Map
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Recommended Actions */}
          <div>
            <h4 className="text-xs font-semibold text-navy-ink uppercase tracking-wider mb-2">
              Recommended Protective Actions:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(riskData?.recommended_actions || [
                'Move to higher ground immediately (do not wait for water levels to rise)',
                'Avoid flooded roads and low-lying underpasses',
                'Keep essential documents, cash, and medicines in waterproof bags',
                'Follow official instructions from GHMC and SDRF field units'
              ]).map((action, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-app-bg border border-app-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-deep mt-1.5 shrink-0" />
                  <span className="text-navy-ink leading-relaxed">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons: Find Safe Route, Find Nearest Shelter & Report Hazard */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 border-t border-app-border">
            <Link to="/citizen/route" className="flex-1">
              <Button
                variant="primary"
                size="md"
                icon={Compass}
                className="w-full"
              >
                Find Safe Route
              </Button>
            </Link>

            <Link to="/citizen/shelters" className="flex-1">
              <Button
                variant="outline"
                size="md"
                icon={Building2}
                className="w-full"
              >
                Find Nearest Shelter
              </Button>
            </Link>

            <Button
              variant="outline"
              size="md"
              icon={AlertTriangle}
              onClick={() => setShowHazardModal(true)}
              className="flex-1 border-[#F8D2D0] text-[#B42318] hover:bg-[#FDF2F2]"
            >
              Report Road Hazard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SHARED LIVE FLOOD MAP (Step 3 Reusable Component) */}
      {/* ========================================================================= */}
      <div id="citizen-shared-map" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-navy-ink">Interactive Emergency Operations Map</h3>
            <p className="text-xs text-muted-text">Live flood zones, road closures, shelters, and medical facilities</p>
          </div>
          <Link to="/citizen/map">
            <Button variant="outline" size="sm" icon={ExternalLink}>
              Fullscreen Map
            </Button>
          </Link>
        </div>

        <Card className="border-app-border">
          <CardHeader className="bg-[#FAF9F6] pb-3">
            <Layers
              role="citizen"
              layers={layers}
              onToggleLayer={handleToggleLayer}
              onSelectLocation={handleSelectLocation}
            />
          </CardHeader>
          <CardContent className="p-0 relative">
            <FloodMap
              ref={mapRef}
              layers={layers}
              height="440px"
              center={HYDERABAD_CENTER}
              zoom={12}
              userLocation={userCoords}
            />
            <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
              <Legend
                onZoomIn={() => mapRef.current?.zoomIn()}
                onZoomOut={() => mapRef.current?.zoomOut()}
                onLocateUser={handleLocateUser}
                onResetView={() => mapRef.current?.resetView()}
                locating={locating}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Up Preview Modal for Steps 6 & 7 */}
      {comingUpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface max-w-sm w-full p-5 rounded-lg border border-app-border shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="teal" size="sm">{comingUpModal.step} Module</Badge>
              <button
                type="button"
                onClick={() => setComingUpModal(null)}
                className="text-muted-text hover:text-navy-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-bold text-navy-ink">{comingUpModal.title}</h3>
            <p className="text-xs text-muted-text leading-relaxed">
              {comingUpModal.desc}
            </p>
            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setComingUpModal(null)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hazard Report Modal (Step 9 Requirement 9) */}
      <HazardReportModal
        isOpen={showHazardModal}
        onClose={() => setShowHazardModal(false)}
        userCoords={userCoords}
      />
    </div>
  );
};

export default CitizenDashboard;
