// ResQ Mock Geo Data for Hyderabad Sector [17.3850° N, 78.4867° E]

export const HYDERABAD_CENTER = [17.3850, 78.4867];

export const FLOOD_ZONES = [
  {
    id: 'zone-hyd-01',
    zone_code: 'FZ-HYD-01',
    name: 'Musi River - Chaderghat to Moosarambagh Basin',
    severity: 'critical',
    severity_label: 'High Risk (Flooded)',
    color: '#B42318',
    water_level: '4.20m',
    threshold: '2.80m',
    status: 'Mandatory Evacuation Enacted',
    description: 'Critical overflow of Musi River corridor. Residential settlements along riverbed submerged up to 4m.',
    // Coordinates as [lat, lng] for Leaflet
    polygon: [
      [17.3750, 78.4830],
      [17.3710, 78.5040],
      [17.3680, 78.5180],
      [17.3740, 78.5250],
      [17.3820, 78.5110],
      [17.3850, 78.4890],
      [17.3750, 78.4830]
    ]
  },
  {
    id: 'zone-hyd-02',
    zone_code: 'FZ-HYD-02',
    name: 'Begumpet - Rasoolpura Nala Corridor',
    severity: 'critical',
    severity_label: 'High Risk (Flooded)',
    color: '#B42318',
    water_level: '3.75m',
    threshold: '2.50m',
    status: 'Mandatory Evacuation Enacted',
    description: 'High water discharge breaching embankments. Airport perimeter and Brahmanwadi submerged.',
    polygon: [
      [17.4390, 78.4680],
      [17.4420, 78.4790],
      [17.4490, 78.4880],
      [17.4570, 78.4830],
      [17.4520, 78.4700],
      [17.4450, 78.4630],
      [17.4390, 78.4680]
    ]
  },
  {
    id: 'zone-hyd-03',
    zone_code: 'FZ-HYD-03',
    name: 'Nadeem Colony - Tolichowki Basin',
    severity: 'high',
    severity_label: 'Warning Zone',
    color: '#B54708',
    water_level: '2.90m',
    threshold: '2.40m',
    status: 'Voluntary Relocation Advised',
    description: 'Shah Hatim Talab overflow. Ground floors of residential apartments waterlogged up to 3 feet.',
    polygon: [
      [17.3950, 78.3970],
      [17.3980, 78.4090],
      [17.4060, 78.4150],
      [17.4120, 78.4060],
      [17.4080, 78.3940],
      [17.4010, 78.3910],
      [17.3950, 78.3970]
    ]
  },
  {
    id: 'zone-hyd-04',
    zone_code: 'FZ-HYD-04',
    name: 'Dilsukhnagar - Saroornagar Lake Catchment',
    severity: 'high',
    severity_label: 'Warning Zone',
    color: '#B54708',
    water_level: '2.65m',
    threshold: '2.30m',
    status: 'High Alert & Sandbagging',
    description: 'Weir runoff from Saroornagar Lake spilling over surrounding colonies.',
    polygon: [
      [17.3520, 78.5200],
      [17.3540, 78.5350],
      [17.3630, 78.5410],
      [17.3710, 78.5320],
      [17.3660, 78.5180],
      [17.3590, 78.5140],
      [17.3520, 78.5200]
    ]
  },
  {
    id: 'zone-hyd-05',
    zone_code: 'FZ-HYD-05',
    name: 'Alwal - Old Alwal Lowlands',
    severity: 'medium',
    severity_label: 'Medium Risk',
    color: '#A16207',
    water_level: '1.85m',
    threshold: '2.20m',
    status: 'Active Pumping',
    description: 'Storm drain backflow inundating internal roads and low-lying basements.',
    polygon: [
      [17.4980, 78.4980],
      [17.5020, 78.5130],
      [17.5120, 78.5210],
      [17.5210, 78.5110],
      [17.5170, 78.4950],
      [17.5060, 78.4920],
      [17.4980, 78.4980]
    ]
  },
  {
    id: 'zone-hyd-06',
    zone_code: 'FZ-HYD-06',
    name: 'Hitec City - Durgam Cheruvu Runoff Buffer',
    severity: 'low',
    severity_label: 'Safe Zone',
    color: '#3B7A57',
    water_level: '0.85m',
    threshold: '2.00m',
    status: 'Normal Regulated',
    description: 'Automated sluice gates operating normally. Road networks clear with localized pooling controlled.',
    polygon: [
      [17.4280, 78.3750],
      [17.4310, 78.3890],
      [17.4410, 78.3960],
      [17.4490, 78.3880],
      [17.4450, 78.3740],
      [17.4360, 78.3700],
      [17.4280, 78.3750]
    ]
  }
];

