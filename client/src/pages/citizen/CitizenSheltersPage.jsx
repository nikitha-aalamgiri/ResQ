import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Modal
} from '../../components/ui';
import {
  Building2,
  MapPin,
  Compass,
  Navigation,
  Phone,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Milestone,
  ArrowUpDown,
  ExternalLink,
  Shield,
  HeartPulse,
  Droplets,
  Utensils,
  Accessibility,
  Dog,
  Users
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { FloodMap } from '../../components/map/FloodMap';
import { useLang } from '../../context/LangContext';
import { getCachedShelters, saveCachedShelters } from '../../lib/offlineStore';

export function CitizenSheltersPage() {
  const navigate = useNavigate();
  const { t, formatDistance, formatDuration, formatNumber } = useLang();

  // Citizen Reference Location (Hyderabad Musi Basin default)
  const [userLocation, setUserLocation] = useState([17.3750, 78.4830]);
  const [locating, setLocating] = useState(false);

  // Shelter Data
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'filling_fast' | 'full'
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'capacity' | 'occupancy'

  // Map Modal State for "View on Map"
  const [selectedShelterForMap, setSelectedShelterForMap] = useState(null);

  // Fetch shelters with distance calculation & offline cache fallback
  const fetchShelters = async () => {
    setLoading(true);
    setError(null);

    const isOffline = !navigator.onLine || localStorage.getItem('resq_simulated_offline') === 'true';
    if (isOffline) {
      const cached = getCachedShelters();
      setShelters(cached);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch(`/shelters?lat=${userLocation[0]}&lng=${userLocation[1]}`);
      if (res && res.data) {
        setShelters(res.data);
        saveCachedShelters(res.data);
      }
    } catch (err) {
      console.warn('[CitizenSheltersPage] Network error fetching shelters, using local cache:', err);
      const cached = getCachedShelters();
      if (cached && cached.length > 0) {
        setShelters(cached);
      } else {
        setError('Failed to fetch real-time relief camp telemetry.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, [userLocation]);

  // GPS Locate Action
  const handleLocateMe = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setLocating(false);
        },
        () => {
          // Keep current coords
          setLocating(false);
        },
        { timeout: 5000 }
      );
    } else {
      setLocating(false);
    }
  };

  // Filter & Sort Logic
  const filteredShelters = shelters.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.area && s.area.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || s.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  filteredShelters.sort((a, b) => {
    if (sortBy === 'distance') {
      return (a.distance_km || 0) - (b.distance_km || 0);
    }
    if (sortBy === 'capacity') {
      return (b.spare_capacity || 0) - (a.spare_capacity || 0);
    }
    return (a.occupancy || 0) - (b.occupancy || 0);
  });

  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDF6F1] text-[#2F6145] border border-[#C3E4D1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B7A57]" />
            {t('open')}
          </span>
        );
      case 'filling_fast':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FADCC3]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B54708]" />
            {t('fillingFast')}
          </span>
        );
      case 'full':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDF2F2] text-[#B42318] border border-[#F8D2D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
            {t('full')}
          </span>
        );
      default:
        return <Badge variant="teal">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Hero Banner with allowed gradient */}
      <div className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white p-6 sm:p-7 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-teal-light text-[11px] font-mono mb-2">
              <Building2 className="w-3.5 h-3.5 text-teal-light" />
              {t('sector')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {t('sheltersTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[#C4D9DF] mt-1 max-w-xl leading-relaxed">
              {t('sheltersSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/citizen/route">
              <Button variant="primary" size="sm" icon={Compass} className="shadow-xs bg-white text-navy-ink hover:bg-white/90">
                {t('safeRoute')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Location Indicator & GPS Refresh */}
        <div className="mt-5 p-2 rounded-md bg-white/10 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-white">
          <div className="flex items-center gap-2 px-2">
            <MapPin className="w-4 h-4 text-teal-light shrink-0" />
            <span>Calculating distances from: </span>
            <span className="font-mono font-semibold text-white">
              {userLocation[0].toFixed(4)}° N, {userLocation[1].toFixed(4)}° E (Musi Basin)
            </span>
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-colors"
          >
            <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? t('acquiringGps') : t('useCurrentLocation')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-app-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by shelter name, area, or landmark..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-app-border bg-app-bg text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              />
            </div>

            {/* Filter Chips by Status */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-text uppercase mr-1">{t('common.status')}:</span>
              {[
                { label: t('all'), value: 'all' },
                { label: t('open'), value: 'open' },
                { label: t('fillingFast'), value: 'filling_fast' },
                { label: t('full'), value: 'full' },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? 'bg-teal-deep text-white shadow-xs'
                      : 'bg-app-bg text-muted-text hover:text-navy-ink border border-app-border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-text shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-app-border bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              >
                <option value="distance">Sort by Distance</option>
                <option value="capacity">Sort by Spare Beds</option>
                <option value="occupancy">Sort by Occupancy</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shelter List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-muted-text">
          Loading verified Hyderabad relief camp facilities...
        </div>
      ) : filteredShelters.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-app-border rounded-md bg-app-bg text-muted-text space-y-2">
          <Building2 className="w-8 h-8 mx-auto text-muted-text/60" />
          <p className="text-sm font-semibold text-navy-ink">No shelters found matching criteria</p>
          <p className="text-xs">Try clearing the status filter or searching for another sector.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShelters.map((shelter) => {
            const occPct = Math.round(((shelter.occupancy || 0) / (shelter.capacity || 1)) * 100);
            const isFull = shelter.status === 'full';

            return (
              <Card key={shelter.id} className="border-app-border overflow-hidden hover:border-teal-deep/50 transition-colors shadow-xs">
                <div className="flex flex-col sm:flex-row">
                  {/* Shelter Photo Thumbnail */}
                  <div className="sm:w-56 h-48 sm:h-auto shrink-0 relative bg-app-bg overflow-hidden border-b sm:border-b-0 sm:border-r border-app-border">
                    <img
                      src={shelter.image}
                      alt={shelter.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                      {renderStatusBadge(shelter.status)}
                    </div>
                  </div>

                  {/* Shelter Details */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-navy-ink text-base sm:text-lg leading-tight">
                              {shelter.name}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-text mt-0.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                            <span>{shelter.address}</span>
                          </p>
                        </div>

                        {/* Distance & Drive Time */}
                        <div className="text-left sm:text-right shrink-0">
                          <div className="flex items-center sm:justify-end gap-1.5 font-mono text-sm font-bold text-navy-ink">
                            <Milestone className="w-4 h-4 text-teal-deep" />
                            <span>{formatDistance(shelter.distance_km || 2.8)}</span>
                          </div>
                          <span className="text-[11px] text-muted-text font-mono block">
                            ~{formatDuration(shelter.drive_time_min || 12)}
                          </span>
                        </div>
                      </div>

                      {/* Capacity & Occupancy Progress Bar */}
                      <div className="mt-3.5 p-3 rounded-md bg-app-bg border border-app-border space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-navy-ink flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-teal-deep" />
                            {t('common.status')}:
                          </span>
                          <span className="font-mono text-xs">
                            <strong>{formatNumber(shelter.occupancy)}</strong> / {formatNumber(shelter.capacity)} {t('occupiedBeds')} ({occPct}%)
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-[#E2DED6] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isFull ? 'bg-[#B42318]' : occPct >= 75 ? 'bg-[#B54708]' : 'bg-[#3B7A57]'
                            }`}
                            style={{ width: `${Math.min(100, occPct)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-text pt-0.5">
                          <span className={shelter.spare_capacity > 0 ? 'text-[#3B7A57] font-bold' : 'text-[#B42318] font-bold'}>
                            {formatNumber(shelter.spare_capacity)} {t('availableBeds')}
                          </span>
                          <span>Officer: {shelter.contact_person}</span>
                        </div>
                      </div>

                      {/* Facilities / Supply Chips */}
                      <div className="mt-3">
                        <span className="text-[10px] font-semibold text-muted-text uppercase tracking-wider block mb-1.5">
                          {t('reliefStockTitle')}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {shelter.supplies?.food && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-light text-teal-deep text-[11px] border border-[#c4dcde]">
                              <Utensils className="w-3 h-3" /> {t('foodPackets')}
                            </span>
                          )}
                          {shelter.supplies?.water && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-light text-teal-deep text-[11px] border border-[#c4dcde]">
                              <Droplets className="w-3 h-3" /> {t('waterBottles')}
                            </span>
                          )}
                          {shelter.supplies?.medical && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-light text-teal-deep text-[11px] border border-[#c4dcde]">
                              <HeartPulse className="w-3 h-3" /> {t('medicalKits')}
                            </span>
                          )}
                          {shelter.supplies?.accessible && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-light text-teal-deep text-[11px] border border-[#c4dcde]">
                              <Accessibility className="w-3 h-3" /> {t('accessible')}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                            shelter.supplies?.pets
                              ? 'bg-teal-light text-teal-deep border-[#c4dcde]'
                              : 'bg-app-bg text-muted-text border-app-border'
                          }`}>
                            <Dog className="w-3 h-3" /> {t('pets')}: {shelter.supplies?.pets ? t('common.yes') : t('common.no')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-app-border flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3.5 h-3.5 text-teal-deep" />
                        <a
                          href={`tel:${shelter.contact_phone}`}
                          className="font-mono text-teal-deep font-semibold hover:underline"
                        >
                          {shelter.contact_phone}
                        </a>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={MapPin}
                          className="flex-1 sm:flex-none text-xs"
                          onClick={() => setSelectedShelterForMap(shelter)}
                        >
                          {t('viewOnMap')}
                        </Button>

                        <Link
                          to={`/citizen/route?shelter=${shelter.id}`}
                          className="flex-1 sm:flex-none"
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Compass}
                            className="w-full text-xs font-semibold"
                          >
                            {t('navigate')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* View on Map Modal */}
      {selectedShelterForMap && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedShelterForMap(null)}
          title={`Camp Location: ${selectedShelterForMap.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="h-80 w-full rounded-md overflow-hidden border border-app-border relative">
              <FloodMap
                height="100%"
                center={[selectedShelterForMap.lat, selectedShelterForMap.lng]}
                zoom={14}
                destination={[selectedShelterForMap.lat, selectedShelterForMap.lng]}
                destinationLabel={selectedShelterForMap.name}
                userLocation={userLocation}
                layers={{
                  zones: true,
                  shelters: true,
                  hospitals: false,
                  roads: true,
                  sos: false,
                  responders: false,
                }}
              />
            </div>

            <div className="p-3 rounded-md bg-app-bg border border-app-border flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-navy-ink">{selectedShelterForMap.address}</p>
                <p className="text-muted-text font-mono text-[11px] mt-0.5">
                  Distance: {selectedShelterForMap.distance_km || '2.8'} km • Available Beds: {selectedShelterForMap.spare_capacity}
                </p>
              </div>

              <Link to={`/citizen/route?shelter=${selectedShelterForMap.id}`}>
                <Button variant="primary" size="sm" icon={Compass}>
                  Launch Navigation
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CitizenSheltersPage;
