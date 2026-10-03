import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '../../components/ui';
import { Radio, Shield, CheckCircle2, RotateCcw, AlertTriangle, MapPin, Users, Phone } from 'lucide-react';

export const ResponderDashboard = () => {
  const { profile, user } = useAuth();
  const [apiResult, setApiResult] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  // Test calling protected GET /api/me and /api/responder/status
  const testProtectedApi = async () => {
    setTestingApi(true);
    try {
      const meData = await apiFetch('/me');
      const responderData = await apiFetch('/responder/status');
      setApiResult({ success: true, me: meData, responder: responderData });
    } catch (err) {
      setApiResult({ success: false, error: err.message, status: err.status });
    } finally {
      setTestingApi(false);
    }
  };

  useEffect(() => {
    testProtectedApi();
  }, []);

  return (
    <div className="space-y-6">
      {/* Unit Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-navy-ink font-mono">
              FIELD CONSOLE // {profile?.full_name || 'Inspector K. Vikram'}
            </h2>
            <Badge variant="high" size="sm">Responder</Badge>
          </div>
          <p className="text-xs text-muted-text mt-1 font-mono">
            Assigned Unit: <span className="text-navy-ink font-semibold">{profile?.agency_name || 'NDRF Battalion 10'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={testProtectedApi}
            loading={testingApi}
          >
            Verify Server Auth (/api/me)
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
              PROTECTED API VERIFICATION: GET /api/me & /api/responder/status
            </span>
            <Badge variant={apiResult.success ? 'low' : 'critical'} size="sm">
              HTTP {apiResult.success ? '200 OK' : apiResult.status || '500'}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-navy-ink">
            Verified Role: <span className="font-bold">{apiResult.me?.role || 'responder'}</span> | 
            User ID: <span className="text-muted-text">{apiResult.me?.id}</span> | 
            Unit Message: <span className="text-muted-text">{apiResult.responder?.message}</span>
          </p>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Assigned To Unit</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">1 Incident</h4>
            <p className="text-[11px] text-[#B54708] mt-0.5">FQ1025 • Boat Team 3 Deployed</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Open Triage Queue</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">2 Unassigned</h4>
            <p className="text-[11px] text-[#B42318] mt-0.5">Critical Terrace Rescue Needed</p>
          </CardContent>
        </Card>

        <Card className="border-app-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-text font-mono uppercase">Sector Relief Capacity</span>
            <h4 className="text-2xl font-bold font-mono text-navy-ink mt-1">56% Occupied</h4>
            <p className="text-[11px] text-[#3B7A57] mt-0.5">1,960 beds available in sector</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Triage Priority */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Field Assignment: FQ1025</CardTitle>
              <CardDescription>Direct life-safety triage assigned to your NDRF team</CardDescription>
            </div>
            <Badge variant="high" size="sm">High Priority</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-app-bg rounded border border-app-border space-y-1.5">
              <span className="font-semibold text-navy-ink uppercase text-[10px] tracking-wider">Civilian Details</span>
              <p className="text-sm font-bold text-navy-ink">Lakshmi Narayana</p>
              <p className="text-muted-text font-mono flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-teal-deep" />
                +91-9849033332
              </p>
              <p className="text-muted-text font-mono">Chaderghat, Al-Madina Heights, Flat 202</p>
            </div>
            <div className="p-3 bg-app-bg rounded border border-app-border space-y-1.5">
              <span className="font-semibold text-navy-ink uppercase text-[10px] tracking-wider">Rescue Constraints</span>
              <p className="font-medium text-[#B42318]">Medical Distress: Diabetic insulin requirement</p>
              <p className="text-muted-text">Water level 2.5m on ground floor. Inflatable boat rescue required from 2nd floor balcony.</p>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm">Report Road Obstruction</Button>
            <Button variant="primary" size="sm">Mark Incident In-Progress</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponderDashboard;
