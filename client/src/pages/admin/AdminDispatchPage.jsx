import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent, onSOSEvent } from '../../lib/broadcast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Modal,
  Toast
} from '../../components/ui';
import {
  Radio,
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  LifeBuoy,
  ShieldAlert,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Eye,
  RotateCcw,
  CheckCircle2,
  X,
  Phone,
  HeartPulse,
  Compass,
  AlertOctagon,
  ChevronDown
} from 'lucide-react';

const RESPONDER_UNITS = [
  { id: 'resp-001', name: 'Inspector K. Vikram', agency: '10th Battalion NDRF Alpha' },
  { id: 'resp-002', name: 'Capt. Ananya Rao', agency: 'GHMC DRF Team Alpha' },
  { id: 'resp-003', name: 'SI Rajesh Verma', agency: 'Telangana SDRF Heavy Unit' },
  { id: 'resp-004', name: 'Sub-Inspector P. Naidu', agency: '10th Battalion NDRF Bravo' },
];

const EMERGENCY_TYPES = [
  'All Types',
  'Trapped in Rising Water',
  'Medical Emergency',
  'Senior Citizen Evacuation',
  'Structural Damage',
  'Electrical Hazard',
  'Food & Clean Water Cutoff'
];

export const AdminDispatchPage = () => {
  const { user, profile } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters & State
  const [activeTab, setActiveTab] = useState('All'); // All, Critical, High, Medium, Resolved
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [sortBy, setSortBy] = useState('latest'); // latest, oldest, priority, people

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkResponder, setBulkResponder] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal View
  const [viewingIncident, setViewingIncident] = useState(null);

  const fetchIncidents = async () => {
    try {
      const res = await apiFetch('/sos');
      if (res.success && Array.isArray(res.data)) {
        setIncidents(res.data);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setToast({
        title: 'Network Error',
        message: 'Could not refresh incident queue.',
        type: 'critical',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    // Cross-window real-time event listener
    const unsubscribe = onSOSEvent((event) => {
      if (
        event.type === 'SOS_CREATED' ||
        event.type === 'SOS_STATUS_CHANGED' ||
        event.type === 'INCIDENT_CLAIMED' ||
        event.type === 'INCIDENT_ASSIGNED'
      ) {
        fetchIncidents();
      }
    });

    const interval = setInterval(fetchIncidents, 6000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Compute counts for tabs
  const tabCounts = useMemo(() => {
    const counts = {
      All: incidents.length,
      Critical: 0,
      High: 0,
      Medium: 0,
      Resolved: 0,
    };

    incidents.forEach((item) => {
      const status = String(item.status).toUpperCase();
      const priority = String(item.priority).toLowerCase();

      if (status === 'RESOLVED' || status === 'CLOSED') {
        counts.Resolved += 1;
      } else {
        if (priority === 'critical') counts.Critical += 1;
        else if (priority === 'high') counts.High += 1;
        else if (priority === 'medium' || priority === 'low') counts.Medium += 1;
      }
    });

    return counts;
  }, [incidents]);

  // Filter & Sort
  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const status = String(item.status).toUpperCase();
      const priority = String(item.priority).toLowerCase();
      const isResolved = status === 'RESOLVED' || status === 'CLOSED';

      // 1. Tab Filter
      if (activeTab === 'Resolved' && !isResolved) return false;
      if (activeTab === 'Critical' && (isResolved || priority !== 'critical')) return false;
      if (activeTab === 'High' && (isResolved || priority !== 'high')) return false;
      if (activeTab === 'Medium' && (isResolved || (priority !== 'medium' && priority !== 'low'))) return false;

      // 2. Type Filter
      if (selectedType !== 'All Types' && item.emergency_type !== selectedType) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesCitizen = item.citizen_name?.toLowerCase().includes(q);
        const matchesAddress = item.address?.toLowerCase().includes(q);
        const matchesLandmark = item.landmark?.toLowerCase().includes(q);
        const matchesType = item.emergency_type?.toLowerCase().includes(q);
        if (!matchesId && !matchesCitizen && !matchesAddress && !matchesLandmark && !matchesType) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortBy === 'priority') {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[b.priority] || 0) - (order[a.priority] || 0);
      }
      if (sortBy === 'people') {
        return (b.people_count || 1) - (a.people_count || 1);
      }
      return 0;
    });
  }, [incidents, activeTab, selectedType, searchQuery, sortBy]);

  // Checkbox Selection Logic
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredIncidents.length && filteredIncidents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncidents.map((i) => i.id)));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Manual Assign Single Row
  const handleAssignSingle = async (incidentId, responderId) => {
    if (!responderId) return;
    const targetUnit = RESPONDER_UNITS.find((u) => u.id === responderId);
    try {
      const res = await apiFetch(`/sos/${incidentId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          responderId,
          responderName: targetUnit?.name || 'Field Responder',
          agencyName: targetUnit?.agency || 'Emergency Response Unit',
          notes: `Manually dispatched by Admin ${profile?.full_name || 'SEOC Admin'}`,
        }),
      });

      if (res.success) {
        broadcastSOSEvent({
          type: 'INCIDENT_ASSIGNED',
          sosId: incidentId,
          responderId,
          responderName: targetUnit?.name,
        });

        setToast({
          title: 'Responder Dispatched',
          message: `Assigned #${incidentId} to ${targetUnit?.name} (${targetUnit?.agency})`,
          type: 'low',
        });
        fetchIncidents();
      }
    } catch (err) {
      setToast({
        title: 'Assignment Failed',
        message: err.message,
        type: 'critical',
      });
    }
  };

  // Bulk Assign
  const handleBulkAssign = async () => {
    if (!bulkResponder || selectedIds.size === 0) return;
    setBulkLoading(true);
    const targetUnit = RESPONDER_UNITS.find((u) => u.id === bulkResponder);

    try {
      const res = await apiFetch('/sos/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'assign',
          value: {
            id: bulkResponder,
            name: targetUnit?.name,
            agency: targetUnit?.agency,
          },
        }),
      });

      if (res.success) {
        broadcastSOSEvent({
          type: 'INCIDENT_ASSIGNED',
          bulk: true,
          count: selectedIds.size,
        });

        setToast({
          title: 'Bulk Assignment Complete',
          message: `Dispatched ${selectedIds.size} incidents to ${targetUnit?.name}`,
          type: 'low',
        });
        setSelectedIds(new Set());
        setBulkResponder('');
        fetchIncidents();
      }
    } catch (err) {
      setToast({
        title: 'Bulk Action Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk Priority
  const handleBulkPriority = async () => {
    if (!bulkPriority || selectedIds.size === 0) return;
    setBulkLoading(true);

    try {
      const res = await apiFetch('/sos/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'priority',
          value: bulkPriority,
        }),
      });

      if (res.success) {
        broadcastSOSEvent({
          type: 'SOS_STATUS_CHANGED',
          bulk: true,
          count: selectedIds.size,
        });

        setToast({
          title: 'Priority Updated',
          message: `Set priority to ${bulkPriority.toUpperCase()} for ${selectedIds.size} incidents`,
          type: 'low',
        });
        setSelectedIds(new Set());
        setBulkPriority('');
        fetchIncidents();
      }
    } catch (err) {
      setToast({
        title: 'Bulk Action Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Status Chip mapping per Step 7 specification
  const getStatusChip = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'WAITING' || s === 'OPEN') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#FDF2F2] border border-[#F8D2D0] text-[#B42318]">
          New
        </span>
      );
    }
    if (s === 'ASSIGNED' || s === 'ACCEPTED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#EFF8FF] border border-[#B2DDFF] text-[#175CD3]">
          Assigned
        </span>
      );
    }
    if (s === 'ON_THE_WAY' || s === 'ARRIVED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#FEF6EE] border border-[#F9DBAF] text-[#B54708]">
          In Progress
        </span>
      );
    }
    if (s === 'RESCUED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#EDF6F1] border border-[#C3E4D1] text-[#3B7A57]">
          Verified
        </span>
      );
    }
    if (s === 'RESOLVED' || s === 'CLOSED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#FAF9F6] border border-app-border text-muted-text">
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-app-bg border border-app-border text-navy-ink">
        {status}
      </span>
    );
  };

  // Priority badge helper
  const getPriorityBadge = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'critical') {
      return <Badge variant="critical" size="sm">CRITICAL</Badge>;
    }
    if (p === 'high') {
      return <Badge variant="high" size="sm">HIGH</Badge>;
    }
    if (p === 'medium') {
      return <Badge variant="medium" size="sm">MEDIUM</Badge>;
    }
    return <Badge variant="low" size="sm">LOW</Badge>;
  };

  // Relative time helper
  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Just now';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-5 pb-20">
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-navy-ink">
              SEOC INCIDENT DISPATCH & MANAGEMENT
            </h2>
            <Badge variant="teal" size="sm">
              Live Queue
            </Badge>
          </div>
          <p className="text-xs text-muted-text mt-1">
            Centralized triage console for multi-agency field deployment (NDRF, GHMC DRF, SDRF)
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
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Tabs with Counts (Requirement: All, Critical, High, Medium, Resolved) */}
      <div className="flex items-center gap-1.5 border-b border-app-border overflow-x-auto pb-0.5">
        {[
          { id: 'All', label: 'All Incidents', count: tabCounts.All },
          { id: 'Critical', label: 'Critical', count: tabCounts.Critical, badgeColor: 'bg-[#FDF2F2] text-[#B42318]' },
          { id: 'High', label: 'High Priority', count: tabCounts.High, badgeColor: 'bg-[#FEF6EE] text-[#B54708]' },
          { id: 'Medium', label: 'Medium / Low', count: tabCounts.Medium, badgeColor: 'bg-[#FEFAEC] text-[#7A5E10]' },
          { id: 'Resolved', label: 'Resolved / Closed', count: tabCounts.Resolved, badgeColor: 'bg-[#EDF6F1] text-[#3B7A57]' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
                  : 'border-transparent text-muted-text hover:text-navy-ink hover:bg-surface/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  tab.badgeColor || (isActive ? 'bg-teal-light text-teal-deep' : 'bg-app-bg text-muted-text')
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Search, Type Filter, Sort (Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-surface p-4 rounded-md border border-app-border">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID (#HYD-...), citizen name, location, or landmark..."
            className="w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-deep font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text hover:text-navy-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Emergency Type Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full p-2 bg-app-bg border border-app-border rounded text-xs text-navy-ink focus:outline-none focus:ring-1 focus:ring-teal-deep"
          >
            {EMERGENCY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter (Latest, Oldest, Priority, People) */}
        <div className="sm:col-span-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full p-2 bg-app-bg border border-app-border rounded text-xs text-navy-ink focus:outline-none focus:ring-1 focus:ring-teal-deep"
          >
            <option value="latest">Sort: Latest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="priority">Sort: Highest Priority</option>
            <option value="people">Sort: Most People Trapped</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Action Bar (Requirement: row checkboxes with bulk action bar) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-16 z-30 bg-[#0F2A3D] text-white p-3 rounded-md shadow-lg border border-teal-deep flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-teal-deep px-2.5 py-1 rounded">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs text-white/90">
              Bulk Emergency Operations
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Assign */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkResponder}
                onChange={(e) => setBulkResponder(e.target.value)}
                className="p-1.5 bg-[#1F6F78] border border-white/20 rounded text-xs text-white focus:outline-none"
              >
                <option value="">Select Unit to Assign...</option>
                {RESPONDER_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.agency})
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkAssign}
                disabled={!bulkResponder || bulkLoading}
                loading={bulkLoading}
              >
                Assign
              </Button>
            </div>

            {/* Bulk Change Priority */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
              <select
                value={bulkPriority}
                onChange={(e) => setBulkPriority(e.target.value)}
                className="p-1.5 bg-[#1F6F78] border border-white/20 rounded text-xs text-white focus:outline-none"
              >
                <option value="">Change Priority...</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkPriority}
                disabled={!bulkPriority || bulkLoading}
                loading={bulkLoading}
                className="text-white border-white/30 hover:bg-white/10"
              >
                Set Priority
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-white/80 hover:text-white border-transparent"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Card (Requirement: rows with thumbnail, id, type, people count, priority badge, area, distance, time, status chip, View button, manual assign dropdown) */}
      <Card className="border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-app-border text-muted-text uppercase font-semibold font-mono text-[10px]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-navy-ink hover:text-teal-deep"
                    title="Select all on this page"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredIncidents.length ? (
                      <CheckSquare className="w-4 h-4 text-teal-deep" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3 w-14">Media</th>
                <th className="p-3 w-24">ID</th>
                <th className="p-3">Emergency Type</th>
                <th className="p-3 w-20">People</th>
                <th className="p-3 w-24">Priority</th>
                <th className="p-3">Area & Location</th>
                <th className="p-3 w-20">Dist</th>
                <th className="p-3 w-20">Time</th>
                <th className="p-3 w-24">Status</th>
                <th className="p-3 min-w-[200px]">Assign Field Unit</th>
                <th className="p-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-surface">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-muted-text font-mono">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-muted-text/50" />
                    No distress incidents found matching current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const assignedUnit = RESPONDER_UNITS.find(
                    (u) => u.id === item.assigned_responder_id || u.name === item.assigned_responder_id
                  );

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FAF9F6] transition-colors ${
                        isSelected ? 'bg-teal-light/20' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRow(item.id)}
                          className="text-navy-ink hover:text-teal-deep"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-deep" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-text" />
                          )}
                        </button>
                      </td>

                      {/* Thumbnail (Photo or Type Icon Box) */}
                      <td className="p-3">
                        {item.photo_url ? (
                          <div className="w-10 h-10 rounded border border-app-border overflow-hidden bg-black shrink-0">
                            <img
                              src={item.photo_url}
                              alt={item.id}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded border border-app-border bg-app-bg flex items-center justify-center shrink-0 text-muted-text">
                            <LifeBuoy className="w-4 h-4 text-teal-deep" />
                          </div>
                        )}
                      </td>

                      {/* ID */}
                      <td className="p-3 font-mono font-bold text-navy-ink whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* Type */}
                      <td className="p-3">
                        <span className="font-semibold text-navy-ink block truncate max-w-[180px]">
                          {item.emergency_type}
                        </span>
                        <span className="text-[10px] text-muted-text block truncate max-w-[180px]">
                          Citizen: {item.citizen_name || 'Resident'}
                        </span>
                      </td>

                      {/* People Count */}
                      <td className="p-3 font-mono font-medium text-navy-ink whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-muted-text" />
                          {item.people_count || 1}
                        </span>
                      </td>

                      {/* Priority Badge */}
                      <td className="p-3 whitespace-nowrap">
                        {getPriorityBadge(item.priority)}
                      </td>

                      {/* Area */}
                      <td className="p-3">
                        <p className="text-navy-ink truncate max-w-[190px] font-medium" title={item.address}>
                          {item.address}
                        </p>
                        {item.landmark && (
                          <p className="text-[10px] text-muted-text truncate max-w-[190px]">
                            {item.landmark}
                          </p>
                        )}
                      </td>

                      {/* Distance */}
                      <td className="p-3 font-mono text-muted-text whitespace-nowrap">
                        {item.distance_km || (2.1 + (item.latitude ? (item.latitude % 0.05) * 100 : 1.2)).toFixed(1)} km
                      </td>

                      {/* Time */}
                      <td className="p-3 font-mono text-muted-text whitespace-nowrap text-[11px]">
                        {formatTimeAgo(item.created_at)}
                      </td>

                      {/* Status Chip */}
                      <td className="p-3 whitespace-nowrap">
                        {getStatusChip(item.status)}
                      </td>

                      {/* Manual Assign Dropdown (Requirement: An admin can manually assign a responder from a dropdown) */}
                      <td className="p-3">
                        <select
                          value={item.assigned_responder_id || ''}
                          onChange={(e) => handleAssignSingle(item.id, e.target.value)}
                          className="w-full p-1.5 bg-surface border border-app-border rounded text-[11px] font-sans focus:outline-none focus:ring-1 focus:ring-teal-deep text-navy-ink font-medium"
                        >
                          <option value="">-- Unassigned --</option>
                          {RESPONDER_UNITS.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.agency.split(' ')[0]})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* View Button */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingIncident(item)}
                          className="p-1.5 rounded hover:bg-app-bg text-teal-deep hover:text-teal-deep/80 transition-colors"
                          title="View Incident Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Incident Detail Modal / Drawer (Requirement: View button) */}
      {viewingIncident && (
        <Modal
          isOpen={Boolean(viewingIncident)}
          onClose={() => setViewingIncident(null)}
          title={`Distress Incident Details #${viewingIncident.id}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between p-3 rounded-md bg-app-bg border border-app-border">
              <div>
                <span className="text-[10px] font-mono text-muted-text uppercase">Severity / Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {getPriorityBadge(viewingIncident.priority)}
                  {getStatusChip(viewingIncident.status)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-muted-text uppercase">Reported At</span>
                <p className="font-mono text-xs text-navy-ink mt-0.5">
                  {viewingIncident.created_at ? new Date(viewingIncident.created_at).toLocaleTimeString('en-IN') : 'Recent'}
                </p>
              </div>
            </div>

            {/* Photo Preview if Available */}
            {viewingIncident.photo_url && (
              <div className="rounded-md overflow-hidden border border-app-border max-h-56 bg-black flex items-center justify-center">
                <img
                  src={viewingIncident.photo_url}
                  alt={viewingIncident.id}
                  className="w-full h-full object-cover max-h-56"
                />
              </div>
            )}

            {/* Field Details */}
            <div className="divide-y divide-app-border text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-muted-text font-medium">Emergency Category:</span>
                <span className="font-bold text-navy-ink">{viewingIncident.emergency_type}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-muted-text font-medium">Persons at Risk:</span>
                <span className="font-mono font-bold text-navy-ink">{viewingIncident.people_count || 1} persons</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-muted-text font-medium">Citizen Name:</span>
                <span className="text-navy-ink font-semibold">{viewingIncident.citizen_name || 'Resident Citizen'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-muted-text font-medium">Contact Phone:</span>
                <a href={`tel:${viewingIncident.citizen_phone}`} className="text-teal-deep font-mono hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {viewingIncident.citizen_phone || '+91 98490 00000'}
                </a>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-muted-text font-medium">Location Address:</span>
                <span className="text-right text-navy-ink font-medium max-w-xs">{viewingIncident.address}</span>
              </div>
              {viewingIncident.landmark && (
                <div className="py-2 flex justify-between">
                  <span className="text-muted-text font-medium">Landmark:</span>
                  <span className="text-right text-navy-ink">{viewingIncident.landmark}</span>
                </div>
              )}
              {viewingIncident.special_needs && (
                <div className="py-2 flex flex-col gap-1">
                  <span className="text-muted-text font-medium">Special Needs / Situation:</span>
                  <p className="p-2 bg-app-bg rounded border border-app-border text-navy-ink">
                    {viewingIncident.special_needs}
                  </p>
                </div>
              )}
              <div className="py-2 flex justify-between items-center">
                <span className="text-muted-text font-medium">Assigned Field Unit:</span>
                <span className="font-semibold text-navy-ink">
                  {RESPONDER_UNITS.find((u) => u.id === viewingIncident.assigned_responder_id)?.name ||
                    viewingIncident.assigned_responder_id ||
                    'Unassigned'}
                </span>
              </div>
            </div>

            {/* Quick Dispatch Action within Modal */}
            <div className="p-3 bg-[#FAF9F6] border border-app-border rounded-md space-y-2">
              <label className="block text-xs font-semibold text-navy-ink font-mono uppercase">
                Dispatch / Reassign Responder Unit
              </label>
              <div className="flex gap-2">
                <select
                  value={viewingIncident.assigned_responder_id || ''}
                  onChange={(e) => handleAssignSingle(viewingIncident.id, e.target.value)}
                  className="flex-1 p-2 bg-surface border border-app-border rounded text-xs text-navy-ink"
                >
                  <option value="">-- Select Unit --</option>
                  {RESPONDER_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.agency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-app-border">
              <Button variant="outline" size="sm" onClick={() => setViewingIncident(null)}>
                Close Window
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDispatchPage;
