import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { apiFetch } from '../../lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Toast,
} from '../../components/ui';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Compass,
  Building2,
  Save,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Database,
} from 'lucide-react';
import { PrepareOfflineCard } from '../../components/offline/PrepareOfflineCard';
import { InstallAppButton } from '../../components/common/InstallAppButton';

/**
 * Normalizes an Indian phone number string
 * Matches server-side validation in server/src/services/sms.js
 */
function validateAndNormalizeIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'INVALID_PHONE' };
  }

  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    return { valid: false, error: 'INVALID_PHONE' };
  }

  return { valid: true, normalized: cleaned, formatted: `+91-${cleaned}` };
}

export const CitizenProfilePage = () => {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const { t, lang, setLang } = useLang();

  // Initial phone number: strip prefix if present to display clean 10-digit number
  const getInitialPhone = () => {
    const raw = profile?.phone || '';
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned.substring(2);
    }
    if (cleaned.length === 10) {
      return cleaned;
    }
    return raw;
  };

  const [phone, setPhone] = useState(getInitialPhone);
  const [smsEnabled, setSmsEnabled] = useState(() => profile?.sms_enabled !== false);
  const [phoneVerified, setPhoneVerified] = useState(() => Boolean(profile?.phone_verified));
  const [phoneError, setPhoneError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Sync state if profile loads asynchronously
  useEffect(() => {
    if (profile) {
      setPhone(getInitialPhone());
      setSmsEnabled(profile.sms_enabled !== false);
      setPhoneVerified(Boolean(profile.phone_verified));
    }
  }, [profile]);

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    setPhoneError('');

    // If phone number is changed from the original verified one, it becomes unverified
    const originalCleaned = (profile?.phone || '').replace(/\D/g, '').slice(-10);
    const newCleaned = val.replace(/\D/g, '').slice(-10);
    if (originalCleaned && newCleaned !== originalCleaned) {
      setPhoneVerified(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setPhoneError('');

    // Validate phone number
    const validation = validateAndNormalizeIndianPhone(phone);
    if (!validation.valid) {
      setPhoneError(t('errors.INVALID_PHONE'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: validation.formatted,
          sms_enabled: smsEnabled,
        }),
      });

      if (res && res.success) {
        // Update context & local state
        const updatedData = {
          phone: validation.formatted,
          sms_enabled: smsEnabled,
          phone_verified: res.data?.phone_verified ?? false,
        };
        if (updateProfile) {
          updateProfile(updatedData);
        }
        setPhoneVerified(Boolean(res.data?.phone_verified));

        setToast({
          title: t('citizen.profileUpdated'),
          message: t('common.success'),
          type: 'low',
        });
      } else {
        const errCode = res?.code || 'generic';
        setPhoneError(t(`errors.${errCode}`) || res?.message || t('errors.generic'));
      }
    } catch (err) {
      setToast({
        title: t('common.error'),
        message: err.message || t('errors.generic'),
        type: 'critical',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
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
            <span className="text-xs font-mono uppercase text-muted-text">{t('nav.more')}</span>
            <Badge variant="teal" size="sm">
              {t('citizen.phoneVerified')} Citizen
            </Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            {t('citizen.profileTitle')}
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            {t('citizen.profileSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InstallAppButton />
          <Badge variant="low" mono size="sm">
            {profile?.full_name || user?.email?.split('@')[0] || 'Resident'}
          </Badge>
        </div>
      </div>

      {/* Prepare for Offline Card (Phase 1) */}
      <PrepareOfflineCard className="mb-5" />

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Account Details Card */}
        <Card className="border-app-border">
          <CardHeader className="bg-[#FAF9F6] py-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-deep" />
              <CardTitle className="text-sm">Account Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-app-border">
              <span className="text-muted-text font-medium">{t('auth.fullName')}:</span>
              <span className="font-semibold text-navy-ink">
                {profile?.full_name || 'Resident Citizen'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-app-border">
              <span className="text-muted-text font-medium">{t('auth.email')}:</span>
              <span className="font-mono text-navy-ink">
                {profile?.email || user?.email || 'citizen@example.com'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-text font-medium">{t('auth.role')}:</span>
              <Badge variant="teal" size="sm">
                Citizen
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Mobile & SMS Alerts Card */}
        <Card className="border-app-border">
          <CardHeader className="bg-[#FAF9F6] py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-deep" />
                <CardTitle className="text-sm">{t('citizen.phoneNumber')}</CardTitle>
              </div>
              <div>
                {phoneVerified ? (
                  <Badge variant="low" size="sm" className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#3B7A57]" />
                    {t('citizen.phoneVerified')}
                  </Badge>
                ) : (
                  <Badge variant="medium" size="sm">
                    {t('citizen.phoneUnverified')}
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription>
              {t('citizen.phoneFormatHelp')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-5">
            {/* Phone Input */}
            <div className="space-y-1.5">
              <label htmlFor="citizen-phone-input" className="block text-xs font-semibold text-navy-ink">
                {t('citizen.phoneNumber')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono text-muted-text select-none">
                  +91
                </span>
                <input
                  id="citizen-phone-input"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="9849033331"
                  maxLength={14}
                  className={`w-full pl-12 pr-3 py-2 text-xs font-mono text-navy-ink bg-surface border rounded-md transition-colors placeholder:text-muted-text/60 focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-transparent ${
                    phoneError ? 'border-[#B42318] focus:ring-[#B42318]' : 'border-app-border'
                  }`}
                />
              </div>

              {phoneError ? (
                <p className="text-[11px] text-[#B42318] mt-1">{phoneError}</p>
              ) : (
                <p className="text-[11px] text-muted-text mt-1">
                  {t('citizen.phoneFormatHelp')} · Changing phone resets verification status.
                </p>
              )}
            </div>

            {/* SMS Toggle */}
            <div className="p-3.5 rounded-md border border-app-border bg-app-bg space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sms-toggle"
                  className="text-xs font-bold text-navy-ink cursor-pointer flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-teal-deep" />
                  <span>{t('citizen.smsUpdatesLabel')}</span>
                </label>

                {/* Accessible switch */}
                <input
                  id="sms-toggle"
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="w-4 h-4 text-teal-deep rounded border-app-border focus:ring-teal-deep cursor-pointer"
                />
              </div>

              <p className="text-[11px] text-muted-text leading-relaxed">
                {t('citizen.smsUpdatesHelp')}
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Save}
                loading={isSaving}
              >
                {t('citizen.saveProfile')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* "More" Quick Safety Navigation Links */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] py-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-deep" />
            <CardTitle className="text-sm">Safety Services & Quick Links</CardTitle>
          </div>
          <CardDescription>Direct navigation to emergency evacuation tools</CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <Link
            to="/citizen/offline-data"
            className="p-3 rounded-md border border-app-border bg-surface hover:bg-app-bg transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-teal-deep" />
              <div>
                <p className="font-semibold text-navy-ink">{t('offline.offlineDataTitle')}</p>
                <p className="text-[10px] text-muted-text">{t('offline.offlineDataSubtitle')}</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-text" />
          </Link>

          <Link
            to="/citizen/contacts"
            className="p-3 rounded-md border border-app-border bg-surface hover:bg-app-bg transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-teal-deep" />
              <div>
                <p className="font-semibold text-navy-ink">{t('nav.contacts')}</p>
                <p className="text-[10px] text-muted-text">Direct 112, 108 & disaster cells</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-text" />
          </Link>

          <Link
            to="/citizen/alerts"
            className="p-3 rounded-md border border-app-border bg-surface hover:bg-app-bg transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#B54708]" />
              <div>
                <p className="font-semibold text-navy-ink">{t('nav.alerts')}</p>
                <p className="text-[10px] text-muted-text">Musi river & water surge advisories</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-text" />
          </Link>

          <Link
            to="/citizen/shelters"
            className="p-3 rounded-md border border-app-border bg-surface hover:bg-app-bg transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#3B7A57]" />
              <div>
                <p className="font-semibold text-navy-ink">{t('nav.shelters')}</p>
                <p className="text-[10px] text-muted-text">Relief camps with food & beds</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-text" />
          </Link>

          <Link
            to="/citizen/route"
            className="p-3 rounded-md border border-app-border bg-surface hover:bg-app-bg transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-teal-deep" />
              <div>
                <p className="font-semibold text-navy-ink">{t('nav.safeRoute')}</p>
                <p className="text-[10px] text-muted-text">Flood-safe evacuation navigation</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-text" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default CitizenProfilePage;
