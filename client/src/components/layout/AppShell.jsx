import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button } from '../ui';
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
  FileText
} from 'lucide-react';

export const AppShell = ({ children }) => {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    { label: 'Dispatch Center', path: '/admin/dispatch', icon: Radio },
    { label: 'Flood Hazard Zones', path: '/admin/zones', icon: Compass },
    { label: 'Relief Shelters', path: '/admin/shelters', icon: Building2 },
    { label: 'Broadcast Alerts', path: '/admin/alerts', icon: Bell },
  ];

  // Mobile Bottom Tabs for Citizens
  const citizenTabs = [
    { label: 'Home', path: '/citizen/dashboard', icon: Home },
    { label: 'Request SOS', path: '/citizen/sos', icon: AlertCircle },
    { label: 'Safe Shelters', path: '/citizen/shelters', icon: Building2 },
    { label: 'Advisories', path: '/citizen/alerts', icon: Bell },
  ];

  const sideNavItems = role === 'admin' ? adminNav : role === 'responder' ? responderNav : [];

  return (
    <div className="min-h-screen bg-app-bg text-navy-ink font-sans flex flex-col antialiased">
      {/* 1. TOP APP BAR (The ONLY allowed gradient per DESIGN.md: linear-gradient(135deg, #0F2A3D 0%, #1F6F78 100%)) */}
      <header className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white px-4 md:px-6 py-3 border-b border-[#0A1D2B] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Operational Sector */}
          <div className="flex items-center gap-3">
            <NavLink to={role === 'admin' ? '/admin/dashboard' : role === 'responder' ? '/responder/dashboard' : '/citizen/dashboard'} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="text-xl font-bold tracking-tight text-white select-none">
                FloodWatch
              </span>
            </NavLink>
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-white/20 text-xs text-[#C4D9DF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B7A57]"></span>
              <span className="font-mono">HYDERABAD SECTOR</span>
            </div>
          </div>

          {/* User Profile, Role Badge & Logout */}
          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-semibold text-white leading-tight">
                  {profile.full_name || user?.email}
                </span>
                {profile.agency_name ? (
                  <span className="text-[10px] text-teal-light font-mono truncate max-w-[200px]">
                    {profile.agency_name}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#A4BDC6] font-mono">
                    {profile.email}
                  </span>
                )}
              </div>
            )}

            {role && (
              <Badge variant={roleBadgeVariants[role] || 'teal'} size="sm">
                {roleLabels[role] || role}
              </Badge>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-light"
              title="Sign Out of FloodWatch"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTENT WITH RESPONSIVE LAYOUT */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Desktop Side Navigation for Responder / Admin */}
        {sideNavItems.length > 0 && (
          <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-app-border shrink-0 p-4 gap-1 min-h-[calc(100vh-53px)]">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-text">
              {role === 'admin' ? 'Command Center' : 'Operations Unit'}
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
              <p className="font-mono">Unit: {profile?.agency_name ? profile.agency_name.split(' ')[0] : 'SEOC Central'}</p>
              <p className="text-[10px] text-muted-text mt-0.5">Status: Ready for Triage</p>
            </div>
          </aside>
        )}

        {/* Main Operational Canvas */}
        <main className={`flex-1 p-4 md:p-6 w-full overflow-x-hidden ${role === 'citizen' ? 'pb-20 md:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* 3. MOBILE BOTTOM TAB BAR FOR CITIZENS */}
      {role === 'citizen' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-app-border px-2 py-1.5 flex items-center justify-around shadow-none">
          {citizenTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded text-[11px] font-medium transition-colors ${
                  isActive ? 'text-teal-deep font-semibold' : 'text-muted-text hover:text-navy-ink'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-deep' : 'text-muted-text'}`} />
                <span className="mt-0.5">{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default AppShell;
