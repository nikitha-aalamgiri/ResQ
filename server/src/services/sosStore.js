import { supabase } from '../config/supabase.js';
import { getNearestOpenShelter, incrementShelterOccupancy } from './shelterStore.js';

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
  const latestAssignedLog = timeline.slice().reverse().find((l) => l.responder_info);

  return {
    ...sos,
    timeline,
    responder: latestAssignedLog?.responder_info || null,
  };
};

/**
 * Retrieves all SOS requests with optional filtering and distance calculation for responders.
 */
export const getAllSOS = async ({
  status,
  priority,
  q,
  responderLat = 17.3850,
  responderLng = 78.4867,
} = {}) => {
  let list = Array.from(inMemorySOS.values());

  // 1. Status Filter
  if (status && status !== 'all') {
    const normFilterStatus = String(status).toUpperCase();
    list = list.filter((item) => {
      const itemStatus = String(item.status).toUpperCase();
      if (normFilterStatus === 'RESOLVED') {
        return itemStatus === 'RESOLVED' || itemStatus === 'CLOSED';
      }
      if (normFilterStatus === 'OPEN' || normFilterStatus === 'WAITING') {
        return itemStatus === 'OPEN' || itemStatus === 'WAITING';
      }
      return itemStatus === normFilterStatus;
    });
  }

  // 2. Priority Filter
  if (priority && priority !== 'all') {
    const normFilterPriority = String(priority).toLowerCase();
    list = list.filter((item) => String(item.priority).toLowerCase() === normFilterPriority);
  }

  // 3. Search Query Filter (ID, type, citizen name, address, landmark)
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    list = list.filter(
      (item) =>
        item.id.toLowerCase().includes(query) ||
        (item.emergency_type && item.emergency_type.toLowerCase().includes(query)) ||
        (item.citizen_name && item.citizen_name.toLowerCase().includes(query)) ||
        (item.address && item.address.toLowerCase().includes(query)) ||
        (item.landmark && item.landmark.toLowerCase().includes(query))
    );
  }

  // 4. Calculate approximate distance in KM from responder coordinates
  const rLat = parseFloat(responderLat);
  const rLng = parseFloat(responderLng);

  const enriched = list.map((item) => {
    let distance_km = 1.2;
    if (!isNaN(rLat) && !isNaN(rLng) && item.latitude && item.longitude) {
      const dLat = (item.latitude - rLat) * Math.PI / 180;
      const dLng = (item.longitude - rLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rLat * Math.PI / 180) * Math.cos(item.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance_km = parseFloat((6371 * c).toFixed(1));
    }

    return {
      ...item,
      distance_km,
      timeline: inMemoryStatusLogs.get(item.id) || [],
    };
  });

  // Sort by priority (critical > high > medium > low), then by created_at desc
  const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  enriched.sort((a, b) => {
    const rankDiff = (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return enriched;
};

/**
 * Atomic Conditional Take of an SOS Incident
 * WHERE assigned_responder_id IS NULL AND status in ('WAITING', 'open')
 * Returns 409 Conflict if already taken.
 */
export const takeSOS = async ({ id, responderId, responderProfile, notes }) => {
  const existing = inMemorySOS.get(id);
  if (!existing) {
    return { error: 'Not Found', message: `Incident ${id} not found`, status: 404 };
  }

  const currentStatus = String(existing.status).toUpperCase();
  const isWaiting = currentStatus === 'WAITING' || currentStatus === 'OPEN';
  const isUnassigned = !existing.assigned_responder_id || existing.assigned_responder_id === responderId;

  // Conflict Condition: Already taken or moved past WAITING
  if (!isWaiting || (!isUnassigned && existing.assigned_responder_id !== responderId)) {
    return {
      conflict: true,
      status: 409,
      error: 'Conflict',
      message: 'This incident has already been assigned to another responder unit.',
      assigned_to: existing.assigned_responder_id,
      current_status: existing.status,
    };
  }

  // Atomic Update
  const now = new Date().toISOString();
  existing.assigned_responder_id = responderId;
  existing.status = 'ACCEPTED';
  existing.responder_notes = notes || `Accepted by ${responderProfile?.full_name || 'Responder Unit'}`;
  existing.updated_at = now;

  // Log in sos_status_log with changed_by
  const logEntry = {
    id: `log-${id}-${Date.now()}`,
    sos_id: id,
    status: 'ACCEPTED',
    message: `Incident claimed by ${responderProfile?.full_name || 'Responder'} (${responderProfile?.agency_name || 'Rescue Unit'})`,
    changed_by: responderId,
    created_at: now,
    responder_info: {
      unit: responderProfile?.agency_name || '10th Battalion NDRF Alpha',
      lead: responderProfile?.full_name || 'Inspector K. Vikram',
      phone: responderProfile?.phone || '+91 94400 11221',
      vehicle: 'NDRF Zodiac Inflatable Boat-04',
      eta_minutes: 12,
      current_coords: [existing.latitude + 0.007, existing.longitude - 0.005],
      distance_km: 1.2,
    }
  };

  const logs = inMemoryStatusLogs.get(id) || [];
  logs.push(logEntry);
  inMemoryStatusLogs.set(id, logs);

  // Sync to Supabase in background
  try {
    await supabase.from('sos_requests').update({
      assigned_responder_id: responderId,
      status: 'assigned',
      responder_notes: existing.responder_notes,
      updated_at: now,
    }).eq('id', id);

    await supabase.from('sos_status_log').insert({
      sos_id: id,
      status: 'ACCEPTED',
      message: logEntry.message,
      responder_info: logEntry.responder_info,
    });
  } catch (err) {
    // Non-blocking in demo mode
  }

  return {
    success: true,
    data: {
      ...existing,
      timeline: logs,
      responder: logEntry.responder_info,
    }
  };
};

/**
 * Enforce strict lifecycle progression:
 * WAITING -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> RESCUED -> RESOLVED
 * Accepts side outcomes (need_support, could_not_locate, converted_to_shelter) without breaking the chain.
 */
export const updateSOSStatus = async ({
  id,
  nextStatus,
  note = '',
  photo = null,
  shelterId = null,
  responderId,
  responderProfile,
}) => {
  const existing = inMemorySOS.get(id);
  if (!existing) {
    return { error: 'Not Found', message: `Incident ${id} not found`, status: 404 };
  }

  const currentStatus = String(existing.status).toUpperCase();
  const normalizedNext = String(nextStatus).toUpperCase().replace(/[\s-]/g, '_');

  const MAIN_CHAIN = ['WAITING', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'RESCUED', 'RESOLVED'];
  const SIDE_OUTCOMES = ['NEED_SUPPORT', 'COULD_NOT_LOCATE', 'CONVERTED_TO_SHELTER'];

  // Check if side outcome
  const isSideOutcome = SIDE_OUTCOMES.includes(normalizedNext);

  if (!isSideOutcome) {
    // Validate main chain transition order
    const currentIndex = MAIN_CHAIN.indexOf(currentStatus);
    const nextIndex = MAIN_CHAIN.indexOf(normalizedNext);

    if (nextIndex === -1) {
      return {
        error: 'Invalid Status',
        message: `Unknown status '${nextStatus}'. Valid statuses are: ${MAIN_CHAIN.join(', ')}`,
        status: 400,
      };
    }

    // Must be sequential transition (or same status update)
    if (nextIndex < currentIndex) {
      return {
        error: 'Invalid Transition',
        message: `Cannot regress status backwards from ${currentStatus} to ${normalizedNext}.`,
        status: 400,
      };
    }

    if (nextIndex > currentIndex + 1 && !(currentStatus === 'WAITING' && normalizedNext === 'ACCEPTED')) {
      return {
        error: 'Invalid Transition',
        message: `Cannot skip steps from ${currentStatus} directly to ${normalizedNext}. Next valid status is ${MAIN_CHAIN[currentIndex + 1]}.`,
        status: 400,
      };
    }
  }

  const now = new Date().toISOString();

  // Handle photo upload if attached
  let photoUrl = null;
  if (photo) {
    photoUrl = await uploadSOSPhoto(photo, `${id}_update_${Date.now()}`);
  }

  // Status message defaults
  const statusMessages = {
    ACCEPTED: 'Incident accepted by responder unit.',
    ON_THE_WAY: 'Team Alpha is on the way, ETA: 12 minutes',
    ARRIVED: 'Rescue team arrived on site. Commencing victim extraction.',
    RESCUED: 'Civilians safely extracted from water and secured on vessel.',
    RESOLVED: 'Incident resolved. Civilians transferred to relief camp.',
    NEED_SUPPORT: 'Field unit requested additional technical/boat support.',
    COULD_NOT_LOCATE: 'Could not locate victims at initial coordinates; expanding search perimeter.',
    CONVERTED_TO_SHELTER: 'Residence stabilized and provisioned as in-situ shelter.',
  };

  const finalMessage = note && note.trim()
    ? note.trim()
    : statusMessages[normalizedNext] || `Status updated to ${normalizedNext}`;

  // Step 7: When an incident moves to RESCUED, calculate and attach recommended shelter
  if (normalizedNext === 'RESCUED') {
    const recommendedShelter = getNearestOpenShelter({
      lat: existing.latitude,
      lng: existing.longitude,
      minCapacity: existing.people_count,
    });
    existing.recommended_shelter = recommendedShelter;
    existing.recommended_shelter_id = recommendedShelter?.id;
  }

  // Step 7: On confirm (RESOLVED or CONVERTED_TO_SHELTER), increment shelter occupancy in one transaction
  let updatedShelter = null;
  if (normalizedNext === 'RESOLVED' || normalizedNext === 'CONVERTED_TO_SHELTER') {
    const targetShelterId = shelterId || existing.recommended_shelter_id || existing.recommended_shelter?.id || 'sh-hyd-03';
    if (targetShelterId) {
      const incResult = await incrementShelterOccupancy(targetShelterId, existing.people_count);
      if (incResult.success) {
        updatedShelter = incResult.shelter;
        existing.shelter_id = targetShelterId;
        existing.shelter_name = incResult.shelter.name;
      }
    }
  }

  // Log in sos_status_log with changed_by
  const logEntry = {
    id: `log-${id}-${Date.now()}`,
    sos_id: id,
    status: normalizedNext,
    message: finalMessage,
    changed_by: responderId || null,
    photo_url: photoUrl,
    created_at: now,
    responder_info: {
      unit: responderProfile?.agency_name || '10th Battalion NDRF Alpha',
      lead: responderProfile?.full_name || 'Inspector K. Vikram',
      phone: responderProfile?.phone || '+91 94400 11221',
      vehicle: 'NDRF Zodiac Inflatable Boat-04',
      eta_minutes: normalizedNext === 'ON_THE_WAY' ? 12 : normalizedNext === 'ARRIVED' ? 0 : null,
      current_coords: [existing.latitude + 0.003, existing.longitude - 0.002],
    }
  };

  const logs = inMemoryStatusLogs.get(id) || [];
  logs.push(logEntry);
  inMemoryStatusLogs.set(id, logs);

  // If not a side outcome, update main record status
  if (!isSideOutcome) {
    existing.status = normalizedNext;
    if (normalizedNext === 'RESOLVED') {
      existing.resolved_at = now;
    }
  }

  if (photoUrl) {
    existing.photo_url = photoUrl;
  }
  existing.updated_at = now;

  // Sync to Supabase in background
  try {
    await supabase.from('sos_requests').update({
      status: existing.status.toLowerCase(),
      updated_at: now,
      ...(existing.resolved_at ? { resolved_at: existing.resolved_at } : {})
    }).eq('id', id);

    await supabase.from('sos_status_log').insert({
      sos_id: id,
      status: normalizedNext,
      message: finalMessage,
      responder_info: logEntry.responder_info,
    });
  } catch (err) {
    // Non-blocking in demo mode
  }

  return {
    success: true,
    data: {
      ...existing,
      timeline: logs,
      latest_log: logEntry,
      recommended_shelter: existing.recommended_shelter,
      updated_shelter: updatedShelter,
    },
    recommended_shelter: existing.recommended_shelter,
    updated_shelter: updatedShelter,
  };
};

/**
 * Admin: Manually assign a responder to an incident
 */
export const assignSOSByAdmin = async ({ id, responderId, responderName, agencyName, notes = '' }) => {
  const existing = inMemorySOS.get(id);
  if (!existing) {
    return { error: 'Not Found', message: `Incident ${id} not found`, status: 404 };
  }

  const now = new Date().toISOString();
  existing.assigned_responder_id = responderId;
  existing.status = 'ASSIGNED';
  existing.responder_notes = notes || `Manually assigned by SEOC Admin to ${responderName} (${agencyName})`;
  existing.updated_at = now;

  const logEntry = {
    id: `log-${id}-${Date.now()}`,
    sos_id: id,
    status: 'ASSIGNED',
    message: `Admin assigned incident to ${responderName} (${agencyName})`,
    changed_by: 'admin',
    created_at: now,
    responder_info: {
      unit: agencyName || 'Emergency Response Team',
      lead: responderName || 'Duty Responder',
      phone: '+91 94400 11221',
      vehicle: 'Rapid Action Patrol',
      eta_minutes: 15,
      current_coords: [existing.latitude + 0.005, existing.longitude - 0.004],
    },
  };

  const logs = inMemoryStatusLogs.get(id) || [];
  logs.push(logEntry);
  inMemoryStatusLogs.set(id, logs);

  return {
    success: true,
    data: {
      ...existing,
      timeline: logs,
    },
  };
};

/**
 * Admin: Bulk action on multiple incidents (assign, priority, status)
 */
export const bulkUpdateSOS = async ({ ids = [], action, value, responderProfile, changed_by }) => {
  const results = [];
  for (const id of ids) {
    const existing = inMemorySOS.get(id);
    if (!existing) continue;

    if (action === 'priority') {
      existing.priority = value.toLowerCase();
      existing.updated_at = new Date().toISOString();
      results.push(existing);
    } else if (action === 'assign') {
      const respId = typeof value === 'object' ? value.id : value;
      const respName = typeof value === 'object' ? (value.name || value.full_name) : (responderProfile?.full_name || 'Assigned Responder');
      const agency = typeof value === 'object' ? (value.agency || value.agency_name) : (responderProfile?.agency_name || 'Disaster Response Agency');
      const res = await assignSOSByAdmin({
        id,
        responderId: respId,
        responderName: respName,
        agencyName: agency,
      });
      if (res.success) results.push(res.data);
    } else if (action === 'status') {
      existing.status = value.toUpperCase();
      existing.updated_at = new Date().toISOString();
      results.push(existing);
    }
  }

  return {
    success: true,
    updated_count: results.length,
    incidents: results,
  };
};

// In-Memory store for support requests (Step 5 & 9)
const inMemorySupportRequests = [];

export const createSupportRequest = async ({
  sos_id,
  requested_by,
  support_type,
  urgency = 'high',
  notes = '',
}) => {
  const record = {
    id: `sup-${Date.now()}`,
    sos_id,
    requested_by,
    support_type,
    urgency,
    notes,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  inMemorySupportRequests.push(record);

  // Also log into sos_status_log
  const logEntry = {
    id: `log-${sos_id}-${Date.now()}`,
    sos_id,
    status: 'need_support',
    message: `Support requested: ${support_type} (${urgency} urgency). Notes: ${notes || 'Immediate assistance required'}`,
    changed_by: requested_by,
    created_at: record.created_at,
  };

  const logs = inMemoryStatusLogs.get(sos_id) || [];
  logs.push(logEntry);
  inMemoryStatusLogs.set(sos_id, logs);

  return record;
};

export default {
  createSOSRequest,
  getCitizenSOSRequests,
  getSOSById,
  getAllSOS,
  takeSOS,
  updateSOSStatus,
  assignSOSByAdmin,
  bulkUpdateSOS,
  createSupportRequest,
  uploadSOSPhoto,
};

