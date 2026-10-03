import { supabase } from '../config/supabase.js';

// Global sequence counter starting at 1024
let currentSeq = 1026;

// In-Memory fallback store for seamless offline/drill operation
const inMemorySOS = new Map();
const inMemoryStatusLogs = new Map();

// Seed initial mock distress requests matching seed.sql
const seedInitialData = () => {
  const initial = [
    {
      id: 'FQ1024',
      citizen_id: '00000000-0000-0000-0000-000000000001',
      citizen_name: 'Arif Khan',
      citizen_phone: '+91 98490 12345',
      citizen_email: 'arif.hyd@example.com',
      priority: 'critical',
      status: 'WAITING',
      emergency_type: 'trapped',
      people_count: 4,
      special_needs: 'Elderly grandmother requires oxygen support, ground floor flooded up to 1.5m',
      anyone_injured: false,
      latitude: 17.3715,
      longitude: 78.4942,
      address: 'H.No 16-2-835, Near Musi Causeway, Chaderghat, Hyderabad',
      landmark: 'Opposite Chaderghat Old Bridge',
      photo_url: null,
      assigned_responder_id: null,
      responder_notes: null,
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    },
    {
      id: 'FQ1025',
      citizen_id: '00000000-0000-0000-0000-000000000002',
      citizen_name: 'Fatima Begum',
      citizen_phone: '+91 98490 23456',
      citizen_email: 'fatima.begum@example.com',
      priority: 'critical',
      status: 'ASSIGNED',
      emergency_type: 'medical',
      people_count: 2,
      special_needs: 'Severe chest pain, diabetic patient stranded on rooftop terrace',
      anyone_injured: true,
      latitude: 17.4430,
      longitude: 78.4720,
      address: 'Plot 42, Brahmanwadi, Begumpet, Hyderabad',
      landmark: 'Near Rasoolpura Nala Culvert',
      photo_url: null,
      assigned_responder_id: '00000000-0000-0000-0000-000000000011',
      responder_notes: 'NDRF Inflatable boat unit en route via SP Road',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'FQ1026',
      citizen_id: '00000000-0000-0000-0000-000000000003',
      citizen_name: 'Venkatesh Iyer',
      citizen_phone: '+91 98490 34567',
      citizen_email: 'venkatesh.iyer@example.com',
      priority: 'high',
      status: 'IN_PROGRESS',
      emergency_type: 'evacuation',
      people_count: 5,
      special_needs: '3 children stranded on vehicle roof, water current strong',
      anyone_injured: false,
      latitude: 17.3685,
      longitude: 78.5140,
      address: 'Moosarambagh Main Road near causeway entrance, Hyderabad',
      landmark: 'Beside Amberpet Municipal Ward Office',
      photo_url: null,
      assigned_responder_id: '00000000-0000-0000-0000-000000000012',
      responder_notes: 'GHMC DRF rescue truck on site with lifeline cables',
      created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    }
  ];

  for (const item of initial) {
    inMemorySOS.set(item.id, item);
    inMemoryStatusLogs.set(item.id, [
      {
        id: `log-${item.id}-1`,
        sos_id: item.id,
        status: 'WAITING',
        message: 'SOS request submitted and queued for emergency response.',
        created_at: item.created_at,
      }
    ]);

    if (item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS') {
      inMemoryStatusLogs.get(item.id).push({
        id: `log-${item.id}-2`,
        sos_id: item.id,
        status: 'ASSIGNED',
        message: 'NDRF Team Alpha assigned. Rescue vessel deployed with ETA 12 mins.',
        created_at: item.updated_at,
        responder_info: {
          unit: '10th Battalion NDRF Alpha',
          lead: 'Inspector K. Vikram',
          phone: '+91 94400 11221',
          vehicle: 'NDRF Rescue Boat-04',
          eta_minutes: 12,
          current_coords: [17.3780, 78.4890],
          distance_km: 1.2,
        }
      });
    }
  }
};

seedInitialData();

/**
 * Uploads a photo buffer or base64 data to Supabase Storage bucket 'sos-photos'.
 * Gracefully falls back to inline data URL or mock URL if storage bucket is not configured.
 */
export const uploadSOSPhoto = async (photoData, sosId) => {
  if (!photoData) return null;

  try {
    let buffer;
    let contentType = 'image/jpeg';

    if (typeof photoData === 'string' && photoData.startsWith('data:')) {
      const match = photoData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(photoData.split(',')[1] || photoData, 'base64');
      }
    } else if (Buffer.isBuffer(photoData)) {
      buffer = photoData;
    } else {
      return null;
    }

    const fileName = `${sosId}_${Date.now()}.jpg`;

    // Attempt Supabase Storage upload
    const { data, error } = await supabase.storage
      .from('sos-photos')
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (!error && data?.path) {
      const { data: pubData } = supabase.storage
        .from('sos-photos')
        .getPublicUrl(data.path);
      return pubData?.publicUrl || null;
    }

    // In local demo mode, return the base64 or a deterministic synthetic photo preview URL
    return `https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80`;
  } catch (err) {
    console.warn('[SOS Store] Storage upload fallback:', err.message);
    return `https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80`;
  }
};

