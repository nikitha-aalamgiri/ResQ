import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Input, Toast } from '../../components/ui';
import {
  Search,
  Filter,
  AlertTriangle,
  Radio,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  LifeBuoy,
  HeartPulse,
  Droplets,
  Building2,
  UserX,
  ExternalLink
} from 'lucide-react';

export const ResponderTriagePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, critical, high, medium, resolved
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchIncidents = async () => {
    try {
      const res = await apiFetch('/sos');
      if (res.success && res.data) {
        setIncidents(res.data);
      }
    } catch (err) {
      setToast({
        title: 'Query Error',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter tab counts
  const allCount = incidents.length;
  const criticalCount = incidents.filter((i) => i.priority === 'critical' && i.status !== 'RESOLVED').length;
  const highCount = incidents.filter((i) => i.priority === 'high' && i.status !== 'RESOLVED').length;
  const mediumCount = incidents.filter((i) => (i.priority === 'medium' || i.priority === 'low') && i.status !== 'RESOLVED').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  // Filtered incidents list
  const filteredIncidents = incidents.filter((item) => {
    // 1. Tab filter
    if (activeTab === 'critical' && (item.priority !== 'critical' || item.status === 'RESOLVED')) return false;
    if (activeTab === 'high' && (item.priority !== 'high' || item.status === 'RESOLVED')) return false;
    if (activeTab === 'medium' && (item.priority !== 'medium' && item.priority !== 'low' || item.status === 'RESOLVED')) return false;
    if (activeTab === 'resolved' && item.status !== 'RESOLVED' && item.status !== 'CLOSED') return false;

    // 2. Unassigned filter
    if (unassignedOnly && item.assigned_responder_id) return false;

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.id.toLowerCase().includes(q) ||
        (item.emergency_type && item.emergency_type.toLowerCase().includes(q)) ||
        (item.citizen_name && item.citizen_name.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.landmark && item.landmark.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const getEmergencyIcon = (type) => {
    const t = String(type).toLowerCase();
    if (t.includes('trapped')) return AlertTriangle;
    if (t.includes('evac')) return LifeBuoy;
    if (t.includes('med')) return HeartPulse;
    if (t.includes('food') || t.includes('water')) return Droplets;
    if (t.includes('shelter')) return Building2;
    return UserX;
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-navy-ink font-mono uppercase">
              Field Incident Triage Queue
            </h2>
            <Badge variant="teal" size="sm">{filteredIncidents.length} Visible</Badge>
          </div>
          <p className="text-xs text-muted-text mt-0.5">
            Active distress calls reported across the Hyderabad sector • Real-time telemetry feed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={fetchIncidents}
            loading={loading}
          >
            Refresh Queue
          </Button>
          <Link to="/responder/map">
            <Button variant="primary" size="sm" icon={MapPin}>
              Tactical Map
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar & Filter Controls (Requirement 2) */}
      <Card className="border-app-border">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Incident ID (e.g. FQ1024), emergency type, area, or landmark..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-app-bg border border-app-border rounded-md placeholder:text-muted-text/60 focus:outline-none focus:ring-1 focus:ring-teal-deep"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setUnassignedOnly(!unassignedOnly)}
              className={`px-3 py-2 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                unassignedOnly
                  ? 'border-teal-deep bg-teal-light text-teal-deep font-bold'
                  : 'border-app-border bg-surface text-muted-text hover:bg-app-bg'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{unassignedOnly ? 'Showing Unassigned' : 'Filter: All Units'}</span>
            </button>
          </div>

          {/* Filter Tabs with Counts (Requirement 2) */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-app-border">
            {[
              { id: 'all', label: 'All Incidents', count: allCount, badgeVar: 'teal' },
              { id: 'critical', label: 'Critical', count: criticalCount, badgeVar: 'critical' },
              { id: 'high', label: 'High Priority', count: highCount, badgeVar: 'high' },
              { id: 'medium', label: 'Medium', count: mediumCount, badgeVar: 'medium' },
              { id: 'resolved', label: 'Resolved', count: resolvedCount, badgeVar: 'low' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-navy-ink text-white font-semibold'
                    : 'text-muted-text hover:text-navy-ink hover:bg-app-bg'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-app-bg text-muted-text'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incidents Rows / List (Requirement 2) */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-app-border rounded-md text-xs text-muted-text space-y-1">
            <CheckCircle2 className="w-8 h-8 text-[#3B7A57] mx-auto mb-2" />
            <p className="font-semibold text-navy-ink">No matching distress incidents</p>
            <p>All queue filters cleared or incidents already resolved in this sector.</p>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const Icon = getEmergencyIcon(inc.emergency_type);
            const isAssignedToMe = inc.assigned_responder_id === user?.id;

            return (
              <Card
                key={inc.id}
                className="border-app-border hover:border-teal-deep/50 transition-colors overflow-hidden"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-3.5">
                    {/* Thumbnail: Attached photo or priority icon badge */}
                    <div className="shrink-0">
                      {inc.photo_url ? (
                        <img
                          src={inc.photo_url}
                          alt="Incident thumbnail"
                          className="w-12 h-12 rounded object-cover border border-app-border"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded flex items-center justify-center border ${
                          inc.priority === 'critical'
                            ? 'bg-[#FDF2F2] border-[#F8D2D0] text-[#B42318]'
                            : inc.priority === 'high'
                            ? 'bg-[#FEF6EE] border-[#FADCC3] text-[#B54708]'
                            : 'bg-app-bg border-app-border text-teal-deep'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                    </div>

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
                        <Badge variant={inc.status === 'RESOLVED' ? 'low' : inc.status === 'ACCEPTED' ? 'teal' : 'default'} size="sm">
                          {inc.status}
                        </Badge>
                        {isAssignedToMe && (
                          <Badge variant="teal" size="sm">Assigned to You</Badge>
                        )}
                      </div>

                      {/* Type and People count */}
                      <p className="text-xs font-semibold text-navy-ink">
                        {inc.emergency_type} •{' '}
                        <span className="font-mono text-muted-text font-normal">
                          {inc.people_count} {inc.people_count === 1 ? 'person' : 'persons'}
                        </span>
                        {inc.anyone_injured && (
                          <span className="text-[#B42318] font-bold ml-1.5 text-[11px]">
                            • Injured
                          </span>
                        )}
                      </p>

                      {/* Area & Landmark */}
                      <p className="text-[11px] text-muted-text flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-text/80 shrink-0" />
                        <span className="truncate max-w-sm">{inc.address}</span>
                        {inc.landmark && <span className="text-navy-ink font-medium">({inc.landmark})</span>}
                      </p>
                    </div>
                  </div>

                  {/* Right: Telemetry & View Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-app-border">
                    <div className="text-right text-[11px] font-mono text-muted-text">
                      <p className="text-navy-ink font-bold">~{inc.distance_km || '1.2'} km away</p>
                      <p className="text-[10px] text-muted-text flex items-center sm:justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inc.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <Link to={`/responder/incidents/${inc.id}`}>
                      <Button variant="outline" size="sm" icon={ArrowRight}>
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ResponderTriagePage;
