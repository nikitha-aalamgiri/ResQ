-- ==============================================================================
-- ResQ Flood Emergency Response Platform: Realistic Demo Seed Data
-- Hyderabad, Telangana, India Simulation Region
-- ==============================================================================

-- 1. Demo Auth Users & Profiles (1 Admin, 3 Responders, 3 Citizens)
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@resq.gov.in'),
  ('00000000-0000-0000-0000-000000000002', 'vikram.ndrf@resq.gov.in'),
  ('00000000-0000-0000-0000-000000000003', 'ananya.ghmc@resq.gov.in'),
  ('00000000-0000-0000-0000-000000000004', 'rajesh.sdrf@resq.gov.in'),
  ('00000000-0000-0000-0000-000000000005', 'arif.hyd@example.com'),
  ('00000000-0000-0000-0000-000000000006', 'lakshmi.n@example.com'),
  ('00000000-0000-0000-0000-000000000007', 'pooja.s@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, full_name, phone, email, agency_name, is_available, current_lat, current_lng) VALUES
  -- 1 Admin
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Suresh Reddy', '+91-9849011111', 'admin@resq.gov.in', 'Telangana State Disaster Management Authority (TSDMA)', true, 17.3850, 78.4867),
  
  -- 3 Responders
  ('00000000-0000-0000-0000-000000000002', 'responder', 'Inspector K. Vikram', '+91-9849022221', 'vikram.ndrf@resq.gov.in', '10th Battalion NDRF (Inflatable Boat Rescue)', true, 17.3780, 78.5020),
  ('00000000-0000-0000-0000-000000000003', 'responder', 'Capt. Ananya Rao', '+91-9849022222', 'ananya.ghmc@resq.gov.in', 'GHMC Disaster Response Force (DRF Team Alpha)', true, 17.4420, 78.4720),
  ('00000000-0000-0000-0000-000000000004', 'responder', 'Sub-Inspector Rajesh Verma', '+91-9849022223', 'rajesh.sdrf@resq.gov.in', 'Telangana SDRF Heavy Evacuation Unit', true, 17.4020, 78.4110),
  
  -- 3 Citizens
  ('00000000-0000-0000-0000-000000000005', 'citizen', 'Mohammed Arif', '+91-9849033331', 'arif.hyd@example.com', NULL, true, 17.3725, 78.5120),
  ('00000000-0000-0000-0000-000000000006', 'citizen', 'Lakshmi Narayana', '+91-9849033332', 'lakshmi.n@example.com', NULL, true, 17.3785, 78.4910),
  ('00000000-0000-0000-0000-000000000007', 'citizen', 'Pooja Sharma', '+91-9849033333', 'pooja.s@example.com', NULL, true, 17.4460, 78.4750)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  agency_name = EXCLUDED.agency_name;

-- 2. 6 Flood Zones (Red/Orange/Yellow/Green)
INSERT INTO flood_zones (id, zone_code, name, severity, water_level_meters, danger_threshold_meters, evacuation_status, description, boundary_geojson) VALUES
  ('11111111-1111-1111-1111-111111110001', 'FZ-HYD-01', 'Musi River - Chaderghat to Moosarambagh Basin', 'critical', 4.20, 2.80, 'Mandatory Evacuation Enacted', 'Critical overflow of Musi River corridor. Residential settlements along riverbed submerged up to 4 meters. Immediate NDRF boat dispatch active.',
   '{"type": "Polygon", "coordinates": [[[78.4830, 17.3750], [78.5040, 17.3710], [78.5180, 17.3680], [78.5250, 17.3740], [78.5110, 17.3820], [78.4890, 17.3850], [78.4830, 17.3750]]]}'::jsonb),

  ('11111111-1111-1111-1111-111111110002', 'FZ-HYD-02', 'Begumpet - Rasoolpura Nala Corridor', 'critical', 3.75, 2.50, 'Mandatory Evacuation Enacted', 'High water discharge through stormwater nala channel breaching arterial embankments. Airport perimeter and Brahmanwadi submerged.',
   '{"type": "Polygon", "coordinates": [[[78.4680, 17.4390], [78.4790, 17.4420], [78.4880, 17.4490], [78.4830, 17.4570], [78.4700, 17.4520], [78.4630, 17.4450], [78.4680, 17.4390]]]}'::jsonb),

  ('11111111-1111-1111-1111-111111110003', 'FZ-HYD-03', 'Nadeem Colony - Tolichowki Basin', 'high', 2.90, 2.40, 'Voluntary Relocation Advised', 'Severe localized basin waterlogging due to Shah Hatim Talab overflow. Ground floors of residential apartments waterlogged up to 3 feet.',
   '{"type": "Polygon", "coordinates": [[[78.3970, 17.3950], [78.4090, 17.3980], [78.4150, 17.4060], [78.4060, 17.4120], [78.3940, 17.4080], [78.3910, 17.4010], [78.3970, 17.3950]]]}'::jsonb),

  ('11111111-1111-1111-1111-111111110004', 'FZ-HYD-04', 'Dilsukhnagar - Saroornagar Lake Catchment', 'high', 2.65, 2.30, 'High Alert & Sandbagging', 'Excess weir runoff from Saroornagar Lake spilling over surrounding colonies and arterial low-lying access links.',
   '{"type": "Polygon", "coordinates": [[[78.5200, 17.3520], [78.5350, 17.3540], [78.5410, 17.3630], [78.5320, 17.3710], [78.5180, 17.3660], [78.5140, 17.3590], [78.5200, 17.3520]]]}'::jsonb),

  ('11111111-1111-1111-1111-111111110005', 'FZ-HYD-05', 'Alwal - Old Alwal Lowlands', 'medium', 1.85, 2.20, 'Active Monitoring & Drainage Pumping', 'Storm drain backflow inundating internal roads and low-lying basements. Heavy de-watering pumps deployed by municipal teams.',
   '{"type": "Polygon", "coordinates": [[[78.4980, 17.4980], [78.5130, 17.5020], [78.5210, 17.5120], [78.5110, 17.5210], [78.4950, 17.5170], [78.4920, 17.5060], [78.4980, 17.4980]]]}'::jsonb),

  ('11111111-1111-1111-1111-111111110006', 'FZ-HYD-06', 'Hitec City - Durgam Cheruvu Runoff Buffer', 'low', 0.85, 2.00, 'Normal Regulated Drainage', 'Retention channels and lake automated sluice gates operating normally. Road networks clear with localized pooling under control.',
   '{"type": "Polygon", "coordinates": [[[78.3750, 17.4280], [78.3890, 17.4310], [78.3960, 17.4410], [78.3880, 17.4490], [78.3740, 17.4450], [78.3700, 17.4360], [78.3750, 17.4280]]]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  water_level_meters = EXCLUDED.water_level_meters,
  severity = EXCLUDED.severity,
  evacuation_status = EXCLUDED.evacuation_status;

-- 3. 5 Relief Shelters with Capacity and Occupancy
INSERT INTO shelters (id, name, address, latitude, longitude, capacity, occupancy, status, contact_person, contact_phone, supplies) VALUES
  ('22222222-2222-2222-2222-222222220001', 'Kotla Vijaya Bhaskara Reddy Indoor Stadium Relief Center', 'Yousufguda Main Rd, Hyderabad, Telangana 500045', 17.4385, 78.4320, 800, 520, 'open', 'M. Srinivas (GHMC Camp In-Charge)', '+91-9849100001', '{"food": true, "water": true, "medical": true, "blankets": true, "power_backup": true}'::jsonb),
  ('22222222-2222-2222-2222-222222220002', 'Lal Bahadur Shastri Stadium Relief Camp', 'Fateh Maidan, Basheerbagh, Hyderabad, Telangana 500001', 17.4010, 78.4740, 1200, 890, 'open', 'K. V. Ramana (Camp Director)', '+91-9849100002', '{"food": true, "water": true, "medical": true, "blankets": true, "power_backup": true}'::jsonb),
  ('22222222-2222-2222-2222-222222220003', 'Saroornagar Indoor Stadium Evacuation Hub', 'Near Priyadarshini Park, Kothapet, Hyderabad, Telangana 500035', 17.3620, 78.5340, 600, 410, 'open', 'P. Sudhakar (Revenue Division Officer)', '+91-9849100003', '{"food": true, "water": true, "medical": true, "blankets": true, "power_backup": true}'::jsonb),
  ('22222222-2222-2222-2222-222222220004', 'Gachibowli Sports Complex Regional Relief Camp', 'Old Mumbai Hwy, Gachibowli, Hyderabad, Telangana 500032', 17.4430, 78.3490, 1500, 340, 'open', 'Col. N. Balaji (Emergency Coordinator)', '+91-9849100004', '{"food": true, "water": true, "medical": true, "blankets": true, "power_backup": true}'::jsonb),
  ('22222222-2222-2222-2222-222222220005', 'Amberpet Community Relief Hall', 'Near Amberpet Municipal Office, Hyderabad, Telangana 500013', 17.3870, 78.5170, 400, 380, 'near_capacity', 'Smt. Farzana Begum (Zonal Officer)', '+91-9849100005', '{"food": true, "water": true, "medical": true, "blankets": true, "power_backup": false}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  occupancy = EXCLUDED.occupancy,
  status = EXCLUDED.status;

-- 4. 3 Major Emergency Hospitals
INSERT INTO hospitals (id, name, address, latitude, longitude, emergency_available, icu_beds_available, general_beds_available, ambulance_available, contact_phone) VALUES
  ('33333333-3333-3333-3333-333333330001', 'Osmania General Hospital', 'Afzal Gunj, High Court Rd, Hyderabad 500012', 17.3735, 78.4735, true, 24, 140, true, '+91-40-24600121'),
  ('33333333-3333-3333-3333-333333330002', 'Gandhi Hospital', 'Musheerabad, Secunderabad, Hyderabad 500003', 17.4245, 78.5020, true, 32, 210, true, '+91-40-27505566'),
  ('33333333-3333-3333-3333-333333330003', 'Nizams Institute of Medical Sciences (NIMS)', 'Punjagutta, Hyderabad 500082', 17.4220, 78.4525, true, 18, 95, true, '+91-40-23489000')
ON CONFLICT (id) DO UPDATE SET
  emergency_available = EXCLUDED.emergency_available,
  icu_beds_available = EXCLUDED.icu_beds_available;

-- 5. 3 Blocked Roads
INSERT INTO blocked_roads (id, road_name, area, status, severity, latitude, longitude, reason) VALUES
  ('44444444-4444-4444-4444-444444440001', 'Moosarambagh Cause Way Bridge', 'Moosarambagh - Amberpet Corridor', 'impassable', 'critical', 17.3745, 78.5135, 'Musi river overtopping causeway by 3.5 feet. Heavy water velocity; barricaded by Traffic Police and NDRF.'),
  ('44444444-4444-4444-4444-444444440002', 'Puranapul Old Bridge Approach', 'Puranapul - Karwan Junction', 'impassable', 'high', 17.3645, 78.4590, 'Structural revetment erosion and water debris blockage. Diverting all ambulances to New Puranapul Bridge.'),
  ('44444444-4444-4444-4444-444444440003', 'Begumpet Airport Underpass', 'Prakash Nagar - Begumpet Station Link', 'waterlogged', 'high', 17.4435, 78.4720, 'Stormwater nala reverse overflow created 4.5 feet water puddle under railway bridge. Heavy dewatering pumps operating.')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  reason = EXCLUDED.reason;

-- 6. Demo SOS Requests (Explicit IDs FQ1024, FQ1025, FQ1026, FQ1027, FQ1028)
INSERT INTO sos_requests (id, citizen_id, citizen_name, citizen_phone, priority, status, emergency_type, people_count, special_needs, latitude, longitude, address, landmark, assigned_responder_id, responder_notes) VALUES
  ('FQ1024', '00000000-0000-0000-0000-000000000005', 'Mohammed Arif', '+91-9849033331', 'critical', 'open', 'Trapped on Terrace / Fast Rising Water', 4, 'Elderly couple (aged 78 and 74) unable to climb stairs without assistance.', 17.3725, 78.5120, 'H.No 3-4-118, Moosarambagh Riverbed Colony', 'Near Old Hanuman Temple by causeway', NULL, NULL),
  ('FQ1025', '00000000-0000-0000-0000-000000000006', 'Lakshmi Narayana', '+91-9849033332', 'high', 'assigned', 'Medical Distress / Insulin Required', 2, 'Diabetic senior patient needs refrigerated medication and boat evacuation.', 17.3785, 78.4910, 'Flat 202, Al-Madina Heights, Chaderghat', 'Opposite Govt Urdu High School', '00000000-0000-0000-0000-000000000002', 'NDRF Boat 3 deployed from Chaderghat bridge. ETA 12 minutes.'),
  ('FQ1026', '00000000-0000-0000-0000-000000000007', 'Pooja Sharma', '+91-9849033333', 'critical', 'in_progress', 'Ground Floor Submerged / Infants Present', 5, 'Two infants (4 months, 18 months), infant formula and dry drinking water depleted.', 17.4460, 78.4750, 'Plot 44, Brahmanwadi, Begumpet', 'Behind Old Begumpet Post Office', '00000000-0000-0000-0000-000000000003', 'GHMC DRF Team Alpha on site with high-clearance rescue truck.'),
  ('FQ1027', NULL, 'K. Ravinder', '+91-9849044444', 'medium', 'open', 'Food & Potable Water Cutoff', 3, 'No electricity since 14 hours, municipal tap water line contaminated.', 17.4030, 78.4060, 'House 12-2-417, Nadeem Colony, Tolichowki', 'Lane adjacent to Shah Hatim lake bund', NULL, NULL),
  ('FQ1028', NULL, 'G. Venkat', '+91-9849055555', 'low', 'resolved', 'Safe Evacuation Completed', 1, 'Transferred to Kotla Vijaya Bhaskara Reddy Stadium relief shelter.', 17.4380, 78.4350, 'Yousufguda Basti', 'Near Community Hall', '00000000-0000-0000-0000-000000000004', 'Resolved by SDRF Unit 3. Civilian relocated safely to designated relief camp.')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  assigned_responder_id = EXCLUDED.assigned_responder_id,
  responder_notes = EXCLUDED.responder_notes;

-- 7. Broadcast Emergency Alerts
INSERT INTO alerts (id, title, message, severity, affected_areas, is_active, issued_by) VALUES
  ('55555555-5555-5555-5555-555555550001', 'CRITICAL FLASH FLOOD WARNING: Musi River Basin', 'Himayat Sagar and Osman Sagar reservoir gates opened by 4 feet. River discharge reaching 28,000 cusecs. Immediate evacuation mandatory for all residents within 200m of river embankment between Puranapul and Moosarambagh.', 'critical', ARRAY['Chaderghat', 'Moosarambagh', 'Puranapul', 'Malakpet'], true, '00000000-0000-0000-0000-000000000001'),
  ('55555555-5555-5555-5555-555555550002', 'URGENT TRAVEL ADVISORY: Arterial Road Closures', 'Avoid Begumpet Airport underpass, Moosarambagh Causeway, and Puranapul Old Bridge. Emergency rescue corridors designated on PVNR Expressway and Inner Ring Road.', 'high', ARRAY['Begumpet', 'Moosarambagh', 'Karwan', 'Secunderabad'], true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 8. Notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES
  ('66666666-6666-6666-6666-666666660001', '00000000-0000-0000-0000-000000000005', 'SOS Received (FQ1024)', 'Your distress dispatch FQ1024 has been logged into the Command Center triage queue. NDRF teams are in your zone.', 'sos_update', false),
  ('66666666-6666-6666-6666-666666660002', '00000000-0000-0000-0000-000000000006', 'Rescue Team Assigned (FQ1025)', 'Inspector K. Vikram (NDRF Battalion 10) has been assigned to your location. ETA ~12 mins.', 'assignment', false),
  ('66666666-6666-6666-6666-666666660003', '00000000-0000-0000-0000-000000000002', 'New Incident Assigned (FQ1025)', 'You have been assigned to SOS FQ1025 at Al-Madina Heights, Chaderghat. 2 civilians requiring diabetic care.', 'assignment', false)
ON CONFLICT (id) DO NOTHING;
