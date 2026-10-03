import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { CitizenLogin } from './pages/auth/CitizenLogin';
import { CitizenRegister } from './pages/auth/CitizenRegister';
import { ResponderLogin } from './pages/auth/ResponderLogin';
import { AdminLogin } from './pages/auth/AdminLogin';

// Role Dashboards
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { ResponderDashboard } from './pages/responder/ResponderDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Dedicated Geospatial Map Pages (Step 3)
import { CitizenMapPage } from './pages/citizen/CitizenMapPage';
import { ResponderMapPage } from './pages/responder/ResponderMapPage';
import { AdminMapPage } from './pages/admin/AdminMapPage';

// Citizen SOS Distress & Status Pages (Step 4)
import { SendSOSPage } from './pages/citizen/SendSOSPage';
import { SOSStatusPage } from './pages/citizen/SOSStatusPage';

// Responder Incidents & Status Pages (Step 5)
import { ResponderTriagePage } from './pages/responder/ResponderTriagePage';
import { IncidentDetailsPage } from './pages/responder/IncidentDetailsPage';
import { UpdateStatusPage } from './pages/responder/UpdateStatusPage';

// Safe Route & Tactical Navigation Pages (Step 6)
import { SafeRoutePage } from './pages/citizen/SafeRoutePage';
import { NavigateIncidentPage } from './pages/responder/NavigateIncidentPage';

// Card & Badge for sub-routes
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from './components/ui';
import { Radio, AlertCircle, Building2, MapPin, Compass, Bell, Shield } from 'lucide-react';

/**
 * Root Route Redirector
 * Directs authenticated users to their specific portal dashboard, or unauthenticated users to /login.
 */
function RootRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <span className="text-xs font-mono text-muted-text">Initializing FloodWatch session...</span>
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'responder') return <Navigate to="/responder/dashboard" replace />;
  return <Navigate to="/citizen/dashboard" replace />;
}

/**
 * Generic Placeholder Module for Secondary Role Sub-Routes
 */
function OperationalPlaceholder({ title, description, icon: Icon = Radio, roleType = 'citizen' }) {
  return (
    <div className="space-y-4">
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-surface border border-app-border">
                <Icon className="w-5 h-5 text-teal-deep" />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <Badge variant="teal" size="sm">Step 2 Verified</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-muted-text">
          <p className="font-mono text-navy-ink font-medium text-sm mb-1">
            Portal Access & Authorization Confirmed
          </p>
          <p>
            This operational module is securely routed for authenticated <span className="font-semibold text-teal-deep uppercase font-mono">{roleType}</span> users.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root Redirect based on Role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public Authentication Portals */}
          <Route path="/login" element={<CitizenLogin />} />
          <Route path="/register" element={<CitizenRegister />} />
          <Route path="/responder/login" element={<ResponderLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* CITIZEN PORTAL (/citizen/*) */}
          <Route
            path="/citizen"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <Navigate to="/citizen/dashboard" replace />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/dashboard"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <CitizenDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/map"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <CitizenMapPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/sos"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <SendSOSPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/sos/:id"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <SOSStatusPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/sos/status"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <SOSStatusPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/requests"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <SOSStatusPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/route"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <SafeRoutePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/shelters"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <OperationalPlaceholder
                    title="Verified Emergency Relief Camps"
                    description="Live occupancy, medical supply availability, and contact officers across Hyderabad"
                    icon={Building2}
                    roleType="citizen"
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/alerts"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppShell>
                  <OperationalPlaceholder
                    title="Active Flood Inundation Advisories"
                    description="Real-time water level alerts, barrage gate discharge, and transit diversions"
                    icon={Bell}
                    roleType="citizen"
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* RESPONDER PORTAL (/responder/*) */}
          <Route
            path="/responder"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <Navigate to="/responder/dashboard" replace />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/dashboard"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <ResponderDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/triage"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <ResponderTriagePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/incidents/:id"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <IncidentDetailsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/incidents/:id/update"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <UpdateStatusPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/incidents/:id/navigate"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <NavigateIncidentPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/navigate/:id"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <NavigateIncidentPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/map"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <ResponderMapPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/responder/shelters"
            element={
              <ProtectedRoute allowedRoles={['responder']}>
                <AppShell>
                  <OperationalPlaceholder
                    title="Field Shelter Capacity Tracking"
                    description="Update intake counts, resource requests, and ambulance transfers"
                    icon={Building2}
                    roleType="responder"
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* ADMIN PORTAL (/admin/*) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <Navigate to="/admin/dashboard" replace />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <AdminDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/map"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <AdminMapPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dispatch"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <OperationalPlaceholder
                    title="Central Incident Dispatch Center"
                    description="Multi-agency assignment and telemetry routing for NDRF, GHMC DRF, and SDRF"
                    icon={Radio}
                    roleType="admin"
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/zones"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <OperationalPlaceholder
                    title="Flood Hazard Zones Administration"
                    description="Configure sensor thresholds, water levels, evacuation zones, and boundaries"
                    icon={Compass}
                    roleType="admin"
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shelters"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <OperationalPlaceholder
                    title="Municipal Relief Shelters Master Control"
                    description="Manage facilities, bed capacity, supply logistics, and sector distribution"
                    icon={Building2}
                    roleType="admin"
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/alerts"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <OperationalPlaceholder
                    title="State Broadcast Alert Management"
                    description="Broadcast emergency push notifications and SMS warnings across sectors"
                    icon={Bell}
                    roleType="admin"
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Catch-all Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
