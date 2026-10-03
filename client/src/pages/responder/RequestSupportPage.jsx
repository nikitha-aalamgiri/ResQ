import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent } from '../../lib/broadcast';
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
  LifeBuoy,
  HeartPulse,
  Users,
  Droplets,
  Truck,
  Wrench,
  AlertTriangle,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight
} from 'lucide-react';

const SUPPORT_TILES = [
  {
    id: 'Rescue Boat',
    title: 'Rescue Boat',
    description: 'Inflatable boat / OBM for swiftwater or deep basin extraction',
    icon: LifeBuoy,
  },
  {
    id: 'Medical Team',
    title: 'Medical Team',
    description: 'Field doctor, paramedic triage, or emergency oxygen supply',
    icon: HeartPulse,
  },
  {
    id: 'Additional Personnel',
    title: 'Additional Personnel',
    description: 'Backup extraction squad for large crowd evacuation',
    icon: Users,
  },
  {
    id: 'Food / Water',
    title: 'Food / Water',
    description: 'Emergency potable water pouches & dry ration emergency packs',
    icon: Droplets,
  },
  {
    id: 'Transport Vehicle',
    title: 'Transport Vehicle',
    description: 'High-clearance 4x4 troop truck or evacuation shuttle',
    icon: Truck,
  },
  {
    id: 'Equipment',
    title: 'Equipment',
    description: 'High-flow dewatering pumps, generator, or cutting equipment',
    icon: Wrench,
  },
];

export const RequestSupportPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState('Rescue Boat');
  const [priority, setPriority] = useState('high'); // 'high' | 'medium' | 'low'
  const [location, setLocation] = useState(profile?.current_location || 'Moosarambagh Riverbed Sector');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) return;

    setSubmitting(true);
    try {
      const payload = {
        support_type: selectedType,
        priority,
        location,
        notes: details,
      };

      const res = await apiFetch('/support-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.success) {
        broadcastSOSEvent({
          type: 'SUPPORT_REQUEST_CREATED',
          request: res.data,
        });

        setToast({
          title: 'Support Request Dispatched',
          message: `SEOC Command has received your request for ${selectedType} (${priority.toUpperCase()} Priority).`,
          type: 'low',
        });

        setDetails('');
      } else {
        throw new Error(res?.error || 'Failed to dispatch request');
      }
    } catch (err) {
      setToast({
        title: 'Dispatch Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setSubmitting(false);
    }
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
            <Badge variant="high" size="sm">Tactical Request</Badge>
            <span className="text-xs font-mono text-muted-text">Command Dispatch Direct Link</span>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Request Additional Support
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Log technical gear, extra manpower, medical assistance, or relief logistics to State Command.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Requirement Tiles Grid (Requirement 1) */}
        <div>
          <label className="block text-xs font-bold font-mono text-navy-ink uppercase mb-2">
            1. Select Required Resource / Support Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUPPORT_TILES.map((tile) => {
              const Icon = tile.icon;
              const isSelected = selectedType === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setSelectedType(tile.id)}
                  className={`p-4 rounded-md text-left border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-deep bg-[#E6F1F2]/60 ring-2 ring-teal-deep/30'
                      : 'border-app-border bg-surface hover:border-teal-deep/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded ${isSelected ? 'bg-teal-deep text-white' : 'bg-[#FAF9F6] text-teal-deep border border-app-border'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-deep" />
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-navy-ink font-mono">{tile.title}</h3>
                    <p className="text-xs text-muted-text mt-1 leading-snug">{tile.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Radio Selection (Requirement 1) */}
        <Card className="border-app-border">
          <CardHeader className="py-3 bg-[#FAF9F6]">
            <CardTitle className="text-xs font-mono uppercase">2. Urgency & Priority Level</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'high', label: 'High Priority', desc: 'Life-threatening / immediate hazard', color: 'border-[#FDA29B] bg-[#FDF2F2] text-[#B42318]' },
                { id: 'medium', label: 'Medium Priority', desc: 'Anticipated cutoff within 1-2 hours', color: 'border-[#FECDCA] bg-[#FEF6EE] text-[#B54708]' },
                { id: 'low', label: 'Low Priority', desc: 'Routine resupply / precautionary stock', color: 'border-[#C3E4D1] bg-[#EDF6F1] text-[#3B7A57]' },
              ].map((p) => {
                const isSelected = priority === p.id;
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-3 p-3.5 rounded-md border cursor-pointer transition-all ${
                      isSelected
                        ? `${p.color} ring-2 ring-offset-1`
                        : 'border-app-border bg-surface hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p.id}
                      checked={isSelected}
                      onChange={(e) => setPriority(e.target.value)}
                      className="mt-0.5 text-teal-deep focus:ring-teal-deep"
                    />
                    <div>
                      <div className="text-xs font-bold font-mono uppercase">{p.label}</div>
                      <div className="text-[11px] text-muted-text mt-0.5">{p.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Location & Details Field (Requirement 1) */}
        <Card className="border-app-border">
          <CardHeader className="py-3 bg-[#FAF9F6]">
            <CardTitle className="text-xs font-mono uppercase">3. Operational Details & Rendezvous Location</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">
                Drop-off / Tactical Staging Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-muted-text" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Moosarambagh Causeway North Approach"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-app-border rounded-md bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">
                Details & Justification
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain the specific tactical condition, headcount, access roadblocks, or immediate clinical hazards..."
                className="w-full p-3 text-xs border border-app-border rounded-md bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-muted-text">
            Requests are transmitted directly to SEOC Central Command with 0ms live broadcast.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Send}
            loading={submitting}
            disabled={submitting}
          >
            Send Support Request
          </Button>
        </div>
      </form>
    </div>
  );
};
