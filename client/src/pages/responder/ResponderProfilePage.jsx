import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
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
  Shield,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Award,
  Radio,
  Clock,
  LogOut,
  Power
} from 'lucide-react';

export const ResponderProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const [isAvailable, setIsAvailable] = useState(profile?.is_available !== false);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  const toggleAvailability = async () => {
    setUpdating(true);
    try {
      const nextStatus = !isAvailable;
      const res = await apiFetch('/responder/availability', {
        method: 'PATCH',
        body: JSON.stringify({ is_available: nextStatus }),
      });
      if (res && res.success) {
        setIsAvailable(nextStatus);
        setToast({
          title: 'Duty Status Updated',
          message: `You are now marked as ${nextStatus ? 'Online & Ready for Dispatch' : 'Offline / Standby'}`,
          type: nextStatus ? 'low' : 'medium',
        });
      }
    } catch (err) {
      setToast({
        title: 'Update Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
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
            <span className="text-xs font-mono uppercase text-muted-text">Field Credentials</span>
            <Badge variant="teal" size="sm">Authorized Responder</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Responder Profile & Duty Status
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            SEOC identity credentials, operational callsign, and agency deployment records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isAvailable ? 'primary' : 'outline'}
            size="sm"
            icon={Power}
            loading={updating}
            onClick={toggleAvailability}
          >
            {isAvailable ? 'Status: Online' : 'Status: Standby'}
          </Button>
        </div>
      </div>

      {/* Profile Details Card */}
      <Card className="border-app-border overflow-hidden">
        <CardHeader className="bg-[#FAF9F6] py-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-deep text-white flex items-center justify-center font-bold text-xl font-mono shrink-0 shadow-xs">
              {(profile?.full_name || 'KV').split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-navy-ink font-mono">
                  {profile?.full_name || 'Inspector K. Vikram'}
                </h2>
                <Badge variant={isAvailable ? 'low' : 'medium'} size="sm">
                  {isAvailable ? 'Active on Duty' : 'Off Duty'}
                </Badge>
              </div>
              <p className="text-xs text-muted-text font-medium mt-0.5">
                {profile?.agency_name || '10th Battalion NDRF (National Disaster Response Force)'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 divide-y divide-app-border text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-muted-text">Tactical Badge ID:</span>
            <span className="font-mono font-bold text-navy-ink">NDRF-HYD-401</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-muted-text">Official Email:</span>
            <span className="font-mono text-navy-ink">{user?.email || 'responder@resq.gov'}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-muted-text">Emergency Hotline Phone:</span>
            <span className="font-mono font-bold text-teal-deep">{profile?.phone || '+91 94400 11221'}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-muted-text">Current Tactical Staging Area:</span>
            <span className="font-medium text-navy-ink">Moosarambagh Riverbed Sector</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-muted-text">Assigned Vehicle / Gear:</span>
            <span className="font-medium text-navy-ink">Inflatable Rescue Boat Unit 3 (IRB)</span>
          </div>
        </CardContent>
      </Card>

      {/* Verified Skills */}
      <Card className="border-app-border">
        <CardHeader className="py-3 bg-[#FAF9F6]">
          <CardTitle className="text-xs font-mono uppercase flex items-center gap-2">
            <Award className="w-4 h-4 text-teal-deep" />
            <span>Certified Operational Qualifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              'Swiftwater Rescue Technician (SRT-1)',
              'Outboard Motor (OBM) Power Boat Pilot',
              'Advanced Hypothermia Trauma Triage',
              'SEOC Secure Radio Channel Operator',
              'Urban Flood Inundation Evacuation Protocol'
            ].map((skill, i) => (
              <Badge key={i} variant="teal" size="sm" className="py-1 px-2.5">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