export const SHELTERS = [
  {
    id: 'sh-01',
    name: 'Kotla Vijaya Bhaskara Reddy Stadium',
    location: 'Yousufguda Main Rd, Hyderabad',
    lat: 17.4385,
    lng: 78.4320,
    capacity: 800,
    occupancy: 520,
    status: 'open',
    contact: '+91-9849100001',
    officer: 'M. Srinivas (Camp In-Charge)',
    chips: ['Food Packets', 'Drinking Water', 'Medical Aid', 'Power Backup', 'Sanitation']
  },
  {
    id: 'sh-02',
    name: 'Lal Bahadur Shastri Stadium Camp',
    location: 'Fateh Maidan, Basheerbagh',
    lat: 17.4010,
    lng: 78.4740,
    capacity: 1200,
    occupancy: 890,
    status: 'open',
    contact: '+91-9849100002',
    officer: 'K. V. Ramana (Camp Director)',
    chips: ['Food Packets', 'Clean Water', 'Medical Desk', 'Blankets', 'Power Backup']
  },
  {
    id: 'sh-03',
    name: 'Saroornagar Indoor Stadium Evacuation Hub',
    location: 'Near Priyadarshini Park, Kothapet',
    lat: 17.3620,
    lng: 78.5340,
    capacity: 600,
    occupancy: 410,
    status: 'open',
    contact: '+91-9849100003',
    officer: 'P. Sudhakar (RDO Officer)',
    chips: ['Food', 'Clean Water', 'Medical', 'Blankets']
  },
  {
    id: 'sh-04',
    name: 'Gachibowli Sports Complex Regional Camp',
    location: 'Old Mumbai Hwy, Gachibowli',
    lat: 17.4430,
    lng: 78.3490,
    capacity: 1500,
    occupancy: 340,
    status: 'open',
    contact: '+91-9849100004',
    officer: 'Col. N. Balaji (Emergency Coordinator)',
    chips: ['Full Relief Stock', 'Mobile ICU', 'Generator Backup', 'Child Care']
  },
  {
    id: 'sh-05',
    name: 'Amberpet Community Relief Hall',
    location: 'Near Amberpet Municipal Office',
    lat: 17.3870,
    lng: 78.5170,
    capacity: 400,
    occupancy: 380,
    status: 'near_capacity',
    contact: '+91-9849100005',
    officer: 'Smt. Farzana Begum (Zonal Officer)',
    chips: ['Food Packets', 'Drinking Water', 'Blankets']
  }
];

export const HOSPITALS = [
  {
    id: 'hosp-01',
    name: 'Osmania General Hospital',
    address: 'Afzal Gunj, High Court Rd',
    lat: 17.3735,
    lng: 78.4735,
    emergency_available: true,
    icu_beds: 24,
    general_beds: 140,
    phone: '+91-40-24600121'
  },
  {
    id: 'hosp-02',
    name: 'Gandhi Hospital',
    address: 'Musheerabad, Secunderabad',
    lat: 17.4245,
    lng: 78.5020,
    emergency_available: true,
    icu_beds: 32,
    general_beds: 210,
    phone: '+91-40-27505566'
  },
  {
    id: 'hosp-03',
    name: 'Nizams Institute of Medical Sciences (NIMS)',
    address: 'Punjagutta, Hyderabad',
    lat: 17.4220,
    lng: 78.4525,
    emergency_available: true,
    icu_beds: 18,
    general_beds: 95,
    phone: '+91-40-23489000'
  }
];

export const BLOCKED_ROADS = [
  {
    id: 'br-01',
    name: 'Moosarambagh Cause Way Bridge',
    area: 'Moosarambagh - Amberpet Corridor',
    status: 'impassable',
    severity: 'critical',
    lat: 17.3745,
    lng: 78.5135,
    reason: 'Musi river overtopping causeway by 3.5 ft. Heavy water velocity; barricaded by Traffic Police and NDRF.',
    divert: 'Divert through Chaderghat New Bridge or Malakpet Flyover',
    polyline: [
      [17.3735, 78.5080],
      [17.3752, 78.5135],
      [17.3770, 78.5190]
    ]
  },
  {
    id: 'br-02',
    name: 'Puranapul Old Bridge Approach',
    area: 'Puranapul - Karwan Junction',
    status: 'impassable',
    severity: 'high',
    lat: 17.3645,
    lng: 78.4590,
    reason: 'Structural revetment erosion and water debris blockage.',
    divert: 'Divert through New Puranapul Bridge',
    polyline: [
      [17.3620, 78.4550],
      [17.3650, 78.4590],
      [17.3670, 78.4630]
    ]
  },
  {
    id: 'br-03',
    name: 'Begumpet Airport Underpass',
    area: 'Prakash Nagar - Begumpet Station Link',
    status: 'waterlogged',
    severity: 'high',
    lat: 17.4435,
    lng: 78.4720,
    reason: 'Stormwater nala reverse overflow; 4.5 ft deep water under railway bridge.',
    divert: 'Divert via Begumpet Flyover (upper deck)',
    polyline: [
      [17.4410, 78.4670],
      [17.4435, 78.4720],
      [17.4460, 78.4770]
    ]
  }
];

