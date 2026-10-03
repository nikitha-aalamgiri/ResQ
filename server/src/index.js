import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { requireAuth } from './middleware/auth.js';
import { requireRole } from './middleware/role.js';
import { assessRisk } from './services/risk.js';
import { calculatePriority } from './services/priority.js';
import { createSOSRequest, getCitizenSOSRequests, getSOSById } from './services/sosStore.js';

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
app.use(express.json({ limit: '15mb' }));

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

// ============================================================================
// Step 4: Risk Assessment & SOS Distress Endpoints
// ============================================================================

// 9. Location Flood Risk Assessment (Turf Point-in-Polygon)
app.get('/api/risk', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  try {
    const assessment = assessRisk(lat, lng);
    return res.json(assessment);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Zod Validation Schema for SOS Dispatch Request
const sosSchema = z.object({
  type: z.string().min(1, 'Emergency type is required'),
  people_count: z.coerce.number().int().min(1).default(1),
  anyone_injured: z.coerce.boolean().default(false),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().optional().default('Hyderabad Sector'),
  landmark: z.string().optional().nullable(),
  special_needs: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
});

// 10. Submit SOS Request (Zod validation, priority calculation, WAITING status, FQ sequence ID, status log)
app.post('/api/sos', requireAuth, async (req, res) => {
  try {
    const parseResult = sosSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      return res.status(400).json({
        error: 'Validation failed',
        details: issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const {
      type,
      people_count,
      anyone_injured,
      latitude,
      longitude,
      address,
      landmark,
      special_needs,
      photo
    } = parseResult.data;

    // Assess flood risk at coordinates using Turf
    const riskAssessment = assessRisk(latitude, longitude);

    // Calculate priority level (Critical, High, Medium, Low)
    const priority = calculatePriority({
      type,
      anyone_injured,
      zone_risk: riskAssessment.risk_level,
      people_count,
      special_needs
    });

    const sos = await createSOSRequest({
      citizen_id: req.user.id,
      citizen_name: req.profile?.full_name || req.user.email?.split('@')[0] || 'Resident Citizen',
      citizen_phone: req.profile?.phone || '+91 98490 00000',
      citizen_email: req.user.email,
      priority,
      emergency_type: type,
      people_count,
      anyone_injured,
      special_needs,
      latitude,
      longitude,
      address: address || riskAssessment.zone_name,
      landmark: landmark || null,
      photo_data: photo || null,
    });

    return res.status(201).json({
      success: true,
      sos,
      risk_at_location: riskAssessment,
    });
  } catch (err) {
    console.error('[POST /api/sos] Error:', err);
    return res.status(500).json({ error: 'Failed to process SOS dispatch request', details: err.message });
  }
});

// 11. Fetch Authenticated Citizen's SOS Requests
app.get('/api/sos/mine', requireAuth, async (req, res) => {
  try {
    const requests = await getCitizenSOSRequests(req.user.id, req.user.email);
    return res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve your SOS requests', details: err.message });
  }
});

// 12. Fetch Specific SOS Details & Live Timeline
app.get('/api/sos/:id', requireAuth, async (req, res) => {
  try {
    const sos = await getSOSById(req.params.id);
    if (!sos) {
      return res.status(404).json({ error: `SOS record ${req.params.id} not found` });
    }
    return res.json({
      success: true,
      data: sos,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve SOS record', details: err.message });
  }
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`[ResQ Server] Operational on port ${PORT}`);
  console.log(`[ResQ Server] Health: http://localhost:${PORT}/api/health`);
  console.log(`[ResQ Server] User Auth Test: http://localhost:${PORT}/api/me`);
});

export default app;
