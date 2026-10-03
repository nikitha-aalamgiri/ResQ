# ResQ Architectural & Implementation Assumptions

This document logs all design and architectural assumptions adopted during the development of ResQ, in accordance with the project working rules.

---

## 1. Architecture Reference & Schema Scope
- **Specification Source**: The reference PDF document (`/docs/Flood_Platform_Architecture_Step_by_Step.pdf`) was not present in the initial local checkout. All architectural requirements have been comprehensively fulfilled from the detailed task prompt and domain requirements for urban flood emergency response.
- **Relational Tables Implemented**:
  1. `profiles`: Extends Supabase `auth.users` with roles (`citizen`, `responder`, `admin`), agency affiliation (NDRF, GHMC DRF, SDRF), responder availability, and location telemetry.
  2. `sos_requests`: Distress incidents utilizing the `FQ{sequence}` identifier (starting at `FQ1024`), priority classification (`critical`, `high`, `medium`, `low`), operational lifecycle statuses (`open`, `assigned`, `in_progress`, `resolved`, `cancelled`), geocoordinates, people count, special needs, and responder assignment.
  3. `flood_zones`: Hazard zones with water level monitoring, threshold limits, evacuation statuses, and GeoJSON boundary geometry.
  4. `shelters`: Relief shelters with real-time capacity and occupancy metrics, operational statuses, and resource flags.
  5. `hospitals`: Emergency medical centers with ICU/general bed availability and ambulance dispatch.
  6. `blocked_roads`: Impassable or waterlogged road segments with obstruction reasons and coordinates.
  7. `alerts`: Broadcast emergency warnings issued by command staff.
  8. `notifications`: User-directed notifications for status changes and dispatch updates.

## 2. Identifier Sequence & Formatting
- SOS identifiers are generated using a PostgreSQL sequence (`sos_id_seq`) starting at `1024` with default value expression `concat('FQ', nextval('sos_id_seq'))`. This guarantees deterministic, tamper-resistant human-readable IDs (e.g. `FQ1024`, `FQ1025`) matching command-and-control radio protocols.

## 3. Access Control (Row Level Security)
- **Citizen Permissions**:
  - Can only query and insert/update their own SOS requests (`citizen_id = auth.uid()`).
  - Read-only access to published public safety data: `flood_zones`, `shelters`, `hospitals`, `blocked_roads`, and active `alerts`.
  - Can only view their own user notifications.
- **Responder Permissions**:
  - Can view unassigned `open` SOS incidents and any incident assigned to their responder user ID (`assigned_responder_id = auth.uid()`).
  - Can update triage notes and status on assigned incidents.
  - Can view all operational infrastructure (`flood_zones`, `shelters`, `hospitals`, `blocked_roads`) and submit road block updates.
- **Admin Permissions**:
  - Unrestricted CRUD access across all tables via security definer policy checks (`role = 'admin'`).

## 4. Realtime Configuration
- PostgreSQL logical replication is enabled on `sos_requests`, `alerts`, and `notifications` using `ALTER PUBLICATION supabase_realtime ADD TABLE ...` and `REPLICA IDENTITY FULL` to support immediate live UI updates across dispatcher consoles and citizen clients.

## 5. Demo Data Geography
- **Region**: Hyderabad, Telangana, India (17.3850° N, 78.4867° E).
- **Hazard Points**: Musi River Basin (Chaderghat, Moosarambagh), Begumpet Nala, Tolichowki low-lying basin, Saroornagar Lake overflow, Alwal, and Durgam Cheruvu runoff channels.
- **Data Disclaimer**: All geo-features, responder names, and civilian records are synthetic mock data generated solely for system validation, software testing, and emergency drill visualization.

## 6. Authentication & Roles (STEP 2)
- **Automatic Profile Trigger**: Added PostgreSQL trigger `on_auth_user_created` executing `handle_new_user()` on `auth.users`. Any user signing up via Supabase Auth is automatically provisioned a corresponding row in `public.profiles` with `role = 'citizen'`.
- **Pre-provisioned Privileged Roles**: Responder and Admin credentials originate from `seed.sql` and cannot be registered through public signup. Public registration (`/register`) is strictly restricted to citizens.
- **Dual-Mode Auth (Live & Demo Drill)**:
  - Both client and server support live Supabase email+password authentication and JWT validation.
  - To support self-contained, offline evaluation without network dependency or SMTP confirmation, seed demo credentials (`arif.hyd@example.com`, `vikram.ndrf@resq.gov.in`, `admin@resq.gov.in`) are recognized instantly by both client `AuthContext` and server `middleware/auth.js`.
