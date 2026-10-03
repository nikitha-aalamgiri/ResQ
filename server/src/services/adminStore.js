import { addVerifiedBlockedRoad } from './routing.js';

// ============================================================================
// 1. In-Memory Responders Store (Requirement 5)
// ============================================================================
const initialResponders = [
  {
    id: 'resp-01',
    name: 'Inspector K. Vikram',
    badge_id: 'NDRF-HYD-401',
    category: 'rescue',
    role: 'NDRF Boat Rescue Commander',
    team: '10th Battalion NDRF',
    status: 'active',
    phone: '+91 94400 11221',
    email: 'k.vikram@ndrf.gov.in',
    current_location: 'Moosarambagh Riverbed Sector',
    coords: [17.3780, 78.5020],
    assigned_incidents: ['FQ1024'],
    skills: ['Water Rescue', 'Power Boat Navigation', 'Swiftwater Extraction'],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'resp-02',
    name: 'Capt. Ananya Rao',
    badge_id: 'GHMC-DRF-102',
    category: 'rescue',
    role: 'Heavy Rescue Squad Lead',
    team: 'GHMC Disaster Response Force Alpha',
    status: 'on_mission',
    phone: '+91 94400 22332',
    email: 'ananya.rao@ghmc.gov.in',
    current_location: 'Begumpet Station Underpass Link',
    coords: [17.4420, 78.4720],
    assigned_incidents: ['FQ1026'],
    skills: ['De-Watering', 'Structural Shore-Up', 'High-Clearance Transport'],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'resp-03',
    name: 'Dr. Sunita Reddy',
    badge_id: 'EMRI-108-MD09',
    category: 'medical',
    role: 'Field Emergency Physician',
    team: 'EMRI 108 Rapid Triage Corps',
    status: 'active',
    phone: '+91 94400 33443',
    email: 'sunita.reddy@emri.in',
    current_location: 'LB Stadium Relief Camp Medical Desk',
    coords: [17.3995, 78.4745],
    assigned_incidents: [],
    skills: ['Hypothermia Management', 'Pediatric Triage', 'Trauma Stabilization'],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'resp-04',
    name: 'SI Rajesh Verma',
    badge_id: 'TS-POL-8812',
    category: 'police',
    role: 'Sector Traffic & Evacuation Officer',
    team: 'Telangana SDRF / Hyderabad Police',
    status: 'available',
    phone: '+91 94400 44554',
    email: 'rajesh.verma@tspolice.gov.in',
    current_location: 'Tolichowki - Gachibowli Radial Corridor',
    coords: [17.4020, 78.4110],
    assigned_incidents: [],
    skills: ['Evacuation Logistics', 'Perimeter Security', 'Bypass Routing'],
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'resp-05',
    name: 'Ramesh Goud',
    badge_id: 'VOL-IRCS-044',
    category: 'volunteers',
    role: 'Community Relief Coordinator',
    team: 'Indian Red Cross Society Volunteer Wing',
    status: 'available',
    phone: '+91 94400 55665',
    email: 'ramesh.g@redcross-hyd.org',
    current_location: 'Amberpet Community Relief Hall',
    coords: [17.3910, 78.5180],
    assigned_incidents: [],
    skills: ['Ration Distribution', 'Shelter Intake', 'Elderly Assistance'],
    created_at: new Date(Date.now() - 86400000).toISOString(),
  }
];

let inMemoryResponders = [...initialResponders];

export function getResponders({ category, status, q } = {}) {
  let list = inMemoryResponders;
  if (category && category !== 'all' && category !== 'All') {
    list = list.filter((r) => r.category.toLowerCase() === category.toLowerCase());
  }
  if (status && status !== 'all' && status !== 'All') {
    list = list.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  if (q) {
    const term = q.toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.badge_id.toLowerCase().includes(term) ||
        r.team.toLowerCase().includes(term) ||
        r.current_location.toLowerCase().includes(term)
    );
  }
  return list;
}

