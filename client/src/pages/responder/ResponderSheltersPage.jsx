import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Building2,
  MapPin,
  Compass,
  Navigation,
  Phone,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Milestone,
  Users,
  Shield,
  Utensils,
  Droplets,
  HeartPulse,
  Accessibility,
  Dog,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { FloodMap } from '../../components/map/FloodMap';

export function ResponderSheltersPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  // Field Unit Location (Amberpet Station Alpha default)
  const responderCoords = [17.3780, 78.5020];

  // Shelter List State
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShelterId, setSelectedShelterId] = useState(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchShelters = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/shelters?lat=${responderCoords[0]}&lng=${responderCoords[1]}`);
      if (res && res.data) {
        setShelters(res.data);
        if (res.data.length > 0 && !selectedShelterId) {
          setSelectedShelterId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('[ResponderSheltersPage] Error fetching shelters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, []);

  // Filter shelters
  const filteredShelters = shelters.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.area && s.area.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || s.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const selectedShelter = shelters.find((s) => s.id === selectedShelterId) || shelters[0];

  const handleSelectShelter = (s) => {
    setSelectedShelterId(s.id);
    mapRef.current?.flyTo(s.lat, s.lng, 15);
  };

  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDF6F1] text-[#2F6145] border border-[#C3E4D1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B7A57]" />
            Open
          </span>
        );
      case 'filling_fast':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FADCC3]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B54708]" />
            Filling Fast
          </span>
        );
      case 'full':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF2F2] text-[#B42318] border border-[#F8D2D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
            Full
          </span>
        );
      default:
        return <Badge variant="teal">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-navy-ink font-mono">
              FIELD RELIEF CAMPS & EVACUATION HUBS
            </h1>
            <Badge variant="teal" size="sm">Logistics GIS</Badge>
          </div>
          <p className="text-[11px] text-muted-text mt-0.5">
            Real-time intake capacity, resource desks, and ambulance transfer coordinates for NDRF & DRF units
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-text">Unit Base:</span>
          <span className="font-mono font-bold text-navy-ink">Station Alpha (Amberpet)</span>
        </div>
      </div>

      {/* 2-Column Split: Left List with Search & Cards (5 cols) • Right Map with Legend (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Search & Shelter Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-app-border">
            <CardContent className="p-3.5 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter camps by name, area, or road..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-app-border bg-app-bg text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'All Camps', value: 'all' },
                  { label: 'Open', value: 'open' },
                  { label: 'Filling Fast', value: 'filling_fast' },
                  { label: 'Full', value: 'full' },
                ].map((btn) => (
                  <button
                    key={btn.value}
                    type="button"
                    onClick={() => setStatusFilter(btn.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      statusFilter === btn.value
                        ? 'bg-teal-deep text-white shadow-xs'
                        : 'bg-app-bg text-muted-text hover:text-navy-ink border border-app-border'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scrollable List of Shelter Cards */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-muted-text">
                Syncing field shelter intake data...
              </div>
            ) : filteredShelters.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-text border border-app-border rounded-md bg-app-bg">
                No relief camps match search filter.
              </div>
            ) : (
              filteredShelters.map((s) => {
                const isSelected = s.id === selectedShelterId;
                const occPct = Math.round(((s.occupancy || 0) / (s.capacity || 1)) * 100);

                return (
                  <Card
                    key={s.id}
                    onClick={() => handleSelectShelter(s)}
                    className={`border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-deep ring-2 ring-teal-deep/20 shadow-sm bg-surface'
                        : 'border-app-border bg-surface hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="p-3.5 space-y-2.5">
                      {/* Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-navy-ink text-xs sm:text-sm leading-snug">
                            {s.name}
                          </h3>
                          <p className="text-[11px] text-muted-text mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-teal-deep shrink-0" />
                            <span>{s.address}</span>
                          </p>
                        </div>
                        {renderStatusBadge(s.status)}
                      </div>

                      {/* Distance & Telemetry */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-teal-deep font-semibold">
                          {s.distance_km || '2.8'} km • ~{s.drive_time_min || '12'} min
                        </span>
                        <span className={s.spare_capacity > 0 ? 'text-[#3B7A57] font-bold' : 'text-[#B42318] font-bold'}>
                          {s.spare_capacity} Beds Free
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-[#E2DED6] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              s.status === 'full' ? 'bg-[#B42318]' : occPct >= 75 ? 'bg-[#B54708]' : 'bg-[#3B7A57]'
                            }`}
                            style={{ width: `${Math.min(100, occPct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-text font-mono">
                          <span>Occupancy: {s.occupancy} / {s.capacity}</span>
                          <span>{occPct}%</span>
                        </div>
                      </div>

                      {/* Supply Chips */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {s.supplies?.food && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-light text-teal-deep text-[10px] border border-[#c4dcde]">
                            Food Packets
                          </span>
                        )}
                        {s.supplies?.water && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-light text-teal-deep text-[10px] border border-[#c4dcde]">
                            Water
                          </span>
                        )}
                        {s.supplies?.medical && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-light text-teal-deep text-[10px] border border-[#c4dcde]">
                            Medical
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-app-bg text-muted-text text-[10px] border border-app-border">
                          Pets: {s.supplies?.pets ? 'Yes' : 'No'}
                        </span>
                      </div>

                      {/* Contact & Route Action */}
                      <div className="pt-2 border-t border-app-border flex items-center justify-between text-xs">
                        <span className="text-[11px] font-mono text-muted-text">
                          Officer: {s.contact_person}
                        </span>
                        <Link
                          to={`/citizen/route?shelter=${s.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-semibold text-teal-deep hover:underline text-xs"
                        >
                          Route Evacuees <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Map with Custom Legend (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-ink uppercase tracking-wider">
              Live Shelter GIS Canvas
            </span>
            <span className="text-[11px] text-muted-text">
              Selected: <strong className="text-navy-ink">{selectedShelter?.name || 'Kotla Stadium'}</strong>
            </span>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-app-border bg-surface shadow-sm">
            <FloodMap
              ref={mapRef}
              height="650px"
              center={selectedShelter ? [selectedShelter.lat, selectedShelter.lng] : [17.4010, 78.4740]}
              zoom={13}
              userLocation={responderCoords}
              destination={selectedShelter ? [selectedShelter.lat, selectedShelter.lng] : null}
              destinationLabel={selectedShelter?.name}
              layers={{
                zones: true,
                shelters: true,
                hospitals: true,
                roads: true,
                sos: true,
                responders: true,
              }}
            />

            {/* Custom Shelter Legend (Open, Filling Fast, Full) */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-surface/95 backdrop-blur-xs p-3 rounded-md border border-app-border shadow-md text-xs space-y-2 min-w-[200px]">
              <span className="font-mono text-[10px] font-bold text-navy-ink uppercase block border-b border-app-border pb-1">
                Relief Camp Capacity Legend
              </span>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#3B7A57] border border-white shrink-0 shadow-xs" />
                <div>
                  <span className="font-semibold text-navy-ink text-xs block">Open</span>
                  <span className="text-[10px] text-muted-text">&lt; 75% capacity utilized</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#B54708] border border-white shrink-0 shadow-xs" />
                <div>
                  <span className="font-semibold text-navy-ink text-xs block">Filling Fast</span>
                  <span className="text-[10px] text-muted-text">75% - 99% capacity</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#B42318] border border-white shrink-0 shadow-xs" />
                <div>
                  <span className="font-semibold text-navy-ink text-xs block">Full</span>
                  <span className="text-[10px] text-muted-text">100% capacity reached</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-app-border text-[10px] text-muted-text">
                Tap any shelter marker for live bed telemetry and ambulance contacts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResponderSheltersPage;