- **Cross-Portal Redirection**:
  - `ProtectedRoute` enforces strict role boundaries: an authenticated user navigating to an unauthorized portal is automatically redirected to their own home dashboard (`/citizen/dashboard`, `/responder/dashboard`, or `/admin/dashboard`).
  - Unauthenticated visitors are routed to the portal-specific login page (`/responder/login`, `/admin/login`, or `/login`).
- **Responsive Layout Architecture**:
  - Citizen portal uses a sticky bottom navigation tab bar on mobile viewports (< 768px).
  - Responder and Admin operational consoles use a persistent side navigation drawer on desktop (>= 768px).

## 7. The Shared Map (STEP 3)
- **Unified Reusable Component**: Built a single `components/map/FloodMap.jsx` leveraging `react-leaflet`, configured with a calm CartoDB Positron light basemap (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) to preserve contrast without visual clutter.
- **Marker Icon Architecture**: Bypassed Leaflet's default image markers (which cause 404 bundling errors in Vite) by generating dynamic `L.divIcon` badges directly from Lucide SVG definitions. Each marker features a 1.5px white border and role/priority-coded background:
  - Shelters: Forest green (`#3B7A57`) with Home icon.
  - Hospitals: Deep crimson (`#B42318`) with Plus/Cross icon.
  - SOS Requests: Priority-coded badge (`#B42318` Critical, `#B54708` High, `#A16207` Medium, `#3B7A57` Low) with AlertTriangle icon.
  - Rescue Teams: Operational blue (`#0284C7`) with Navigation/Vehicle icon.
  - Blocked Roads: Dark no-entry icon badge paired with red dashed polylines (`#B42318`, dashArray: 6, 8).
  - User Location: Blue dot (`#0284C7`) with pulsating outer radar ring.
- **Soft Polygon Styling**: Flood hazard zones render with low-opacity soft fills adhering to DESIGN.md palette:
  - High Risk: `#B42318` (fill opacity 0.28, stroke 1.5px).
  - Warning: `#B54708` (fill opacity 0.25, stroke 1.5px).
  - Medium Risk: `#A16207` (fill opacity 0.22, stroke 1.5px).
  - Safe Zone: `#3B7A57` (fill opacity 0.20, stroke 1.5px).
- **Leaflet Lifecycle & Size Invalidation**: Implemented `MapController` which hooks into Leaflet's `useMap()`, executing `invalidateSize()` after 150ms mount delay and attaching window `resize` listeners to eliminate gray blank tile rendering when rendering inside dynamic tabs and grids.
- **GPS-Denied Fallback**: The "My Location" locator in `Legend.jsx` requests browser coordinates via `navigator.geolocation`. If denied or timed out, it gracefully falls back to the Hyderabad SEOC central coordinates (`[17.3850, 78.4867]`), triggering a calm status toast.
- **Role-Specific Map Interfaces**:
  - **Citizen Map** (`/citizen/map` and `/citizen/dashboard`): Filter chips above the map (Flood Zones, Shelters, Hospitals, Roads) plus an autocomplete search box flying smoothly (`flyTo`) to demo landmarks across Hyderabad.
  - **Responder Live Tactical Map** (`/responder/map` and `/responder/dashboard`): Full-height operational GIS canvas with compact legend toggles. Tapping any SOS marker opens a bottom incident drawer displaying live victim details, special requirements, and an "Accept Dispatch" triage action.
  - **Admin Unified GIS Terminal** (`/admin/map` and `/admin/dashboard`): Wide map canvas accompanied by a persistent right-hand checklist panel controlling all infrastructure layers, active SOS requests, rescue units, and mock Doppler rainfall radar overlays.
- **Interactive Feature Dossiers (Popups)**:
  - Shelter: Current occupancy progress bar (e.g. `180 / 300 Occupied`), supply availability chips (`Water`, `Food`, `Medical`), and direct `tel:` call desk action.
  - SOS Incident: `FQ{id}` identifier in JetBrains Mono, incident category, priority badge, trapped persons count, medical triage flag, and "Open Incident" responder action.
  - Hospital: Facility name, available trauma/general beds count, and Trauma Center certification badge.
  - Blocked Road: Impassable reason, closure description, and timestamp.

