import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware/auth.js';
import { requireRole } from './middleware/role.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Helper to safely load mock GeoJSON files
const getMockDataPath = (fileName) => {
  return path.resolve(__dirname, '../../data/mock', fileName);
};

// ============================================================================
// Public / Telemetry Endpoints
// ============================================================================

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ResQ Emergency Backend Server',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// 2. Mock Flood Zones
app.get('/api/mock/flood-zones', (req, res) => {
  try {
    const raw = fs.readFileSync(getMockDataPath('flood_zones.geojson'), 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read flood_zones mock data', details: err.message });
  }
});

// 3. Mock Shelters
app.get('/api/mock/shelters', (req, res) => {
  try {
    const raw = fs.readFileSync(getMockDataPath('shelters.geojson'), 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read shelters mock data', details: err.message });
  }
});

// 4. Mock Blocked Roads
app.get('/api/mock/blocked-roads', (req, res) => {
  try {
    const raw = fs.readFileSync(getMockDataPath('blocked_roads.geojson'), 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read blocked_roads mock data', details: err.message });
  }
});

// 5. System Overview Telemetry Endpoint
app.get('/api/mock/overview', (req, res) => {
  try {
    const floodZones = JSON.parse(fs.readFileSync(getMockDataPath('flood_zones.geojson'), 'utf-8'));
    const shelters = JSON.parse(fs.readFileSync(getMockDataPath('shelters.geojson'), 'utf-8'));
    const blockedRoads = JSON.parse(fs.readFileSync(getMockDataPath('blocked_roads.geojson'), 'utf-8'));

    const totalShelterCapacity = shelters.features.reduce((acc, f) => acc + (f.properties.capacity || 0), 0);
    const totalShelterOccupancy = shelters.features.reduce((acc, f) => acc + (f.properties.occupancy || 0), 0);

    res.json({
      area: 'Hyderabad, India (Simulation Drill)',
      hazard_level: 'High Inundation Alert',
      counts: {
        flood_zones: floodZones.features.length,
        critical_zones: floodZones.features.filter(f => f.properties.severity === 'critical').length,
        shelters: shelters.features.length,
        total_shelter_capacity: totalShelterCapacity,
        total_shelter_occupancy: totalShelterOccupancy,
        blocked_roads: blockedRoads.features.length,
        simulated_sos_active: 3,
      },
      critical_roads: blockedRoads.features.map(f => f.properties.road_name),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build mock overview', details: err.message });
  }
});

// ============================================================================
// Authenticated & Role-Protected Endpoints (STEP 2)
// ============================================================================

// 6. Current User Profile Endpoint (Task 6 requirement: GET /api/me returns role)
app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    id: req.user.id,
    email: req.user.email,
    role: req.profile.role,
    full_name: req.profile.full_name,
    agency_name: req.profile.agency_name || null,
    profile: req.profile,
  });
});

// 7. Protected Responder Route (Responders & Admins only)
app.get('/api/responder/status', requireAuth, requireRole('responder', 'admin'), (req, res) => {
  res.json({
    authorized: true,
    role: req.profile.role,
    message: 'Active responder triage queue operational',
    unit: req.profile.agency_name || 'Emergency Responder',
    responder: req.profile.full_name,
  });
});

// 8. Protected Admin Route (Admins only)
app.get('/api/admin/system', requireAuth, requireRole('admin'), (req, res) => {
  res.json({
    authorized: true,
    role: 'admin',
    message: 'State Emergency Operations Center (SEOC) administration active',
    admin: req.profile.full_name,
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`[ResQ Server] Operational on port ${PORT}`);
  console.log(`[ResQ Server] Health: http://localhost:${PORT}/api/health`);
  console.log(`[ResQ Server] User Auth Test: http://localhost:${PORT}/api/me`);
});

export default app;