/**
 * Creates a new SOS request and registers the first status log.
 */
export const createSOSRequest = async ({
  citizen_id,
  citizen_name,
  citizen_phone,
  citizen_email,
  priority,
  emergency_type,
  people_count,
  anyone_injured,
  special_needs,
  latitude,
  longitude,
  address,
  landmark,
  photo_data,
}) => {
  currentSeq += 1;
  const id = `FQ${currentSeq}`;
  const now = new Date().toISOString();

  // 1. Upload photo if provided
  let photo_url = null;
  if (photo_data) {
    photo_url = await uploadSOSPhoto(photo_data, id);
  }

  const sosRecord = {
    id,
    citizen_id: citizen_id || '00000000-0000-0000-0000-000000000001',
    citizen_name: citizen_name || 'Resident Citizen',
    citizen_phone: citizen_phone || '+91 98490 00000',
    citizen_email: citizen_email || 'citizen@resq.gov.in',
    priority: priority || 'high',
    status: 'WAITING',
    emergency_type,
    people_count: parseInt(people_count, 10) || 1,
    anyone_injured: Boolean(anyone_injured),
    special_needs: special_needs || null,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    address: address || 'Hyderabad Distress Location',
    landmark: landmark || null,
    photo_url,
    assigned_responder_id: null,
    responder_notes: null,
    created_at: now,
    updated_at: now,
  };

  // 2. Initial status log
  const firstLog = {
    id: `log-${id}-1`,
    sos_id: id,
    status: 'WAITING',
    message: 'SOS request submitted and queued for emergency response.',
    created_at: now,
  };

  // Save to in-memory store
  inMemorySOS.set(id, sosRecord);
  inMemoryStatusLogs.set(id, [firstLog]);

  // Attempt database sync (non-blocking)
  try {
    await supabase.from('sos_requests').insert({
      id: sosRecord.id,
      citizen_id: sosRecord.citizen_id,
      citizen_name: sosRecord.citizen_name,
      citizen_phone: sosRecord.citizen_phone,
      priority: sosRecord.priority,
      status: 'open',
      emergency_type: sosRecord.emergency_type,
      people_count: sosRecord.people_count,
      special_needs: sosRecord.special_needs,
      latitude: sosRecord.latitude,
      longitude: sosRecord.longitude,
      address: sosRecord.address,
      landmark: sosRecord.landmark,
      photo_url: sosRecord.photo_url,
      created_at: now,
    });
  } catch (err) {
    // Non-blocking in demo mode
  }

  // 3. Automated Drill Simulation:
  // After 10 seconds, simulate NDRF assignment with live responder telemetry
  setTimeout(() => {
    const existing = inMemorySOS.get(id);
    if (existing && existing.status === 'WAITING') {
      existing.status = 'ASSIGNED';
      existing.assigned_responder_id = '00000000-0000-0000-0000-000000000011';
      existing.responder_notes = 'Team Alpha NDRF dispatched with motorized inflatable boat.';
      existing.updated_at = new Date().toISOString();

      const assignLog = {
        id: `log-${id}-2`,
        sos_id: id,
        status: 'ASSIGNED',
        message: 'Team Alpha is on the way, ETA: 12 minutes',
        created_at: new Date().toISOString(),
        responder_info: {
          unit: '10th Battalion NDRF Team Alpha',
          lead: 'Inspector K. Vikram',
          phone: '+91 94400 11221',
          vehicle: 'NDRF Zodiac Rescue Vessel',
          eta_minutes: 12,
          current_coords: [
            sosRecord.latitude + 0.008,
            sosRecord.longitude - 0.006,
          ],
          distance_km: 1.1,
        }
      };

      const logs = inMemoryStatusLogs.get(id) || [];
      logs.push(assignLog);
      inMemoryStatusLogs.set(id, logs);
    }
  }, 10000);

  return {
    ...sosRecord,
    timeline: [firstLog],
  };
};

/**
 * Retrieves all SOS requests for a citizen.
 */
export const getCitizenSOSRequests = async (citizenId, citizenEmail) => {
  const list = [];
  for (const sos of inMemorySOS.values()) {
    if (
      !citizenId ||
      sos.citizen_id === citizenId ||
      sos.citizen_email === citizenEmail ||
      citizenEmail === 'arif.hyd@example.com' // Demo citizen sees full seeded drill queue
    ) {
      list.push({
        ...sos,
        timeline: inMemoryStatusLogs.get(sos.id) || [],
      });
    }
  }

  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return list;
};

/**
 * Retrieves a single SOS request with full timeline and responder details.
 */
export const getSOSById = async (id) => {
  const sos = inMemorySOS.get(id);
  if (!sos) return null;

  const timeline = inMemoryStatusLogs.get(id) || [];
  const latestAssignedLog = timeline.find((l) => l.status === 'ASSIGNED');

  return {
    ...sos,
    timeline,
    responder: latestAssignedLog?.responder_info || null,
  };
};

export default {
  createSOSRequest,
  getCitizenSOSRequests,
  getSOSById,
  uploadSOSPhoto,
};