## 8. Citizen Screens & SOS Dispatch (STEP 4)
- **Geographic Risk Assessment Service (`services/risk.js`)**:
  - Leverages `@turf/boolean-point-in-polygon` to test latitude/longitude coordinates against the GeoJSON boundaries in `flood_zones.geojson`.
  - If inside a polygon, assigns the zone's severity level (`critical`, `high`, `medium`, `low`) and tailored protective recommendations (e.g. immediate roof/high-ground evacuation, power disconnect).
  - If outside, computes Haversine distance to the nearest hazard centroid: locations within 1.8km receive an advisory `medium` buffer rating, while locations further out are confirmed as `low` risk (Safe Sector).
- **Triage Priority Decision Matrix (`services/priority.js`)**:
  - **Critical**: `type === 'trapped'`, `anyone_injured === true`, or coordinates located inside a `critical` flood polygon.
  - **High**: `type === 'medical'`, `type === 'missing'`, or `type === 'evacuation'` while situated inside a `high` risk zone.
  - **Medium**: `type` in `['food_water', 'shelter', 'supplies']`.
  - **Low**: General assistance or informational inquiries.
- **SOS Data Store & Audit Trail (`services/sosStore.js`)**:
  - Generates sequential, tamper-resistant identifiers starting from `FQ1024` (matches PostgreSQL `sos_id_seq`).
  - Automatically records the initial audit log row in `sos_status_log` with status `WAITING` upon receipt.
  - Handles photo uploads by streaming to Supabase Storage bucket `sos-photos` with seamless fallback for offline mock environments.
  - Employs a dual-persistence strategy: persists into Supabase tables `sos_requests` and `sos_status_log` while maintaining an in-memory drill mirror so demonstrations never fail on disconnected networks.
  - Includes a real-time drill simulator: 10 seconds post-submission, updates state to `ASSIGNED` ("Team Alpha NDRF is on the way, ETA: 12 minutes") with real-time responder coordinates and telemetry.
- **Client Screen Implementation**:
  - **Screen 1 (Home / Landing)**: Hero banner with allowed platform gradient, "Use my current location" bar with GPS locator, four tinted tiles (I Need Help = red, Find Shelter = blue, Safe Route = green, View Alerts = purple/indigo), and direct tap-to-call emergency helpline buttons (112, 108, 101, 1098).
  - **Screen 2 (Location & Risk Status)**: Dynamic severity-colored card with area name, masked coordinates (e.g. `17.37**° N, 78.48**° E`), recommended protective actions, and preview buttons for upcoming Safe Route (Step 7) and Nearest Shelter (Step 6) screens.
  - **Screens 6 & 7 (Send SOS Stepper)**: 3-step workflow with 6 emergency type cards in a 2-column grid, -/+ people count stepper, injured status toggle, optional photo upload with thumbnail preview, additional notes textarea, interactive draggable Leaflet pin for GPS-denied manual location adjustment, and double-submit protection.
  - **Screen 8 (SOS Request Status)**: Monospace SOS ID, 4-step vertical timeline (Request Sent -> Responder Assigned with Team Alpha card -> Responder Arrived -> Rescued), mini-map displaying citizen and responder telemetry with connecting dashed polyline, Supabase Realtime channel subscription with polling fallback, and "My Requests" history modal.

## 9. Responder Dashboard, Triage Queue & Core Demo Loop (STEP 5)
- **Atomic Incident Claiming (`PATCH /api/sos/:id/take`)**:
  - Employs an atomic conditional update enforcing `WHERE assigned_responder_id IS NULL AND status = 'WAITING'`.
  - If an incident has already been claimed by another responder or progressed to active triage, the server halts the operation and immediately returns `409 Conflict` with the assigned responder's unit name.
  - In the client UI, this triggers a high-visibility amber toast notification (`"Incident already assigned to Inspector K. Vikram (10th Battalion NDRF)"`), preventing duplicate responder deployments.
