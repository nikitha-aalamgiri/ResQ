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
import { calculateRoute } from './services/routing.js';
import {
  createSOSRequest,
  getCitizenSOSRequests,
  getSOSById,
  getAllSOS,
  takeSOS,
  updateSOSStatus,
  createSupportRequest,
  assignSOSByAdmin,
  bulkUpdateSOS,
} from './services/sosStore.js';
import {
  getAllShelters,
  getNearestOpenShelter,
  incrementShelterOccupancy,
} from './services/shelterStore.js';
import {
  createEmergencyAlert,
  getAllAlerts,
  getCitizenNotifications,
  markNotificationAsRead,
} from './services/alertStore.js';

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

// 3. Mock Shelters GeoJSON
app.get('/api/mock/shelters', (req, res) => {
  try {
    const raw = fs.readFileSync(getMockDataPath('shelters.geojson'), 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read shelters mock data', details: err.message });
  }
});

// 3b. Step 7: Live Shelters List with Distance from Point & Status
app.get('/api/shelters', (req, res) => {
  try {
    const { lat, lng, from, status, sort } = req.query;
    let queryLat = lat;
    let queryLng = lng;

    if (from && typeof from === 'string' && from.includes(',')) {
      const parts = from.split(',').map((p) => Number(p.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (parts[0] > 50) {
          queryLat = parts[1];
          queryLng = parts[0];
        } else {
          queryLat = parts[0];
          queryLng = parts[1];
        }
      }
    }

    const shelters = getAllShelters({
      lat: queryLat !== undefined ? queryLat : null,
      lng: queryLng !== undefined ? queryLng : null,
      status: status || null,
    });

    return res.json({
      success: true,
      count: shelters.length,
      data: shelters,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch shelters', details: err.message });
  }
});

// 3c. Step 7: Nearest Open Shelter with Spare Capacity
app.get('/api/shelters/nearest', (req, res) => {
  try {
    const { lat, lng, from, people_count } = req.query;
    let queryLat = lat;
    let queryLng = lng;

    if (from && typeof from === 'string' && from.includes(',')) {
      const parts = from.split(',').map((p) => Number(p.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (parts[0] > 50) {
          queryLat = parts[1];
          queryLng = parts[0];
        } else {
          queryLat = parts[0];
          queryLng = parts[1];
        }
      }
    }

    const nearest = getNearestOpenShelter({
      lat: queryLat !== undefined && queryLat !== null ? Number(queryLat) : null,
      lng: queryLng !== undefined && queryLng !== null ? Number(queryLng) : null,
      minCapacity: Number(people_count) || 1,
    });

    return res.json({
      success: true,
      data: nearest,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to find nearest shelter', details: err.message });
  }
});

// 3d. Step 7: Increment Shelter Occupancy
app.patch('/api/shelters/:id/occupancy', async (req, res) => {
  try {
    const { increment, people_count } = req.body;
    const count = increment !== undefined ? increment : people_count || 1;
    const result = await incrementShelterOccupancy(req.params.id, count);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update shelter occupancy', details: err.message });
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
  });
});

// 6b. Update Profile Language (Requirement 4: Save choice in profiles.language)
app.patch('/api/me/language', requireAuth, async (req, res) => {
  try {
    const { language } = req.body;
    if (language && ['en', 'te', 'hi'].includes(language)) {
      if (req.profile) {
        req.profile.language = language;
      }
      try {
        await supabase.from('profiles').update({ language }).eq('id', req.user.id);
      } catch (err) {
        // Non-blocking fallback
      }
      return res.json({ success: true, language, message: `Profile language updated to ${language}` });
    }
    return res.status(400).json({ error: 'Valid language (en, te, hi) required' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile language' });
  }
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

// 9b. Step 6: Flood-Safe Routing Engine
app.get('/api/route', async (req, res) => {
  const { from, to, mode } = req.query;
  if (!from || !to) {
    return res.status(400).json({
      error: 'Query parameters "from" and "to" are required (e.g. from=17.375,78.483&to=17.362,78.534)',
    });
  }

  try {
    const route = await calculateRoute(from, to, mode || 'safest');
    return res.json(route);
  } catch (err) {
    return res.status(400).json({
      error: 'Failed to calculate route',
      details: err.message,
    });
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

// ============================================================================
// Step 5: Responder Triage & Core Demo Loop Endpoints
// ============================================================================

// 13. Fetch All Incidents for Responders & Admins (Filter by status, priority, search q)
app.get('/api/sos', requireAuth, requireRole('responder', 'admin'), async (req, res) => {
  try {
    const { status, priority, q, lat, lng } = req.query;
    const responderLat = lat || req.profile?.current_lat || 17.3850;
    const responderLng = lng || req.profile?.current_lng || 78.4867;

    const list = await getAllSOS({
      status,
      priority,
      q,
      responderLat,
      responderLng,
    });

    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to query incidents', details: err.message });
  }
});

// 14. Atomic Conditional Claim / Take of Incident (WHERE responder IS NULL AND status = 'WAITING')
app.patch('/api/sos/:id/take', requireAuth, requireRole('responder', 'admin'), async (req, res) => {
  try {
    const result = await takeSOS({
      id: req.params.id,
      responderId: req.user.id,
      responderProfile: req.profile,
      notes: req.body?.notes,
    });

    if (result.conflict) {
      return res.status(409).json(result);
    }

    if (result.error) {
      return res.status(result.status || 400).json(result);
    }

    return res.json({
      success: true,
      message: 'Incident claimed successfully',
      data: result.data,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to claim incident', details: err.message });
  }
});

// 15. Enforce Lifecycle Progression & Status Update (WAITING > ACCEPTED > ON_THE_WAY > ARRIVED > RESCUED > RESOLVED)
app.patch('/api/sos/:id/status', requireAuth, requireRole('responder', 'admin'), async (req, res) => {
  try {
    const { status, note, photo, shelterId, shelter_id } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await updateSOSStatus({
      id: req.params.id,
      nextStatus: status,
      note,
      photo,
      responderId: req.user.id,
      responderProfile: req.profile,
      shelterId: shelterId || shelter_id,
    });

    if (result.error) {
      return res.status(result.status || 400).json(result);
    }

    return res.json({
      success: true,
      message: 'Status updated successfully',
      data: result.data,
      recommended_shelter: result.recommended_shelter || null,
      updated_shelter: result.updated_shelter || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
});

// 15b. Admin Direct Assign Responder
app.patch('/api/sos/:id/assign', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { responderId, responderName, agencyName, notes } = req.body;
    if (!responderId) {
      return res.status(400).json({ error: 'responderId is required' });
    }

    const result = await assignSOSByAdmin({
      id: req.params.id,
      responderId,
      responderName: responderName || 'Assigned Responder',
      agencyName: agencyName || 'Emergency Response Agency',
      notes,
    });

    if (result.error) {
      return res.status(result.status || 400).json(result);
    }

    return res.json({
      success: true,
      message: `Incident successfully assigned to ${responderName || responderId}`,
      data: result.data,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to assign responder', details: err.message });
  }
});

// 15c. Admin Bulk Actions on Incidents
app.post('/api/sos/bulk', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of incident IDs is required' });
    }
    if (!action || !value) {
      return res.status(400).json({ error: 'Action and value are required' });
    }

    const result = await bulkUpdateSOS({
      ids,
      action,
      value,
      responderProfile: req.profile,
      changed_by: req.user.id,
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Bulk action failed', details: err.message });
  }
});

// 16. Log Request for Field Technical / Resource Support
app.post('/api/support-requests', requireAuth, requireRole('responder', 'admin'), async (req, res) => {
  try {
    const { sos_id, support_type, urgency, notes } = req.body;
    if (!sos_id || !support_type) {
      return res.status(400).json({ error: 'sos_id and support_type are required' });
    }

    const record = await createSupportRequest({
      sos_id,
      requested_by: req.user.id,
      support_type,
      urgency: urgency || 'high',
      notes: notes || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Support request logged successfully',
      data: record,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create support request', details: err.message });
  }
});

// 17. Toggle Responder Online/Offline Availability
app.patch('/api/responder/availability', requireAuth, requireRole('responder', 'admin'), async (req, res) => {
  try {
    const { is_available } = req.body;
    if (req.profile) {
      req.profile.is_available = Boolean(is_available);
    }
    return res.json({
      success: true,
      is_available: Boolean(is_available),
      message: `Availability updated to ${is_available ? 'Online' : 'Offline'}`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update availability', details: err.message });
  }
});

// ============================================================================
// Step 8: Multi-Lingual Broadcast Alerts & Citizen Spatial Notifications
// ============================================================================

// 18. Get All Published Alerts (with optional user coordinate spatial check)
app.get('/api/alerts', (req, res) => {
  try {
    const { lat, lng, type, severity } = req.query;
    const list = getAllAlerts({
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      type,
      severity,
    });
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to query alerts', details: err.message });
  }
});

// 19. Publish Emergency Alert (Admin Only: saves alert and creates targeted notifications using Turf.js)
app.post('/api/alerts', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      severity,
      area_geojson,
      area_name,
      languages,
      translations
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Alert title is required' });
    }

    const result = await createEmergencyAlert({
      title,
      description,
      type: type || 'flood_warning',
      severity: severity || 'high',
      area_geojson,
      area_name: area_name || 'Hyderabad Sector',
      languages: languages || ['en'],
      translations: translations || {},
      created_by: req.profile?.full_name || 'SEOC Admin',
    });

    return res.status(201).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to publish emergency alert', details: err.message });
  }
});

// 20. Citizen Notifications Endpoint
app.get('/api/notifications', requireAuth, (req, res) => {
  try {
    const list = getCitizenNotifications(req.user.id);
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

// 21. Mark Notification as Read
app.patch('/api/notifications/:id/read', requireAuth, (req, res) => {
  try {
    const success = markNotificationAsRead(req.params.id);
    return res.json({ success });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`[ResQ Server] Operational on port ${PORT}`);
  console.log(`[ResQ Server] Health: http://localhost:${PORT}/api/health`);
  console.log(`[ResQ Server] User Auth Test: http://localhost:${PORT}/api/me`);
});

export default app;
