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
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Utensils,
  Droplets,
  HeartPulse,
  Accessibility,
  Dog,
  ExternalLink
} from 'lucide-react';

export const AdminSheltersPage = () => {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Modal State for Add & Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShelter, setEditingShelter] = useState(null); // null = Add, object = Edit
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    area: '',
    capacity: 500,
    occupancy: 0,
    status: 'open',
    food: true,
    water: true,
    medical: true,
    accessible: true,
    pets: false,
    image: '',
  });

  const fetchShelters = async () => {
    try {
      const res = await apiFetch('/shelters');
      if (res && res.data) {
        setShelters(res.data);
      }
    } catch (err) {
      console.warn('Failed to load shelters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, []);

  const openAddModal = () => {
    setEditingShelter(null);
    setFormData({
      name: '',
      address: '',
      area: 'Central Hyderabad',
      capacity: 500,
      occupancy: 0,
      status: 'open',
      food: true,
      water: true,
      medical: true,
      accessible: true,
      pets: false,
      image: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=600&q=80',
    });
    setModalOpen(true);
  };

  const openEditModal = (shelter) => {
    setEditingShelter(shelter);
    setFormData({
      name: shelter.name,
      address: shelter.address,
      area: shelter.area || 'Central Hyderabad',
      capacity: shelter.capacity,
      occupancy: shelter.occupancy,
      status: shelter.status,
      food: shelter.supplies?.food ?? true,
      water: shelter.supplies?.water ?? true,
      medical: shelter.supplies?.medical ?? true,
      accessible: shelter.supplies?.accessible ?? true,
      pets: shelter.supplies?.pets ?? false,
      image: shelter.image || '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        area: formData.area,
        capacity: Number(formData.capacity),
        occupancy: Number(formData.occupancy),
        status: formData.status,
        supplies: {
          food: formData.food,
          water: formData.water,
          medical: formData.medical,
          accessible: formData.accessible,
          pets: formData.pets,
        },
        image: formData.image,
      };

      if (editingShelter) {
        // Edit
        const res = await apiFetch(`/shelters/${editingShelter.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (res && res.success) {
          setToast({ title: 'Shelter Updated', message: `${formData.name} telemetry saved.`, type: 'low' });
          fetchShelters();
          setModalOpen(false);
        }
      } else {
        // Add
        const res = await apiFetch('/shelters', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res && res.success) {
          setToast({ title: 'Shelter Added', message: `${formData.name} commissioned.`, type: 'low' });
          fetchShelters();
          setModalOpen(false);
        }
      }
    } catch (err) {
      setToast({ title: 'Operation Failed', message: err.message, type: 'critical' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteShelter = async (id, name) => {
    if (!window.confirm(`Are you sure you want to decommission shelter ${name}?`)) return;
    try {
      const res = await apiFetch(`/shelters/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        setToast({ title: 'Shelter Decommissioned', message: `${name} has been removed.`, type: 'medium' });
        fetchShelters();
      }
    } catch (err) {
      setToast({ title: 'Decommission Failed', message: err.message, type: 'critical' });
    }
  };

  // Filter logic
  const filteredShelters = shelters.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        (s.address && s.address.toLowerCase().includes(term)) ||
        (s.area && s.area.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge variant="low" size="sm">Open</Badge>;
      case 'filling_fast':
        return <Badge variant="high" size="sm">Filling Fast</Badge>;
      case 'full':
        return <Badge variant="critical" size="sm">Full</Badge>;
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
            <span className="text-xs font-mono uppercase text-muted-text">Municipal Camp Telemetry</span>
            <Badge variant="teal" size="sm" className="font-mono">{shelters.length} Facilities Active</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Manage Relief Shelters
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Configure intake capacity, live occupancy levels, and relief supplies across sectors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={fetchShelters}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openAddModal}
          >
            Add New Shelter
          </Button>
        </div>
      </div>

      {/* Search & Status Filter Bar (Requirement 4) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-md border border-app-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shelters by name, area, or address..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-app-border rounded bg-[#FAF9F6] text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono text-muted-text shrink-0">Filter Status:</span>
          {['all', 'open', 'filling_fast', 'full'].map((st) => (
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

      {/* Shelter Cards Grid (Requirement 4: cards with image, name, area, status badge, capacity/occupied, chips, View/Edit) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredShelters.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Building2}
              title="No Shelters Found"
              description="No relief facilities match your search filter."
              actionText="Reset Filters"
              onAction={() => { setSearch(''); setStatusFilter('all'); }}
            />
          </div>
        ) : (
          filteredShelters.map((shelter) => {
            const occupancyPct = Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100));
            return (
              <Card key={shelter.id} className="border-app-border overflow-hidden hover:border-teal-deep/40 transition-colors flex flex-col justify-between">
                <div>
                  {/* Shelter Image */}
                  <div className="h-40 w-full relative bg-[#0F2A3D] overflow-hidden">
                    <img
                      src={shelter.image || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=600&q=80'}
                      alt={shelter.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(shelter.status)}
                    </div>
                    <div className="absolute bottom-2 left-3 bg-navy-ink/80 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded">
                      ID: {shelter.id}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-navy-ink font-mono line-clamp-1">{shelter.name}</h3>
                      <p className="text-xs text-muted-text flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                        <span className="truncate">{shelter.area || shelter.address}</span>
                      </p>
                    </div>

                    {/* Capacity / Occupied Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-text">Occupancy:</span>
                        <span className="font-bold text-navy-ink">
                          {shelter.occupancy} / {shelter.capacity} ({occupancyPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#E2DED6] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occupancyPct >= 90 ? 'bg-[#B42318]' : occupancyPct >= 75 ? 'bg-[#B54708]' : 'bg-[#3B7A57]'
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Chips (Food, Water, Medical, Accessible, Pets) */}
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-app-border text-[11px]">
                      {shelter.supplies?.food && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EDF6F1] text-[#3B7A57] font-medium">
                          <Utensils className="w-3 h-3" /> Food
                        </span>
                      )}
                      {shelter.supplies?.water && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EFF8FF] text-[#175CD3] font-medium">
                          <Droplets className="w-3 h-3" /> Water
                        </span>
                      )}
                      {shelter.supplies?.medical && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FDF2F2] text-[#B42318] font-medium">
                          <HeartPulse className="w-3 h-3" /> Medical
                        </span>
                      )}
                      {shelter.supplies?.accessible && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FAF9F6] text-navy-ink font-medium border border-app-border">
                          <Accessibility className="w-3 h-3" /> Accessible
                        </span>
                      )}
                      {shelter.supplies?.pets && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF6EE] text-[#B54708] font-medium">
                          <Dog className="w-3 h-3" /> Pets OK
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-[#FAF9F6] border-t border-app-border flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Edit2}
                    onClick={() => openEditModal(shelter)}
                    className="text-xs"
                  >
                    View / Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDeleteShelter(shelter.id, shelter.name)}
                    className="p-1.5 text-muted-text hover:text-[#B42318] rounded transition-colors"
                    title="Decommission Shelter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Shelter Modal (Requirement 4: capacity, occupancy, food/water/medical/pets/accessible, open/closed) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingShelter ? `Edit Shelter: ${editingShelter.name}` : 'Commission New Relief Camp'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Camp Facility Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Amberpet Community Relief Hall"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Operational Area / Sector</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g. Amberpet Lowlands"
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Status (Open / Closed)</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              >
                <option value="open">Open (Accepting Evacuees)</option>
                <option value="filling_fast">Filling Fast (75%+ Occupied)</option>
                <option value="full">Full (No Capacity)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Full Street Address</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Yousufguda Main Road, Hyderabad"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Max Bed Capacity</label>
              <input
                type="number"
                min="10"
                max="5000"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Current Occupancy</label>
              <input
                type="number"
                min="0"
                max="5000"
                required
                value={formData.occupancy}
                onChange={(e) => setFormData({ ...formData, occupancy: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Facility Photo URL (Optional)</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          {/* Amenity Checkboxes (Requirement 4) */}
          <div className="pt-2 border-t border-app-border">
            <label className="block text-xs font-bold font-mono text-navy-ink uppercase mb-2">
              Available Amenities & Relief Supplies
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.food}
                  onChange={(e) => setFormData({ ...formData, food: e.target.checked })}
                  className="rounded text-teal-deep focus:ring-teal-deep"
                />
                <span>Food Packets</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.water}
                  onChange={(e) => setFormData({ ...formData, water: e.target.checked })}
                  className="rounded text-teal-deep focus:ring-teal-deep"
                />
                <span>Potable Water</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.medical}
                  onChange={(e) => setFormData({ ...formData, medical: e.target.checked })}
                  className="rounded text-teal-deep focus:ring-teal-deep"
                />
                <span>Medical Desk</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.accessible}
                  onChange={(e) => setFormData({ ...formData, accessible: e.target.checked })}
                  className="rounded text-teal-deep focus:ring-teal-deep"
                />
                <span>Wheelchair Access</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pets}
                  onChange={(e) => setFormData({ ...formData, pets: e.target.checked })}
                  className="rounded text-teal-deep focus:ring-teal-deep"
                />
                <span>Pets Allowed</span>
              </label>
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
              {editingShelter ? 'Save Changes' : 'Commission Shelter'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
