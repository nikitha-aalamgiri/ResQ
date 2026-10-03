import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { apiFetch } from '../../lib/api';
import { generateSmsLink, syncOfflineSOSQueue, getOfflineSOSQueue } from '../../lib/offlineStore';
import { onSOSEvent } from '../../lib/broadcast';
import { Badge, Button, Toast } from '../ui';
import {
  LogOut,
  Radio,
  Home,
  AlertCircle,
  Building2,
  Bell,
  MapPin,
  Shield,
  LayoutDashboard,
  Compass,
  FileText,
  Globe,
  WifiOff,
  Wifi,
  Phone,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

export const AppShell = ({ children }) => {
  const { user, profile, role, signOut } = useAuth();
  const { lang, setLang, t, languages } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  // Offline Mode State (Requirement 5)
  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState(null);

  // Alert Notification State & Badging (Step 8 Requirement 2)
  const [unreadAlertCount, setUnreadAlertCount] = useState(() => {
    const saved = localStorage.getItem('resq_unread_alerts');
    return saved !== null ? parseInt(saved, 10) : 2;
  });
  const [alertToast, setAlertToast] = useState(null);

  // Clear unread alerts when visiting alerts page
  useEffect(() => {
    if (location.pathname === '/citizen/alerts') {
      setUnreadAlertCount(0);
      localStorage.setItem('resq_unread_alerts', '0');
    }
  }, [location.pathname]);

  // Realtime Broadcast Listener for published alerts
  useEffect(() => {
    const unsubscribe = onSOSEvent((event) => {
      if (event.type === 'ALERT_PUBLISHED' && event.alert) {
        setUnreadAlertCount((prev) => {
          const next = prev + 1;
          localStorage.setItem('resq_unread_alerts', String(next));
          return next;
        });

        if (role === 'citizen') {
          const localizedMsg =
            event.alert.translations?.[lang] ||
            event.alert.description ||
            'Emergency alert issued for your area.';
          setAlertToast({
            title: `EMERGENCY ALERT: ${event.alert.title}`,
            message: localizedMsg,
            type: event.alert.severity === 'critical' ? 'critical' : 'high',
          });
        }
      }
    });
    return unsubscribe;
  }, [role, lang]);

  // Monitor network connection
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      // Flush queued offline SOS requests
      const result = await syncOfflineSOSQueue(apiFetch);
      if (result.synced > 0) {
        setOfflineSyncMessage(`Network restored. Synced ${result.synced} offline SOS requests to SEOC dispatch.`);
        setTimeout(() => setOfflineSyncMessage(null), 5000);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOffline = isOffline || simulatedOffline;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Role Badge Styling matching DESIGN.md
  const roleBadgeVariants = {
    citizen: 'teal',
    responder: 'high',
    admin: 'critical',
  };

  const roleLabels = {
    citizen: 'Citizen',
    responder: 'Field Responder',
    admin: 'Command Admin',
  };

  // Nav Links for Responder
  const responderNav = [
    { label: 'Triage Dashboard', path: '/responder/dashboard', icon: LayoutDashboard },
    { label: 'Distress Incidents', path: '/responder/triage', icon: Radio },
    { label: 'Operations Map', path: '/responder/map', icon: MapPin },
    { label: 'Shelters & Logistics', path: '/responder/shelters', icon: Building2 },
  ];

  // Nav Links for Admin
  const adminNav = [
    { label: 'Command Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Geospatial Map', path: '/admin/map', icon: MapPin },
    { label: 'Dispatch Center', path: '/admin/dispatch', icon: Radio },
    { label: 'Flood Hazard Zones', path: '/admin/zones', icon: Compass },
    { label: 'Relief Shelters', path: '/admin/shelters', icon: Building2 },
    { label: 'Broadcast Alerts', path: '/admin/alerts', icon: Bell },
  ];

  // Mobile Bottom Tabs for Citizens (Localized via LangContext)
  const citizenTabs = [
    { label: t('home'), path: '/citizen/dashboard', icon: Home },
    { label: t('map'), path: '/citizen/map', icon: MapPin },
    { label: t('safeRoute'), path: '/citizen/route', icon: Compass },
    { label: t('shelters'), path: '/citizen/shelters', icon: Building2 },
    { label: t('alerts'), path: '/citizen/alerts', icon: Bell },
    { label: t('contacts'), path: '/citizen/contacts', icon: Phone },
  ];

  const sideNavItems = role === 'admin' ? adminNav : role === 'responder' ? responderNav : [];

  // Generate pre-filled simulated SMS link for offline fallback
  const smsFallbackLink = generateSmsLink({
    id: `FQ-OFFLINE-${Date.now().toString().slice(-4)}`,
    lat: 17.3750,
    lng: 78.4867,
    type: 'Trapped in Rising Water',
    count: 2,
  });

  return (
    <div className="min-h-screen bg-app-bg text-navy-ink font-sans flex flex-col antialiased">
      {/* 1. TOP APP BAR (Allowed gradient: linear-gradient(135deg, #0F2A3D 0%, #1F6F78 100%)) */}
      <header className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white px-4 md:px-6 py-2.5 border-b border-[#0A1D2B] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Operational Sector */}
          <div className="flex items-center gap-3">
            <NavLink
              to={role === 'admin' ? '/admin/dashboard' : role === 'responder' ? '/responder/dashboard' : '/citizen/dashboard'}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="text-xl font-bold tracking-tight text-white select-none">
                FloodWatch
              </span>
            </NavLink>
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-white/20 text-xs text-[#C4D9DF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B7A57]"></span>
              <span className="font-mono">{t('sector')}</span>
            </div>
          </div>

          {/* User Controls, Language Dropdown & Role Badge */}
          <div className="flex items-center gap-2.5">
            {/* Language Selector Dropdown (Requirement 4: EN dropdown in app bar) */}
            <div className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2 py-1 rounded border border-white/20 text-xs text-white transition-colors">
              <Globe className="w-3.5 h-3.5 text-teal-light shrink-0" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer border-none py-0 pl-0 pr-1"
                aria-label="Select Language"
              >
                <option value="en" className="text-navy-ink bg-white">EN (English)</option>
                <option value="te" className="text-navy-ink bg-white">TE (తెలుగు)</option>
                <option value="hi" className="text-navy-ink bg-white">HI (हिन्दी)</option>
              </select>
            </div>

            {/* Offline Simulator Switch for Demo / Testing */}
            <button
              type="button"
              onClick={() => setSimulatedOffline(!simulatedOffline)}
              className={`p-1.5 rounded border transition-colors ${
                effectiveOffline
                  ? 'bg-[#B54708] border-[#FEDF89] text-white'
                  : 'bg-white/10 border-white/20 text-white/80 hover:text-white'
              }`}
              title={effectiveOffline ? 'Online: Click to restore network' : 'Offline Drill: Click to simulate offline mode'}
            >
              {effectiveOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            </button>

            {/* Alerts Bell for Citizen */}
            {role === 'citizen' && (
              <Link
                to="/citizen/alerts"
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/20 text-white relative transition-colors"
                title="View Active Flood Advisories"
              >
                <Bell className="w-4 h-4" />
                {unreadAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#B42318] text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
                    {unreadAlertCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Profile Info */}
            {profile && (
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-semibold text-white leading-tight">
                  {profile.full_name || user?.email}
                </span>
                <span className="text-[10px] text-teal-light font-mono truncate max-w-[180px]">
                  {profile.agency_name || profile.email}
                </span>
              </div>
            )}

            {role && (
              <Badge variant={roleBadgeVariants[role] || 'teal'} size="sm" className="hidden sm:inline-flex">
                {roleLabels[role] || role}
              </Badge>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-md transition-colors focus:outline-none"
              title="Sign Out of Platform"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('signOut')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* OFFLINE MODE BANNER (Requirement 5: Calm amber strip) */}
      {effectiveOffline && (
        <div className="bg-[#FEF6EE] border-b border-[#F9DBAF] text-[#B54708] px-4 py-2 text-xs transition-all animate-in slide-in-from-top-1 sticky top-[45px] z-30 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#B54708]" />
              <span className="font-medium">
                {t('offlineBanner')}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mock Send SOS by SMS link (Requirement 5) */}
              <a
                href={smsFallbackLink}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#B54708] hover:bg-[#93370D] text-white font-mono text-[11px] font-semibold transition-colors shadow-xs"
                title="Send pre-formatted emergency dispatch text via cellular SMS"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('sendSmsSos')}</span>
              </a>

              <Link
                to="/citizen/contacts"
                className="underline text-xs text-[#B54708] font-semibold hover:text-[#93370D]"
              >
                Emergency Helplines →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Network Restored Flash Toast Banner */}
      {offlineSyncMessage && (
        <div className="bg-[#EDF6F1] border-b border-[#C3E4D1] text-[#3B7A57] px-4 py-2 text-xs text-center font-medium animate-in fade-in">
          {offlineSyncMessage}
        </div>
      )}

      {/* 2. BODY CONTENT WITH RESPONSIVE LAYOUT */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Desktop Side Navigation for Responder / Admin */}
        {sideNavItems.length > 0 && (
          <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-app-border shrink-0 p-4 gap-1 min-h-[calc(100vh-53px)]">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-text font-mono">
              {role === 'admin' ? 'SEOC Master Command' : 'Field Operations Unit'}
            </div>
            <nav className="flex flex-col gap-1">
              {sideNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-light text-teal-deep border border-[#c4dcde]'
                        : 'text-navy-ink hover:bg-app-bg hover:text-teal-deep border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-auto pt-4 border-t border-app-border text-[11px] text-muted-text">
              <p className="font-mono">Agency: {profile?.agency_name ? profile.agency_name.split(' ')[0] : 'SEOC Central'}</p>
              <p className="text-[10px] text-muted-text mt-0.5">Status: Realtime Active</p>
            </div>
          </aside>
        )}

        {/* Main Operational Canvas */}
        <main className={`flex-1 p-4 md:p-6 w-full overflow-x-hidden ${role === 'citizen' ? 'pb-24 md:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* 3. MOBILE BOTTOM TAB BAR FOR CITIZENS */}
      {role === 'citizen' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-app-border px-1 py-1.5 flex items-center justify-around shadow-xs">
          {citizenTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
                  isActive ? 'text-teal-deep font-bold' : 'text-muted-text hover:text-navy-ink'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-deep' : 'text-muted-text'}`} />
                <span className="mt-0.5 truncate max-w-[64px]">{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
      {/* Realtime Alert Broadcast Toast Popup (Step 8 Requirement 2) */}
      {alertToast && (
        <div
          className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-in fade-in cursor-pointer max-w-sm"
          onClick={() => {
            setAlertToast(null);
            navigate('/citizen/alerts');
          }}
        >
          <Toast
            title={alertToast.title}
            message={alertToast.message}
            type={alertToast.type}
            onClose={() => setAlertToast(null)}
          />
        </div>
      )}
    </div>
  );
};

export default AppShell;
