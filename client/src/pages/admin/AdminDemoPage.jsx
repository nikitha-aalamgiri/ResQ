import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent } from '../../lib/broadcast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Toast } from '../../components/ui';
import {
  Activity,
  Navigation,
  Radio,
  RotateCcw,
  AlertTriangle,
  Bell,
  Droplets,
  CheckCircle2,
  ShieldAlert,
  Play
} from 'lucide-react';

export const AdminDemoPage = () => {
  const { profile } = useAuth();
  const { t } = useLang();

  const [loadingAction, setLoadingAction] = useState(null);
  const [toast, setToast] = useState(null);
  const [floodLevel, setFloodLevel] = useState('high');
  const [stepIndex, setStepIndex] = useState(0);

  // Simulated waypoint progression along Musi river causeway (visual only)
  const WAYPOINTS = [
    [17.3750, 78.4867],
    [17.3780, 78.4890],
    [17.3810, 78.4920],
    [17.3830, 78.4950],
  ];

  // 1. Advance responder one step (Visual marker movement only, never writes status)
  const handleAdvanceResponder = async () => {
    setLoadingAction('advance');
    try {
      const nextIndex = (stepIndex + 1) % WAYPOINTS.length;
      const nextCoords = WAYPOINTS[nextIndex];
      const res = await apiFetch('/demo/advance-responder', {
        method: 'POST',
        body: JSON.stringify({
          incidentId: 'FQ-1024',
          coords: nextCoords,
        }),
      });

      if (res.success) {
        setStepIndex(nextIndex);
        broadcastSOSEvent({
          type: 'RESPONDER_TELEMETRY_UPDATED',
          coords: nextCoords,
          etaMinutes: Math.max(1, 10 - nextIndex * 3),
        });
        setToast({
          title: t('admin.advanceResponder'),
          message: 'Responder visual telemetry marker moved. Incident status remains unchanged.',
          type: 'low',
        });
      }
    } catch (err) {
      setToast({
        title: t('common.error'),
        message: err.message || 'Failed to advance responder marker',
        type: 'critical',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Spawn test SOS incident (Creates new incident in WAITING status)
  const handleSpawnSOS = async () => {
    setLoadingAction('spawn');
    try {
      const res = await apiFetch('/sos', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Trapped by Flood Water',
          people_count: 3,
          anyone_injured: false,
          latitude: 17.3750,
          longitude: 78.4867,
          address: 'Moosarambagh Bridge Causeway Drill',
          landmark: 'Near Water Marker Pillar 14',
          special_needs: 'Training simulation test incident',
        }),
      });

      if (res.success) {
        broadcastSOSEvent({
          type: 'SOS_CREATED',
          sosId: res.data?.id,
          priority: res.data?.priority,
        });
        setToast({
          title: t('admin.spawnSos'),
          message: `Created test drill SOS #${res.data?.id || 'New'}. Status: WAITING.`,
          type: 'low',
        });
      }
    } catch (err) {
      setToast({
        title: t('common.error'),
        message: err.message || 'Failed to spawn SOS incident',
        type: 'critical',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Change flood warning level
  const handleChangeFloodLevel = async () => {
    setLoadingAction('flood');
    try {
      const levels = ['advisory', 'moderate', 'high', 'critical'];
      const nextLevel = levels[(levels.indexOf(floodLevel) + 1) % levels.length];
      const res = await apiFetch('/demo/flood-level', {
        method: 'POST',
        body: JSON.stringify({ level: nextLevel }),
      });

      if (res.success) {
        setFloodLevel(nextLevel);
        broadcastSOSEvent({
          type: 'FLOOD_LEVEL_CHANGED',
          level: nextLevel,
        });
        setToast({
          title: t('admin.changeFloodLevel'),
          message: `Flood warning drill level updated to ${nextLevel.toUpperCase()}`,
          type: 'low',
        });
      }
    } catch (err) {
      setToast({
        title: t('common.error'),
        message: err.message || 'Failed to update flood level',
        type: 'critical',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Publish sample advisory alert
  const handlePublishAlert = async () => {
    setLoadingAction('alert');
    try {
      const res = await apiFetch('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Simulated Musi Flash Flood Advisory',
          description: 'Discharge from Osman Sagar gates increased by 4,000 cusecs. Low-lying areas under advisory.',
          alertType: 'flood_warning',
          severity: 'high',
          areaName: 'Musi River Basin Drill Corridor',
        }),
      });

      if (res.success) {
        broadcastSOSEvent({
          type: 'ALERT_PUBLISHED',
          alert: res.data,
        });
        setToast({
          title: t('admin.publishSampleAlert'),
          message: 'Sample training alert published and broadcast to active client consoles.',
          type: 'low',
        });
      }
    } catch (err) {
      setToast({
        title: t('common.error'),
        message: err.message || 'Failed to publish sample alert',
        type: 'critical',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 5. Reset demo store back to initial seed data
  const handleResetStore = async () => {
    setLoadingAction('reset');
    try {
      const res = await apiFetch('/demo/reset', { method: 'POST' });
      if (res.success) {
        broadcastSOSEvent({ type: 'DEMO_STORE_RESET' });
        setToast({
          title: t('admin.resetDemoStore'),
          message: 'Demo store restored to initial seed incidents and telemetry state.',
          type: 'low',
        });
      }
    } catch (err) {
      setToast({
        title: t('common.error'),
        message: err.message || 'Failed to reset demo store',
        type: 'critical',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Toast */}
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
      <div className="bg-surface p-5 rounded-md border border-app-border space-y-1">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-teal-deep" />
          <h1 className="font-bold text-lg text-navy-ink font-mono">
            {t('admin.demoTitle')}
          </h1>
          <Badge variant="teal" size="sm">Drill Operations</Badge>
        </div>
        <p className="text-xs text-muted-text">
          {t('admin.demoSubtitle')}
        </p>
      </div>

      {/* Operational Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Control 1: Advance Responder */}
        <Card className="border-app-border">
          <CardHeader className="py-3 bg-[#FAF9F6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-teal-deep" />
                <CardTitle className="text-sm">Advance Responder (Visual Marker)</CardTitle>
              </div>
              <Badge variant="low" size="sm">Marker Step {stepIndex + 1}/{WAYPOINTS.length}</Badge>
            </div>
            <CardDescription className="text-xs">
              Moves simulated GPS coordinates along the rescue route. Strictly visual: never advances or mutates incident status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-text font-mono">
              Current Simulated Position: [{WAYPOINTS[stepIndex][0].toFixed(4)}, {WAYPOINTS[stepIndex][1].toFixed(4)}]
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={Navigation}
              onClick={handleAdvanceResponder}
              loading={loadingAction === 'advance'}
              disabled={loadingAction !== null}
              className="w-full"
            >
              {t('admin.advanceResponder')}
            </Button>
          </CardContent>
        </Card>

        {/* Control 2: Spawn Test SOS */}
        <Card className="border-app-border">
          <CardHeader className="py-3 bg-[#FAF9F6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#B42318]" />
                <CardTitle className="text-sm">Spawn Test Distress Incident</CardTitle>
              </div>
              <Badge variant="critical" size="sm">WAITING</Badge>
            </div>
            <CardDescription className="text-xs">
              Creates a new test SOS incident at the Musi River causeway with WAITING status. Never alters existing incidents.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-text font-mono">
              Drill Scenario: 3 persons stranded, high-risk inundation, Moosarambagh.
            </p>
            <Button
              variant="danger"
              size="sm"
              icon={Radio}
              onClick={handleSpawnSOS}
              loading={loadingAction === 'spawn'}
              disabled={loadingAction !== null}
              className="w-full"
            >
              {t('admin.spawnSos')}
            </Button>
          </CardContent>
        </Card>

        {/* Control 3: Change Flood Level */}
        <Card className="border-app-border">
          <CardHeader className="py-3 bg-[#FAF9F6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-teal-deep" />
                <CardTitle className="text-sm">Flood Warning Level</CardTitle>
              </div>
              <Badge
                variant={floodLevel === 'critical' ? 'critical' : floodLevel === 'high' ? 'high' : 'low'}
                size="sm"
              >
                {floodLevel.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Cycle hydraulic warning level thresholds across the SEOC telemetry drill layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-text font-mono">
              Active Warning: Musi River basin 514.8m gauge discharge.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={Droplets}
              onClick={handleChangeFloodLevel}
              loading={loadingAction === 'flood'}
              disabled={loadingAction !== null}
              className="w-full"
            >
              {t('admin.changeFloodLevel')}
            </Button>
          </CardContent>
        </Card>

        {/* Control 4: Publish Sample Alert */}
        <Card className="border-app-border">
          <CardHeader className="py-3 bg-[#FAF9F6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#B54708]" />
                <CardTitle className="text-sm">Broadcast Sample Alert</CardTitle>
              </div>
              <Badge variant="high" size="sm">Public Bulletin</Badge>
            </div>
            <CardDescription className="text-xs">
              Publishes a high-urgency advisory to the active broadcast stream without affecting rescue statuses.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-text font-mono">
              Broadcast Corridor: Musi River Basin Drill Corridor.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={Bell}
              onClick={handlePublishAlert}
              loading={loadingAction === 'alert'}
              disabled={loadingAction !== null}
              className="w-full"
            >
              {t('admin.publishSampleAlert')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Control 5: Reset Demo Store (Full-Width Card) */}
      <Card className="border-app-border bg-[#FAF9F6]">
        <CardHeader className="py-3.5 border-b border-app-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-navy-ink" />
              <CardTitle className="text-sm text-navy-ink">Reset Demo Drill Data</CardTitle>
            </div>
            <Badge variant="low" size="sm">Seed Restore</Badge>
          </div>
          <CardDescription className="text-xs">
            {t('admin.resetWarning')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-xs text-navy-ink">
              Restore initial seed incidents
            </h4>
            <p className="text-xs text-muted-text">
              Resets active in-memory incident queue to default seed state (FQ-1024, FQ-1025). Reverts all simulation test markers cleanly.
            </p>
          </div>
          <Button
            variant="outline"
            size="md"
            icon={RotateCcw}
            onClick={handleResetStore}
            loading={loadingAction === 'reset'}
            disabled={loadingAction !== null}
            className="shrink-0 font-bold border-app-border bg-white"
          >
            {t('admin.resetDemoStore')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDemoPage;