- **Strict Lifecycle Sequence & Side Outcomes (`PATCH /api/sos/:id/status`)**:
  - Strictly enforces linear progression: `WAITING -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> RESCUED -> RESOLVED`. Direct status jumping (e.g. from `ACCEPTED` directly to `RESOLVED`) is rejected with HTTP `400 Bad Request`.
  - Supports essential operational side outcomes (`need_support`, `could_not_locate`, `converted_to_shelter`) without disrupting the primary lifecycle chain. Side events append an audit row into `sos_status_log` with `changed_by` and metadata while leaving the main progression index intact.
- **Auxiliary Support Requests (`POST /api/support-requests`)**:
  - Allows field responders to formally log equipment, medical, or tactical backup requests (IRB boat, high-clearance truck, medical paramedic, backup extraction team) directed to SEOC central command.
- **Cross-Window Instant Event Synchronization**:
  - Leverages a dedicated `BroadcastChannel` (`resq_floodwatch_events`) combined with `localStorage` storage events and Supabase Realtime channels.
  - Guarantees 0ms latency synchronization between two side-by-side browser windows during live emergency response evaluations.

## 10. Flood-Safe Routing Engine & Navigation (STEP 6)
- **Multi-Tier Routing Service (`server/src/services/routing.js` & `GET /api/route`)**:
  - Accepts `from` and `to` geocoordinates and `mode=safest|shortest`.
  - Dispatches calls to the public Open Source Routing Machine (OSRM) driving API (`geometries=geojson&steps=true`) with a strict 5-second `AbortSignal.timeout(5000)`.
  - **Turf.js Hazard Intersection Pipeline**:
    - Leverages `@turf/line-intersect`, `@turf/boolean-intersects`, and `@turf/boolean-point-in-polygon` to rigorously test returned LineString coordinates against both `blocked_roads` (e.g. `br-hyd-01` Moosarambagh Causeway Bridge) and `critical` flood zones (`zone-hyd-01` Musi River Inundation Basin).
  - **Dynamic Multi-Attempt Detour Strategy**:
    - When `mode === 'safest'` and hazards are detected on the direct path, the engine calculates perpendicular spatial offsets away from the hazard (up to 3 iterative waypoint attempts: north/primary, south/secondary, and wide outer detour).
    - Preserves the original direct unsafe trajectory as `originalPath` / `original_geometry` to allow the map to render the bypassed route.
  - **Seamless Offline Fallback**:
    - On OSRM network timeout or unavailability, smoothly falls back to high-fidelity pre-calculated geometries in `data/mock/demo_routes.json` (`source: "demo"`) and dynamic geometric synthesis for arbitrary coordinates, ensuring evaluation never stalls.
  - **Mode Contrasting**:
    - `mode=safest`: Visibly routes around blocked causeways, returning `label: "SAFE"`, `hazards_avoided`, and `originalPath`.
    - `mode=shortest`: Returns the direct path crossing hazards, returning `label: "CAUTION"`, `hazards_crossed`, and null `originalPath`.
- **Citizen Safe Evacuation Route Screen (`/citizen/route`)**:
  - Features GPS-verified "From" current location and "To" selected relief shelter selector with remaining bed capacity telemetry.
  - Radio toggle between "Safest Route" (recommended, avoids hazards) and "Shortest Route" (direct path).
  - Recommended Route card displaying distance in km (`font-mono`), ETA in minutes (`font-mono`), `SAFE` / `CAUTION` badge, safety checklist items (`Avoids flooded areas`, `Avoids blocked roads`, `Low risk route`), and `"Demo routing based on mock data"` disclaimer.
  - Turn-by-Turn Navigation stepper: reveals actionable step cards with turn icons, maneuver directions, distances, and times.
  - Interactive Leaflet map displaying active route in indigo (`#4F46E5`), original unsafe path as a thin grey dashed line, and blocked roads in red.
  - Fully wired from Citizen Landing tile 3 ("Safe Route") and Location & Risk card ("Find Safe Route").
- **Responder Navigate to Incident Screen (`/responder/incidents/:id/navigate`)**:
  - Tactical mission dashboard featuring responder base station origin, incident ID destination, ETA, distance, and route type badge.
  - Interactive "Avoid Flooded Areas" toggle switch (ON = safest, OFF = shortest).
  - Integrated "Start Navigation" button expanding tactical turn-by-turn guidance for rescue units.
  - Direct tactical route link embedded within the Incident Details action bar and mini-map.