export const SOS_INCIDENTS = [
  {
    id: 'FQ1024',
    citizen: 'Mohammed Arif',
    phone: '+91-9849033331',
    priority: 'critical',
    status: 'open',
    type: 'Trapped on Terrace / Fast Rising Water',
    location: 'Moosarambagh Riverbed Colony',
    people: 4,
    lat: 17.3725,
    lng: 78.5120,
    special: 'Elderly couple unable to navigate stairs without assistance',
    assigned: 'Unassigned (Priority Queue)'
  },
  {
    id: 'FQ1025',
    citizen: 'Lakshmi Narayana',
    phone: '+91-9849033332',
    priority: 'high',
    status: 'assigned',
    type: 'Medical Distress / Insulin Required',
    location: 'Chaderghat, Al-Madina Heights',
    people: 2,
    lat: 17.3785,
    lng: 78.4910,
    special: 'Diabetic patient needs refrigerated medication and boat evacuation',
    assigned: 'Inspector K. Vikram (NDRF Battalion 10)'
  },
  {
    id: 'FQ1026',
    citizen: 'Pooja Sharma',
    phone: '+91-9849033333',
    priority: 'critical',
    status: 'in_progress',
    type: 'Ground Floor Submerged / Infants Present',
    location: 'Brahmanwadi, Begumpet',
    people: 5,
    lat: 17.4460,
    lng: 78.4750,
    special: 'Two infants (4mo, 18mo), infant formula and drinking water depleted',
    assigned: 'Capt. Ananya Rao (GHMC DRF Alpha)'
  },
  {
    id: 'FQ1027',
    citizen: 'K. Ravinder',
    phone: '+91-9849044444',
    priority: 'medium',
    status: 'open',
    type: 'Food & Potable Water Cutoff',
    location: 'Nadeem Colony, Tolichowki',
    people: 3,
    lat: 17.4030,
    lng: 78.4060,
    special: 'Ground floor waterlogged, drinking water supply contaminated',
    assigned: 'Unassigned'
  }
];

export const RESCUE_TEAMS = [
  {
    id: 'team-01',
    callsign: 'NDRF Boat Unit 3',
    commander: 'Inspector K. Vikram',
    lat: 17.3780,
    lng: 78.5020,
    agency: '10th Battalion NDRF',
    status: 'En route to FQ1025',
    vehicle: 'Inflatable Rescue Boat'
  },
  {
    id: 'team-02',
    callsign: 'GHMC DRF Alpha Truck',
    commander: 'Capt. Ananya Rao',
    lat: 17.4420,
    lng: 78.4720,
    agency: 'GHMC Disaster Response Force',
    status: 'On Site at FQ1026',
    vehicle: 'High-Clearance 4x4 Rescue Truck'
  },
  {
    id: 'team-03',
    callsign: 'SDRF Evacuation Unit 4',
    commander: 'SI Rajesh Verma',
    lat: 17.4020,
    lng: 78.4110,
    agency: 'Telangana SDRF',
    status: 'Patrolling Tolichowki Basin',
    vehicle: 'Amphibious Carrier'
  }
];

// Unified list of searchable locations for the quick fly-to search box
export const SEARCH_LOCATIONS = [
  ...FLOOD_ZONES.map(z => ({ name: z.name, category: 'Flood Zone', lat: z.polygon[0][0], lng: z.polygon[0][1], data: z })),
  ...SHELTERS.map(s => ({ name: s.name, category: 'Shelter', lat: s.lat, lng: s.lng, data: s })),
  ...HOSPITALS.map(h => ({ name: h.name, category: 'Hospital', lat: h.lat, lng: h.lng, data: h })),
  ...BLOCKED_ROADS.map(r => ({ name: r.name, category: 'Blocked Road', lat: r.lat, lng: r.lng, data: r })),
  ...SOS_INCIDENTS.map(s => ({ name: `${s.id}: ${s.location}`, category: 'SOS Distress', lat: s.lat, lng: s.lng, data: s })),
];
