import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { onSOSEvent } from '../../lib/broadcast';
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
  Package,
  Plus,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Clock,
  MapPin,
  LifeBuoy,
  HeartPulse,
  Droplets,
  AlertTriangle,
  Edit2
} from 'lucide-react';

export const AdminResourcesPage = () => {
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'requests'
  const [resources, setResources] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Add Resource Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 10,
    category: 'equipment',
    provider: '10th Battalion NDRF',
    location: 'SEOC Nampally Depot',
    status: 'available',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [resRes, reqRes] = await Promise.all([
        apiFetch('/resources'),
        apiFetch('/support-requests'),
      ]);
      if (resRes && resRes.data) setResources(resRes.data);
      if (reqRes && reqRes.data) setSupportRequests(reqRes.data);
    } catch (err) {
      console.warn('Failed to load resource data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = onSOSEvent((event) => {
      if (event.type === 'SUPPORT_REQUEST_CREATED') {
        fetchData();
        setToast({
          title: 'New Support Request Logged',
          message: `${event.request?.requested_by} requested ${event.request?.support_type}`,
          type: 'high',
        });
      }
    });

    return unsubscribe;
  }, []);

  const openAddModal = () => {
    setEditingResource(null);
    setFormData({
      name: '',
      quantity: 10,
      category: 'equipment',
      provider: '10th Battalion NDRF',
      location: 'SEOC Nampally Depot',
      status: 'available',
    });
    setAddModalOpen(true);
  };

  const openEditModal = (res) => {
    setEditingResource(res);
    setFormData({
      name: res.name,
      quantity: res.quantity,
      category: res.category,
      provider: res.provider,
      location: res.location,
      status: res.status,
    });
    setAddModalOpen(true);
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingResource) {
        const res = await apiFetch(`/resources/${editingResource.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        if (res && res.success) {
          setToast({ title: 'Resource Updated', message: `${formData.name} stock level saved.`, type: 'low' });
          fetchData();
          setAddModalOpen(false);
        }
      } else {
        const res = await apiFetch('/resources', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        if (res && res.success) {
          setToast({ title: 'Resource Commissioned', message: `${formData.name} added to stock registry.`, type: 'low' });
          fetchData();
          setAddModalOpen(false);
        }
      }
    } catch (err) {
      setToast({ title: 'Failed to Save', message: err.message, type: 'critical' });
    } finally {
      setSubmitting(false);
    }
  };

  // Action on Support Requests: approve, deny, in_transit
  const handleUpdateStatus = async (id, status, notes) => {
    try {
      const res = await apiFetch(`/support-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, admin_notes: notes }),
      });
      if (res && res.success) {
        setToast({
          title: 'Request Status Updated',
          message: `Request ${id} marked as ${status.toUpperCase().replace('_', ' ')}.`,
          type: status === 'denied' ? 'medium' : 'low',
        });
        fetchData();
      }
    } catch (err) {
      setToast({ title: 'Action Failed', message: err.message, type: 'critical' });
    }
  };

  const pendingRequestsCount = supportRequests.filter((r) => r.status === 'pending').length;

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
            <span className="text-xs font-mono uppercase text-muted-text">Command Logistics Registry</span>
            <Badge variant="teal" size="sm" className="font-mono">{resources.length} Assets Tracked</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Resource Logistics & Field Dispatch
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Coordinate water rescue craft, mobile water purification units, shelter stocks, and approve responder support requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openAddModal}
          >
            Add Resource
          </Button>
        </div>
      </div>

      {/* Tabs: Available Resources and Resource Requests (with count badge) (Requirement 6) */}
      <div className="flex items-center gap-2 border-b border-app-border">
        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'available'
              ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
              : 'border-transparent text-muted-text hover:text-navy-ink'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Available Resources ({resources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
              : 'border-transparent text-muted-text hover:text-navy-ink'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Resource Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#B54708] text-white text-[10px] font-mono font-bold">
              {pendingRequestsCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Available Resources Table (Requirement 6: Resource, Quantity, Provider, Location, Status, View/Edit) */}
      {activeTab === 'available' && (
        <Card className="border-app-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-app-border text-[11px] font-mono text-muted-text uppercase">
                <tr>
                  <th className="p-3.5 pl-4">Resource Nomenclature</th>
                  <th className="p-3.5">Available Quantity</th>
                  <th className="p-3.5">Designated Provider</th>
                  <th className="p-3.5">Depot Staging Location</th>
                  <th className="p-3.5">Logistical Status</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border bg-surface">
                {resources.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-muted-text">
                      <EmptyState
                        icon={Package}
                        title="No Resources Registered"
                        description="Click Add Resource to register emergency relief gear."
                      />
                    </td>
                  </tr>
                ) : (
                  resources.map((res) => (
                    <tr key={res.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-navy-ink font-mono">{res.name}</div>
                        <div className="text-[10px] text-muted-text uppercase font-mono">{res.category}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-sm font-bold font-mono text-teal-deep">{res.quantity}</span>
                        <span className="text-muted-text ml-1 text-[11px]">Units</span>
                      </td>

                      <td className="p-3.5 font-medium text-navy-ink">
                        {res.provider}
                      </td>

                      <td className="p-3.5 text-navy-ink">
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                          <span className="truncate">{res.location}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant={res.status === 'available' ? 'low' : 'medium'} size="sm">
                          {res.status === 'available' ? 'Available' : 'In Transit'}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Edit2}
                          onClick={() => openEditModal(res)}
                          className="text-xs"
                        >
                          View / Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Resource Requests Table (Requirement 6: approve, deny, mark in transit) */}
      {activeTab === 'requests' && (
        <Card className="border-app-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-app-border text-[11px] font-mono text-muted-text uppercase">
                <tr>
                  <th className="p-3.5 pl-4">Request ID / Source</th>
                  <th className="p-3.5">Requested Asset</th>
                  <th className="p-3.5">Urgency</th>
                  <th className="p-3.5">Operational Location</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Authorization Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border bg-surface">
                {supportRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-muted-text">
                      <EmptyState
                        icon={Truck}
                        title="No Resource Requests"
                        description="There are currently no active support requests from field responders or relief camps."
                      />
                    </td>
                  </tr>
                ) : (
                  supportRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-navy-ink font-mono">{req.id}</div>
                        <div className="text-[11px] text-muted-text">By: {req.requested_by} ({req.agency || 'Field Unit'})</div>
                        {req.sos_id && (
                          <span className="text-[10px] font-mono text-teal-deep">SOS Ref: {req.sos_id}</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-navy-ink">{req.support_type}</div>
                        <p className="text-[11px] text-muted-text max-w-xs mt-0.5 line-clamp-2">{req.notes}</p>
                      </td>

                      <td className="p-3.5">
                        <Badge variant={req.priority === 'high' ? 'critical' : req.priority === 'medium' ? 'medium' : 'low'} size="sm">
                          {req.priority?.toUpperCase()}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-navy-ink">
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                          <span className="truncate">{req.location || 'Field Sector'}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant={
                            req.status === 'approved'
                              ? 'low'
                              : req.status === 'in_transit'
                              ? 'teal'
                              : req.status === 'denied'
                              ? 'critical'
                              : 'high'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {req.status?.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(req.id, 'approved', 'Approved by Command Chief')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#EDF6F1] text-[#3B7A57] hover:bg-[#D4EDDA] border border-[#C3E4D1] transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(req.id, 'denied', 'Re-routed to nearby mutual aid')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#FDF2F2] text-[#B42318] hover:bg-[#F8D7DA] border border-[#FDA29B] transition-colors"
                              >
                                Deny
                              </button>
                            </>
                          )}

                          {req.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(req.id, 'in_transit', 'Dispatched with logistics convoy')}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#EFF8FF] text-[#175CD3] hover:bg-[#D1E9FF] border border-[#B2DDFF] flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Mark In Transit
                            </button>
                          )}

                          {req.status === 'in_transit' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(req.id, 'completed', 'Delivered to staging area')}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#EDF6F1] text-[#3B7A57] hover:bg-[#D4EDDA] border border-[#C3E4D1]"
                            >
                              Delivered
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Resource Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={editingResource ? `Edit Asset: ${editingResource.name}` : 'Commission Emergency Resource Asset'}
      >
        <form onSubmit={handleSaveResource} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Resource Item Nomenclature</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Inflatable Rescue Boats (IRB)"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Available Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Logistics Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              >
                <option value="available">Available (Staged)</option>
                <option value="in_transit">In Transit (Dispatched)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Provider / Owning Agency</label>
            <input
              type="text"
              required
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g. 10th Battalion NDRF"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Staging Depot / Base Location</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. SEOC Tactical Base, Nampally"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div className="pt-4 border-t border-app-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              {editingResource ? 'Save Changes' : 'Register Resource'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
