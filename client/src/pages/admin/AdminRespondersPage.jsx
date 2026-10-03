import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Modal,
  EmptyState,
  Toast
} from '../../components/ui';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Shield,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

export const AdminRespondersPage = () => {
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); // All, Rescue, Police, Medical, Volunteers
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Modal State for Add & Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResponder, setEditingResponder] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    badge_id: '',
    category: 'rescue',
    role: '',
    team: '',
    status: 'available',
    phone: '',
    email: '',
    current_location: 'Central Depot',
  });

  const fetchResponders = async () => {
    try {
      const res = await apiFetch('/responders');
      if (res && res.data) {
        setResponders(res.data);
      }
    } catch (err) {
      console.warn('Failed to load responders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponders();
  }, []);

  const openAddModal = () => {
    setEditingResponder(null);
    setFormData({
      name: '',
      badge_id: `RESQ-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'rescue',
      role: 'Swiftwater Rescue Specialist',
      team: '10th Battalion NDRF',
      status: 'available',
      phone: '+91 94400 00000',
      email: 'responder@resq.gov',
      current_location: 'SEOC Central Depot',
    });
    setModalOpen(true);
  };

  const openEditModal = (resp) => {
    setEditingResponder(resp);
    setFormData({
      name: resp.name,
      badge_id: resp.badge_id,
      category: resp.category,
      role: resp.role,
      team: resp.team,
      status: resp.status,
      phone: resp.phone,
      email: resp.email,
      current_location: resp.current_location,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      if (editingResponder) {
        const res = await apiFetch(`/responders/${editingResponder.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        if (res && res.success) {
          setToast({ title: 'Responder Updated', message: `${formData.name} record saved.`, type: 'low' });
          fetchResponders();
          setModalOpen(false);
        }
      } else {
        const res = await apiFetch('/responders', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        if (res && res.success) {
          setToast({ title: 'Responder Added', message: `${formData.name} added to muster roll.`, type: 'low' });
          fetchResponders();
          setModalOpen(false);
        }
      }
    } catch (err) {
      setToast({ title: 'Operation Failed', message: err.message, type: 'critical' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Tab counts
  const tabCounts = {
    All: responders.length,
    Rescue: responders.filter((r) => r.category === 'rescue').length,
    Police: responders.filter((r) => r.category === 'police').length,
    Medical: responders.filter((r) => r.category === 'medical').length,
    Volunteers: responders.filter((r) => r.category === 'volunteers').length,
  };

  // Filtered List
  const filteredResponders = responders.filter((r) => {
    if (activeTab !== 'All' && r.category.toLowerCase() !== activeTab.toLowerCase()) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(term) ||
        r.badge_id.toLowerCase().includes(term) ||
        r.team.toLowerCase().includes(term) ||
        r.role.toLowerCase().includes(term) ||
        r.current_location.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getStatusChip = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="low" size="sm">Active</Badge>;
      case 'on_mission':
        return <Badge variant="high" size="sm">On Mission</Badge>;
      case 'available':
        return <Badge variant="teal" size="sm">Available</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
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
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-muted-text">Command Personnel Deployment</span>
            <Badge variant="teal" size="sm" className="font-mono">{responders.length} Officers</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Manage Responders & Tactical Units
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Oversee field rescue teams, medical triage units, police cordons, and NGO volunteer squads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={fetchResponders}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openAddModal}
          >
            Add Responder
          </Button>
        </div>
      </div>

      {/* Tabs with Counts (Requirement 5: All, Rescue, Police, Medical, Volunteers) */}
      <div className="flex items-center gap-1 border-b border-app-border overflow-x-auto pb-0">
        {['All', 'Rescue', 'Police', 'Medical', 'Volunteers'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
                  : 'border-transparent text-muted-text hover:text-navy-ink'
              }`}
            >
              <span>{tab}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-teal-deep text-white' : 'bg-[#FAF9F6] text-muted-text border border-app-border'
              }`}>
                {tabCounts[tab] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Status Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-md border border-app-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, badge ID, team, or location..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-app-border rounded bg-[#FAF9F6] text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-muted-text shrink-0">Status:</span>
          {['all', 'active', 'on_mission', 'available'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded font-mono capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-teal-deep text-white font-bold'
                  : 'bg-[#FAF9F6] text-muted-text hover:text-navy-ink border border-app-border'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table (Requirement 5: Name/ID with avatar initials, Role, Team/Unit, Status chip, Current Location, View/Edit) */}
      <Card className="border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-app-border text-[11px] font-mono text-muted-text uppercase">
              <tr>
                <th className="p-3.5 pl-4">Responder / Badge ID</th>
                <th className="p-3.5">Operational Role</th>
                <th className="p-3.5">Assigned Agency / Unit</th>
                <th className="p-3.5">Deployment Status</th>
                <th className="p-3.5">Current Staging Location</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-surface">
              {filteredResponders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted-text">
                    <EmptyState
                      icon={Users}
                      title="No Responders Found"
                      description="No personnel match the active search and filter selection."
                    />
                  </td>
                </tr>
              ) : (
                filteredResponders.map((resp) => {
                  const initials = resp.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
                  return (
                    <tr key={resp.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-deep text-white flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-navy-ink font-mono">{resp.name}</div>
                            <div className="text-[10px] text-muted-text font-mono">{resp.badge_id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-medium text-navy-ink">
                        {resp.role}
                      </td>

                      <td className="p-3.5 text-muted-text font-mono">
                        {resp.team}
                      </td>

                      <td className="p-3.5">
                        {getStatusChip(resp.status)}
                      </td>

                      <td className="p-3.5 text-navy-ink">
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                          <span className="truncate">{resp.current_location}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Edit2}
                          onClick={() => openEditModal(resp)}
                          className="text-xs"
                        >
                          View / Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Responder Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingResponder ? `Edit Personnel: ${editingResponder.name}` : 'Enlist New Field Responder'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Inspector K. Vikram"
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Badge ID</label>
              <input
                type="text"
                required
                value={formData.badge_id}
                onChange={(e) => setFormData({ ...formData, badge_id: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Category / Wing</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep capitalize"
              >
                <option value="rescue">Rescue Squad</option>
                <option value="police">Police Command</option>
                <option value="medical">Medical Triage</option>
                <option value="volunteers">NGO Volunteer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Deployment Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep capitalize"
              >
                <option value="available">Available</option>
                <option value="active">Active (On Duty)</option>
                <option value="on_mission">On Mission</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Role Title</label>
            <input
              type="text"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g. Swiftwater Extraction Specialist"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Agency / Unit Call-sign</label>
            <input
              type="text"
              required
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              placeholder="e.g. 10th Battalion NDRF Alpha"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Hotline Phone</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Staging Area</label>
              <input
                type="text"
                required
                value={formData.current_location}
                onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                placeholder="e.g. Moosarambagh Causeway"
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-app-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={formSubmitting}
            >
              {editingResponder ? 'Save Changes' : 'Enlist Responder'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
