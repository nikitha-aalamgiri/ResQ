import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '../../components/ui';
import { ShieldAlert, RotateCcw, CheckCircle2, Radio, Compass, Building2, Bell, AlertTriangle } from 'lucide-react';

export const AdminDashboard = () => {
  const { profile, user } = useAuth();
  const [apiResult, setApiResult] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  // Test calling protected GET /api/me and /api/admin/system
  const testAdminApi = async () => {
    setTestingApi(true);
    try {
      const meData = await apiFetch('/me');
      const adminData = await apiFetch('/admin/system');
      setApiResult({ success: true, me: meData, admin: adminData });
    } catch (err) {
      setApiResult({ success: false, error: err.message, status: err.status });
    } finally {
      setTestingApi(false);
    }
  };

  useEffect(() => {
    testAdminApi();
  }, []);

  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-navy-ink font-mono">
              SEOC CENTRAL COMMAND // {profile?.full_name || 'Suresh Reddy'}
            </h2>
            <Badge variant="critical" size="sm">Admin Level 4</Badge>
          </div>
          <p className="text-xs text-muted-text mt-1 font-mono">
            Clearance Agency: <span className="text-navy-ink font-semibold">{profile?.agency_name || 'TSDMA State Operations'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={testAdminApi}
            loading={testingApi}
          >
            Verify Admin Clearance (/api/admin/system)
          </Button>
        </div>
      </div>

      {/* Backend API Verification Card */}
      {apiResult && (
        <div className={`p-4 rounded-md border text-xs font-mono ${
          apiResult.success ? 'bg-[#EDF6F1] border-[#C3E4D1] text-[#3B7A57]' : 'bg-[#FDF2F2] border-[#F8D2D0] text-[#B42318]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              ADMINISTRATIVE API VERIFICATION: GET /api/me & /api/admin/system
            </span>
            <Badge variant={apiResult.success ? 'low' : 'critical'} size="sm">
              HTTP {apiResult.success ? '200 OK' : apiResult.status || '500'}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-navy-ink">
            Verified Role: <span className="font-bold">{apiResult.me?.role || 'admin'}</span> | 
            Clearance Level: <span className="text-muted-text">{apiResult.admin?.clearance || 'SEOC Admin'}</span> | 
            Admin Contact: <span className="text-muted-text">{apiResult.me?.email}</span>
          </p>
        </div>
      )}

      {/* High-Level Command Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Total Distress SOS</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">5 Incidents</h4>
            <p className="text-[11px] text-[#B42318] mt-0.5">2 Critical • 2 Assigned • 1 Resolved</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Flood Hazard Zones</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">6 Zones Active</h4>
            <p className="text-[11px] text-[#B54708] mt-0.5">Musi River Basin at 4.2m</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Relief Shelter Total</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">2,540 / 4,500</h4>
            <p className="text-[11px] text-[#3B7A57] mt-0.5">5 Operational Camps</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Impassable Routes</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">3 Blocked</h4>
            <p className="text-[11px] text-muted-text mt-0.5">Moosarambagh causeway closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Agency Deployment Status */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Multi-Agency Rescue Deployment Matrix</CardTitle>
              <CardDescription>NDRF, GHMC Disaster Response Force, and Telangana SDRF units</CardDescription>
            </div>
            <Button variant="danger" size="sm" icon={Bell}>
              Issue Emergency Broadcast Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-app-border text-xs">
            <div className="grid grid-cols-12 px-4 py-2.5 font-semibold text-muted-text uppercase bg-[#FAF9F6]">
              <div className="col-span-4">Agency / Battalion</div>
              <div className="col-span-3">Assigned Lead Officer</div>
              <div className="col-span-3">Operational Zone</div>
              <div className="col-span-2 text-right">Unit Readiness</div>
            </div>
            <div className="grid grid-cols-12 px-4 py-3 items-center">
              <div className="col-span-4 font-medium text-navy-ink">10th Battalion NDRF</div>
              <div className="col-span-3 text-muted-text">Inspector K. Vikram</div>
              <div className="col-span-3 font-mono">Chaderghat & Moosarambagh</div>
              <div className="col-span-2 text-right"><Badge variant="low" size="sm">Active (In Boat)</Badge></div>
            </div>
            <div className="grid grid-cols-12 px-4 py-3 items-center">
              <div className="col-span-4 font-medium text-navy-ink">GHMC DRF Team Alpha</div>
              <div className="col-span-3 text-muted-text">Capt. Ananya Rao</div>
              <div className="col-span-3 font-mono">Begumpet Rasoolpura Nala</div>
              <div className="col-span-2 text-right"><Badge variant="low" size="sm">Active (Rescue Truck)</Badge></div>
            </div>
            <div className="grid grid-cols-12 px-4 py-3 items-center">
              <div className="col-span-4 font-medium text-navy-ink">Telangana SDRF Heavy Unit</div>
              <div className="col-span-3 text-muted-text">SI Rajesh Verma</div>
              <div className="col-span-3 font-mono">Tolichowki & Yousufguda</div>
              <div className="col-span-2 text-right"><Badge variant="low" size="sm">Standby Reserve</Badge></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
