import React, { useState } from 'react';
import { useLang } from '../../context/LangContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Toast
} from '../../components/ui';
import {
  Settings,
  Globe,
  Bell,
  Sliders,
  Shield,
  Save,
  CheckCircle2
} from 'lucide-react';

export const AdminSettingsPage = () => {
  const { lang, setLang } = useLang();

  const [defaultLang, setDefaultLang] = useState(lang || 'en');
  const [alertRadiusKm, setAlertRadiusKm] = useState(5);
  const [criticalFloodThreshold, setCriticalFloodThreshold] = useState(3.5);
  const [autoDetourRouting, setAutoDetourRouting] = useState(true);
  const [smsGatewayFallback, setSmsGatewayFallback] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setLang(defaultLang);
      setToast({
        title: 'System Preferences Saved',
        message: 'SEOC default parameters and alert thresholds updated.',
        type: 'low',
      });
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
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
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-muted-text">Command Center Preferences</span>
            <Badge variant="teal" size="sm">System Configuration</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Platform Settings & Operational Defaults
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Configure system language defaults, automated alert dispatch radius, and hydrological safety thresholds.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Language Configuration (Requirement 8) */}
        <Card className="border-app-border">
          <CardHeader className="py-3.5 bg-[#FAF9F6] border-b border-app-border">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-deep" />
              <CardTitle className="text-xs font-mono uppercase">Default Language & Localization</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'en', label: 'English (Default)', native: 'English' },
                { id: 'te', label: 'Telugu', native: 'తెలుగు' },
                { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
              ].map((l) => (
                <label
                  key={l.id}
                  className={`p-3 rounded-md border cursor-pointer flex flex-col justify-between transition-all ${
                    defaultLang === l.id
                      ? 'border-teal-deep bg-[#E6F1F2]/60 ring-2 ring-teal-deep/30'
                      : 'border-app-border bg-surface hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase text-navy-ink">{l.label}</span>
                    <input
                      type="radio"
                      name="defaultLang"
                      value={l.id}
                      checked={defaultLang === l.id}
                      onChange={(e) => setDefaultLang(e.target.value)}
                      className="text-teal-deep focus:ring-teal-deep"
                    />
                  </div>
                  <span className="text-[11px] text-muted-text mt-1">{l.native}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alert Defaults (Requirement 8) */}
        <Card className="border-app-border">
          <CardHeader className="py-3.5 bg-[#FAF9F6] border-b border-app-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-deep" />
              <CardTitle className="text-xs font-mono uppercase">Alert Dispatch & Telemetry Thresholds</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-ink mb-1">
                  Default Geofence Radius for Emergency Broadcasts (km)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={alertRadiusKm}
                    onChange={(e) => setAlertRadiusKm(Number(e.target.value))}
                    className="w-full accent-teal-deep"
                  />
                  <span className="text-xs font-mono font-bold text-teal-deep min-w-[45px] text-right">
                    {alertRadiusKm} km
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-ink mb-1">
                  Critical Inundation Depth Trigger Level (m)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="10.0"
                    value={criticalFloodThreshold}
                    onChange={(e) => setCriticalFloodThreshold(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep font-mono"
                  />
                  <span className="text-xs font-mono text-muted-text">Meters</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-app-border space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={autoDetourRouting}
                  onChange={(e) => setAutoDetourRouting(e.target.checked)}
                  className="rounded text-teal-deep focus:ring-teal-deep"
                />
                <span className="text-navy-ink font-medium">
                  Enforce automatic detour recalculation around verified blocked causeways
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={smsGatewayFallback}
                  onChange={(e) => setSmsGatewayFallback(e.target.checked)}
                  className="rounded text-teal-deep focus:ring-teal-deep"
                />
                <span className="text-navy-ink font-medium">
                  Enable simulated SMS offline distress fallback buttons for zero cellular data
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            loading={saving}
          >
            Save System Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
