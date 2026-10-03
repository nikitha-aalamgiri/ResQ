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
  EmptyState,
  Toast
} from '../../components/ui';
import {
  Users,
  Search,
  Shield,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Power
} from 'lucide-react';

export const AdminUsersPage = () => {
  const [activeTab, setActiveTab] = useState('Citizens'); // Citizens, Responders, NGOs / Providers, Admins
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/users');
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.warn('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await apiFetch(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res && res.success) {
        setToast({
          title: 'Account Status Updated',
          message: `${user.name} is now ${nextStatus.toUpperCase()}.`,
          type: nextStatus === 'active' ? 'low' : 'medium',
        });
        fetchUsers();
      }
    } catch (err) {
      setToast({ title: 'Failed to Update', message: err.message, type: 'critical' });
    }
  };

  // Map tab name to role
  const getRoleForTab = (tab) => {
    switch (tab) {
      case 'Citizens':
        return 'citizen';
      case 'Responders':
        return 'responder';
      case 'NGOs / Providers':
        return 'ngo';
      case 'Admins':
        return 'admin';
      default:
        return 'citizen';
    }
  };

  const filteredUsers = users.filter((u) => {
    const targetRole = getRoleForTab(activeTab);
    if (u.role.toLowerCase() !== targetRole) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.phone.toLowerCase().includes(term) ||
        (u.agency && u.agency.toLowerCase().includes(term))
      );
    }
    return true;
  });

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
            <span className="text-xs font-mono uppercase text-muted-text">Identity & Access Control</span>
            <Badge variant="teal" size="sm" className="font-mono">{users.length} Total Accounts</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            User Directory Management
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Administer verified citizen accounts, field responder credentials, NGO partners, and command staff.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RotateCcw}
          onClick={fetchUsers}
        >
          Refresh Directory
        </Button>
      </div>

      {/* Tabs (Requirement 8: Citizens, Responders, NGOs / Providers, Admins) */}
      <div className="flex items-center gap-1 border-b border-app-border overflow-x-auto pb-0">
        {['Citizens', 'Responders', 'NGOs / Providers', 'Admins'].map((tab) => {
          const isActive = activeTab === tab;
          const count = users.filter((u) => u.role.toLowerCase() === getRoleForTab(tab)).length;
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
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Status Filter Bar (Requirement 8) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-md border border-app-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()} by name, phone, email...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-app-border rounded bg-[#FAF9F6] text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-muted-text shrink-0">Account Status:</span>
          {['all', 'active', 'inactive'].map((st) => (
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
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table (Requirement 8: Name, Role, Phone/Email, Status, View/Edit with activate/deactivate) */}
      <Card className="border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-app-border text-[11px] font-mono text-muted-text uppercase">
              <tr>
                <th className="p-3.5 pl-4">Account Holder / Agency</th>
                <th className="p-3.5">System Role</th>
                <th className="p-3.5">Verified Phone / Email</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-4">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-surface">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted-text">
                    <EmptyState
                      icon={Users}
                      title="No Users in this Category"
                      description="No accounts match your current filter query."
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-navy-ink font-mono">{u.name}</div>
                      {u.agency && (
                        <div className="text-[11px] text-muted-text">{u.agency}</div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <Badge
                        variant={
                          u.role === 'admin'
                            ? 'critical'
                            : u.role === 'responder'
                            ? 'high'
                            : u.role === 'ngo'
                            ? 'medium'
                            : 'teal'
                        }
                        size="sm"
                        className="uppercase font-mono"
                      >
                        {u.role}
                      </Badge>
                    </td>

                    <td className="p-3.5">
                      <div className="font-mono text-navy-ink">{u.phone}</div>
                      <div className="text-[11px] text-muted-text">{u.email}</div>
                    </td>

                    <td className="p-3.5">
                      <Badge variant={u.status === 'active' ? 'low' : 'neutral'} size="sm">
                        {u.status === 'active' ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-right pr-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                          u.status === 'active'
                            ? 'bg-[#FDF2F2] text-[#B42318] hover:bg-[#F8D7DA] border border-[#FDA29B]'
                            : 'bg-[#EDF6F1] text-[#3B7A57] hover:bg-[#D4EDDA] border border-[#C3E4D1]'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{u.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