export function createResponder(data) {
  const newResp = {
    id: `resp-0${inMemoryResponders.length + 1}`,
    name: data.name || 'Field Responder',
    badge_id: data.badge_id || `RESQ-${Date.now().toString().slice(-4)}`,
    category: data.category || 'rescue',
    role: data.role || 'Disaster Response Specialist',
    team: data.team || 'State Disaster Response Force',
    status: data.status || 'available',
    phone: data.phone || '+91 94400 00000',
    email: data.email || 'responder@resq.gov',
    current_location: data.current_location || 'Central SEOC Depot',
    coords: data.coords || [17.3850, 78.4867],
    assigned_incidents: [],
    skills: data.skills || ['Search & Rescue'],
    created_at: new Date().toISOString(),
  };
  inMemoryResponders.unshift(newResp);
  return newResp;
}

export function updateResponder(id, data) {
  const index = inMemoryResponders.findIndex((r) => r.id === id);
  if (index === -1) return null;
  inMemoryResponders[index] = {
    ...inMemoryResponders[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return inMemoryResponders[index];
}

// ============================================================================
// 2. In-Memory Resources Store (Requirement 6)
// ============================================================================
const initialResources = [
  {
    id: 'res-01',
    name: 'Inflatable Rescue Boats (IRB) with OBM',
    quantity: 8,
    category: 'water_rescue',
    provider: '10th Battalion NDRF',
    location: 'SEOC Tactical Depot, Nampally',
    status: 'available',
    condition: 'Operational - Ready',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-02',
    name: 'High-Clearance 4x4 Disaster Recovery Trucks',
    quantity: 12,
    category: 'transport',
    provider: 'GHMC DRF Fleet Wing',
    location: 'Amberpet Maintenance Yard',
    status: 'available',
    condition: 'Operational - Ready',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-03',
    name: 'Mobile Potable Water Filtration Tankers',
    quantity: 5,
    category: 'potable_water',
    provider: 'HMWS&SB Water Board',
    location: 'Saroornagar Zonal Depot',
    status: 'in_transit',
    condition: 'En Route to Saroornagar Hub',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-04',
    name: 'Heavy-Duty Submersible Dewatering Pumps',
    quantity: 18,
    category: 'equipment',
    provider: 'Irrigation & CAD Dept',
    location: 'Moosarambagh Pumping Station',
    status: 'available',
    condition: 'Operational - Ready',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-05',
    name: 'Emergency Trauma Medical Kits & Cylinders',
    quantity: 250,
    category: 'medical',
    provider: 'Telangana Health Directorate',
    location: 'Gandhi Hospital Central Store',
    status: 'available',
    condition: 'Sterile Packs Inspected',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-06',
    name: 'Standard Dry Ration Family Food Packs',
    quantity: 3200,
    category: 'food',
    provider: 'Civil Supplies & Akshayapatra',
    location: 'LB Stadium Central Relief Camp',
    status: 'available',
    condition: 'Freshly Packed & Sealed',
    updated_at: new Date().toISOString(),
  }
];

let inMemoryResources = [...initialResources];

export function getResources({ status, q } = {}) {
  let list = inMemoryResources;
  if (status && status !== 'all' && status !== 'All') {
    list = list.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  if (q) {
    const term = q.toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.provider.toLowerCase().includes(term) ||
        r.location.toLowerCase().includes(term)
    );
  }
  return list;
}

export function createResource(data) {
  const newRes = {
    id: `res-0${inMemoryResources.length + 1}`,
    name: data.name || 'Emergency Relief Stock',
    quantity: Number(data.quantity) || 10,
    category: data.category || 'equipment',
    provider: data.provider || 'State Disaster Management',
    location: data.location || 'SEOC Central Depot',
    status: data.status || 'available',
    condition: data.condition || 'Operational',
    updated_at: new Date().toISOString(),
  };
  inMemoryResources.unshift(newRes);
  return newRes;
}

export function updateResource(id, data) {
  const index = inMemoryResources.findIndex((r) => r.id === id);
  if (index === -1) return null;
  inMemoryResources[index] = {
    ...inMemoryResources[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return inMemoryResources[index];
}

// ============================================================================
// 3. In-Memory Support Requests Store (Requirements 1 & 6)
// ============================================================================
const initialSupportRequests = [
  {
    id: 'sr-01',
    sos_id: 'FQ1024',
    support_type: 'Rescue Boat',
    priority: 'high',
    requested_by: 'Inspector K. Vikram',
    agency: '10th Battalion NDRF',
    location: 'Moosarambagh Riverbed Causeway',
    notes: 'Severe Musi current with 3.8m water velocity. Need 1 additional Inflatable Rescue Boat with outboard motor for 4 civilians.',
    status: 'pending', // pending, approved, in_transit, completed, denied
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    admin_notes: null,
  },
  {
    id: 'sr-02',
    sos_id: 'FQ1026',
    support_type: 'Medical Team',
    priority: 'high',
    requested_by: 'Capt. Ananya Rao',
    agency: 'GHMC DRF Alpha',
    location: 'Brahmanwadi, Begumpet',
    notes: 'Two stranded infants showing early hypothermia signs. Paramedic triage with pediatric rehydration kits requested urgently.',
    status: 'in_transit',
    created_at: new Date(Date.now() - 65 * 60000).toISOString(),
    admin_notes: 'Dispatched Dr. Sunita Reddy (EMRI 108 Mobile Unit 1). ETA 8 mins.',
  },
  {
    id: 'sr-03',
    sos_id: 'FQ1027',
    support_type: 'Food / Water',
    priority: 'medium',
    requested_by: 'SI Rajesh Verma',
    agency: 'Telangana SDRF',
    location: 'Nadeem Colony, Tolichowki',
    notes: 'Drinking water pipe fractured. Need 50 water pouches and dry biscuit packs for 3 families on first floor terrace.',
    status: 'approved',
    created_at: new Date(Date.now() - 110 * 60000).toISOString(),
    admin_notes: 'Approved from Saroornagar Depot ration stock.',
  },
  {
    id: 'sr-04',
    sos_id: null,
    support_type: 'Transport Vehicle',
    priority: 'medium',
    requested_by: 'Ramesh Goud',
    agency: 'Red Cross Volunteer Wing',
    location: 'Amberpet Community Relief Hall',
    notes: 'Requesting 2 mini-trucks for ferrying 40 elderly evacuees to LB Stadium shelter.',
    status: 'pending',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    admin_notes: null,
  }
];

let inMemorySupportRequests = [...initialSupportRequests];

export function getSupportRequests({ status, priority } = {}) {
  let list = inMemorySupportRequests;
  if (status && status !== 'all' && status !== 'All') {
    list = list.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  if (priority && priority !== 'all' && priority !== 'All') {
    list = list.filter((r) => r.priority.toLowerCase() === priority.toLowerCase());
  }
  return list;
}

export function createSupportRequestRecord(data) {
  const newReq = {
    id: `sr-${Date.now().toString().slice(-4)}`,
    sos_id: data.sos_id || null,
    support_type: data.support_type || 'Equipment',
    priority: (data.priority || data.urgency || 'high').toLowerCase(),
    requested_by: data.requested_by_name || data.requested_by || 'Field Responder',
    agency: data.agency || 'Emergency Response Unit',
    location: data.location || 'Tactical Field Sector',
    notes: data.notes || '',
    status: 'pending',
    created_at: new Date().toISOString(),
    admin_notes: null,
  };
  inMemorySupportRequests.unshift(newReq);
  return newReq;
}

export function updateSupportRequestStatus(id, newStatus, adminNotes) {
  const index = inMemorySupportRequests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  inMemorySupportRequests[index] = {
    ...inMemorySupportRequests[index],
    status: newStatus.toLowerCase(),
    admin_notes: adminNotes || inMemorySupportRequests[index].admin_notes,
    updated_at: new Date().toISOString(),
  };
  return inMemorySupportRequests[index];
}

// ============================================================================
// 4. In-Memory User Directory (Requirement 8)
// ============================================================================
const initialUsers = [
  {
    id: 'usr-01',
    name: 'Mohammed Arif',
    role: 'citizen',
    email: 'citizen@resq.gov',
    phone: '+91 98490 33331',
    status: 'active',
    location: 'Moosarambagh Riverbed Colony',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'usr-02',
    name: 'Inspector K. Vikram',
    role: 'responder',
    agency: '10th Battalion NDRF',
    email: 'responder@resq.gov',
    phone: '+91 94400 11221',
    status: 'active',
    location: 'Moosarambagh Sector',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'usr-03',
    name: 'Capt. Ananya Rao',
    role: 'responder',
    agency: 'GHMC DRF Alpha',
    email: 'ananya.rao@ghmc.gov.in',
    phone: '+91 94400 22332',
    status: 'active',
    location: 'Begumpet Station Road',
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: 'usr-04',
    name: 'Pooja Sharma',
    role: 'citizen',
    email: 'pooja.sharma@example.com',
    phone: '+91 98490 33333',
    status: 'active',
    location: 'Brahmanwadi, Begumpet',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'usr-05',
    name: 'Indian Red Cross Society',
    role: 'ngo',
    agency: 'IRCS Relief Hyderabad',
    email: 'relief@redcross-hyd.org',
    phone: '+91 40 2345 6789',
    status: 'active',
    location: 'Amberpet Zonal Hub',
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
  {
    id: 'usr-06',
    name: 'State Disaster Operations Chief',
    role: 'admin',
    agency: 'Telangana Disaster Management Authority',
    email: 'admin@resq.gov',
    phone: '+91 40 2345 0000',
    status: 'active',
    location: 'SEOC State Command Center, Nampally',
    created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
  }
];

let inMemoryUsers = [...initialUsers];

export function getUsers({ role, status, q } = {}) {
  let list = inMemoryUsers;
  if (role && role !== 'all' && role !== 'All') {
    list = list.filter((u) => u.role.toLowerCase() === role.toLowerCase());
  }
  if (status && status !== 'all' && status !== 'All') {
    list = list.filter((u) => u.status.toLowerCase() === status.toLowerCase());
  }
  if (q) {
    const term = q.toLowerCase();
    list = list.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.phone.toLowerCase().includes(term) ||
        (u.agency && u.agency.toLowerCase().includes(term))
    );
  }
  return list;
}

export function updateUserStatus(id, status) {
  const index = inMemoryUsers.findIndex((u) => u.id === id);
  if (index === -1) return null;
  inMemoryUsers[index].status = status;
  inMemoryUsers[index].updated_at = new Date().toISOString();
  return inMemoryUsers[index];
}

// ============================================================================
// 5. In-Memory Hazard Reports Store (Requirement 9)
// ============================================================================
const initialHazardReports = [
  {
    id: 'rep-01',
    title: 'Malakpet Gunj Underpass Impassable',
    road_name: 'Malakpet Gunj Underpass',
    type: 'blocked_road',
    severity: 'high',
    location: 'Malakpet Railway Bridge Underpass',
    lat: 17.3710,
    lng: 78.4980,
    polyline: [
      [17.3695, 78.4960],
      [17.3710, 78.4980],
      [17.3725, 78.5000]
    ],
    reported_by: 'Citizen (Mohammed Arif)',
    description: 'Underpass submerged under 1.6m water. Cars stuck, road completely blocked for all vehicular movement.',
    photo_url: null,
    status: 'pending', // pending, verified, rejected
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
    verified_at: null,
    verified_by: null,
  },
  {
    id: 'rep-02',
    title: 'Chaderghat Dhobi Ghat Embankment Breach',
    road_name: 'Chaderghat Riverbank Service Road',
    type: 'flood_rise',
    severity: 'critical',
    location: 'Chaderghat Dhobi Ghat Inundation Basin',
    lat: 17.3780,
    lng: 78.4870,
    polyline: [
      [17.3770, 78.4850],
      [17.3780, 78.4870],
      [17.3790, 78.4890]
    ],
    reported_by: 'Inspector K. Vikram (NDRF)',
    description: 'Retaining embankment breached by 2ft. Swiftwater gushing towards access lane. Barricade required.',
    photo_url: null,
    status: 'verified',
    created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    verified_at: new Date(Date.now() - 25 * 60000).toISOString(),
    verified_by: 'SEOC Master Command',
  }
];

let inMemoryHazardReports = [...initialHazardReports];

// Seed the initially verified report into dynamic routing
const initialVerified = inMemoryHazardReports.find((h) => h.status === 'verified');
if (initialVerified) {
  addVerifiedBlockedRoad({
    type: 'Feature',
    id: `dyn-br-${initialVerified.id}`,
    geometry: {
      type: 'LineString',
      coordinates: initialVerified.polyline.map(([lat, lng]) => [lng, lat]),
    },
    properties: {
      id: `dyn-br-${initialVerified.id}`,
      road_name: initialVerified.road_name,
      status: 'impassable',
      severity: initialVerified.severity,
      reason: initialVerified.description,
    },
  });
}

export function getHazardReports({ status, type } = {}) {
  let list = inMemoryHazardReports;
  if (status && status !== 'all' && status !== 'All') {
    list = list.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  if (type && type !== 'all' && type !== 'All') {
    list = list.filter((r) => r.type.toLowerCase() === type.toLowerCase());
  }
  return list;
}

export function createHazardReport(data) {
  const newReport = {
    id: `rep-0${inMemoryHazardReports.length + 1}`,
    title: data.title || 'Reported Road Obstruction',
    road_name: data.road_name || data.title || 'Hazardous Roadway',
    type: data.type || 'blocked_road',
    severity: data.severity || 'high',
    location: data.location || 'Reported Coordinates',
    lat: Number(data.lat) || 17.3850,
    lng: Number(data.lng) || 78.4867,
    polyline: data.polyline || [
      [Number(data.lat || 17.3850) - 0.001, Number(data.lng || 78.4867) - 0.001],
      [Number(data.lat || 17.3850), Number(data.lng || 78.4867)],
      [Number(data.lat || 17.3850) + 0.001, Number(data.lng || 78.4867) + 0.001],
    ],
    reported_by: data.reported_by || 'Citizen Reporter',
    description: data.description || 'Waterlogging hazard blocking roadway.',
    photo_url: data.photo_url || null,
    status: 'pending',
    created_at: new Date().toISOString(),
    verified_at: null,
    verified_by: null,
  };
  inMemoryHazardReports.unshift(newReport);
  return newReport;
}

export function verifyHazardReport(id, verifiedBy = 'SEOC Admin') {
  const report = inMemoryHazardReports.find((r) => r.id === id);
  if (!report) return null;

  report.status = 'verified';
  report.verified_at = new Date().toISOString();
  report.verified_by = verifiedBy;

  // Add into routing engine dynamic blocked roads
  const roadFeature = {
    type: 'Feature',
    id: `dyn-br-${report.id}`,
    geometry: {
      type: 'LineString',
      coordinates: report.polyline.map(([lat, lng]) => [lng, lat]),
    },
    properties: {
      id: `dyn-br-${report.id}`,
      road_name: report.road_name,
      status: 'impassable',
      severity: report.severity,
      reason: report.description,
    },
  };

  addVerifiedBlockedRoad(roadFeature);
  return { report, roadFeature };
}

export function rejectHazardReport(id, rejectedBy = 'SEOC Admin') {
  const report = inMemoryHazardReports.find((r) => r.id === id);
  if (!report) return null;

  report.status = 'rejected';
  report.verified_at = new Date().toISOString();
  report.verified_by = rejectedBy;
  return report;
}

// ============================================================================
// 6. In-Memory Messages Store (Requirement 2)
// ============================================================================
const initialMessages = [
  {
    id: 'msg-01',
    sender: 'SEOC Command Control',
    sender_role: 'admin',
    category: 'system_alert', // 'incident_update' | 'team_message' | 'system_alert'
    title: 'Hydrological Warning: Himayat Sagar Gates 5 & 6 Opened',
    text: 'Irrigation board has lifted gates by 2 feet. Musi river expected to rise further by 0.6m in the next 90 minutes. All riverbank teams maintain high vigilance.',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'msg-02',
    sender: 'Inspector K. Vikram',
    sender_role: 'responder',
    category: 'team_message',
    title: 'Moosarambagh Evacuation Underway',
    text: 'Team Alpha has deployed 2 rescue boats. 14 people evacuated to relief vans so far. Flow is strong near Moosarambagh causeway.',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'msg-03',
    sender: 'Capt. Ananya Rao',
    sender_role: 'responder',
    category: 'incident_update',
    title: 'Begumpet Underpass Barricaded',
    text: 'Water level at underpass reached 4.2 feet. Traffic diverted via upper flyover. Caution advisory active.',
    timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
  },
  {
    id: 'msg-04',
    sender: 'Dr. Sunita Reddy',
    sender_role: 'responder',
    category: 'team_message',
    title: 'Medical Triage Post at LB Stadium',
    text: 'Field clinic active with 108 ambulance. Oral rehydration solutions, suture kits, and warm blankets ready for evacuees.',
    timestamp: new Date(Date.now() - 75 * 60000).toISOString(),
  }
];

let inMemoryMessages = [...initialMessages];

export function getMessages({ category } = {}) {
  let list = inMemoryMessages;
  if (category && category !== 'all' && category !== 'All') {
    list = list.filter((m) => m.category.toLowerCase() === category.toLowerCase());
  }
  return list;
}

export function createMessage(data) {
  const newMsg = {
    id: `msg-${Date.now().toString().slice(-4)}`,
    sender: data.sender || 'Field Responder',
    sender_role: data.sender_role || 'responder',
    category: data.category || 'team_message',
    title: data.title || 'Team Communication',
    text: data.text || '',
    timestamp: new Date().toISOString(),
  };
  inMemoryMessages.unshift(newMsg);
  return newMsg;
}

// ============================================================================
// 7. Analytics Data Aggregator (Requirement 7)
// ============================================================================
export function getAnalyticsOverview({ range = '7d' } = {}) {
  // Timeseries buckets for Recharts LineChart
  const timeseries = [
    { time: '06:00', critical: 3, high: 5, medium: 4, low: 2 },
    { time: '09:00', critical: 6, high: 8, medium: 7, low: 4 },
    { time: '12:00', critical: 11, high: 14, medium: 9, low: 6 },
    { time: '15:00', critical: 16, high: 19, medium: 12, low: 8 },
    { time: '18:00', critical: 12, high: 15, medium: 14, low: 11 },
    { time: '21:00', critical: 7, high: 10, medium: 16, low: 15 },
  ];

  // Types distribution for Recharts Donut / PieChart
  const typesDistribution = [
    { name: 'Trapped on Roof/Terrace', value: 18, color: '#B42318' },
    { name: 'Need Evacuation', value: 14, color: '#B54708' },
    { name: 'Medical Help', value: 7, color: '#A16207' },
    { name: 'Food / Water Ration', value: 5, color: '#1F6F78' },
    { name: 'Shelter Placement', value: 3, color: '#3B7A57' },
    { name: 'Missing Person', value: 1, color: '#5B6770' },
  ];

  return {
    kpis: {
      total_incidents: { value: 48, delta: '+14% vs yesterday', is_positive: false },
      people_rescued: { value: 162, delta: '+38 today', is_positive: true },
      shelters_utilized: { value: '4 / 5', delta: '72% capacity', is_positive: true },
      resources_distributed: { value: '2,450', delta: '+650 kits', is_positive: true },
    },
    timeseries,
    types_distribution: typesDistribution,
    active_responders_count: inMemoryResponders.filter((r) => r.status === 'active' || r.status === 'on_mission').length,
    open_shelters_count: 4,
  };
}
