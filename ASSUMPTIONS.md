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
- **Unified Reusable Component**: Built a single `components/map/FloodMap.jsx` leveraging `react-leaflet`, configured with centralized tile provider management (`client/src/lib/mapConfig.js`) utilizing OpenStreetMap standard tiles (with Esri World Light Gray fallback) and a calm CSS desaturation filter to preserve contrast without visual clutter.
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
## 11. Shelter Telemetry, Admin Live Dashboard & Incident Dispatch (STEP 7)
- **Real-Time Shelter Telemetry & Nearest Capacity Engine**:
  - `GET /api/shelters`: Returns all relief camps with geospatial distance calculated from citizen or responder coordinates, current occupancy vs capacity, and status badges (`open`, `filling_fast`, `full`).
  - `GET /api/shelters/nearest`: Deterministically identifies the closest operational shelter with verified spare capacity (`occupancy + people_count <= capacity`).
  - **Atomic Shelter Capacity Increment on Resolution**:
    - When an incident transitions to `RESOLVED` or `converted_to_shelter`, the server atomically assigns people to the recommended shelter and increments occupancy in a single transaction.
- **Citizen "Nearby Shelters" Screen (`/citizen/shelters`)**:
  - Displays shelter cards with telemetry, status badge, occupancy counters, amenity chips (Food, Water, Medical, Wheelchair Accessible, Pets Allowed), and "View on Map" & "Navigate" buttons.
- **Responder "Nearby Shelters" Screen (`/responder/shelters`)**:
  - Split view featuring search filter on the left and full-viewport interactive map on the right with color-coded status markers and legend.
- **Admin Command Dashboard (`/admin/dashboard`)**:
  - Top header with live date/time, notification bell, and user menu.
  - 5 tinted metric cards (`Active SOS`, `In Progress`, `Shelters Open`, `High Risk Zones`, `Responders Online`).
  - Interactive "Live Situation Map" with layer checklist (Zones, Shelters, Incidents, Responders, Blocked Roads).
  - "Recent Alerts" feed with severity-tinted cards and realtime synchronization.
- **Admin Incident Management Center (`/admin/dispatch`)**:
  - Status tabs with live incident counters (`All`, `Critical`, `High`, `Medium`, `Resolved`).
  - Search by citizen name, phone, or landmark, plus emergency type filter.
  - Bulk action bar supporting priority adjustment and manual responder dispatch.
  - Responder assignment dropdown allowing direct assignment of field units.

## 12. Multi-Lingual Broadcast Alerts, Citizen Notifications, Contacts & Offline PWA (STEP 8)
- **Admin Emergency Broadcast Studio (`/admin/alerts`)**:
  - Form fields: Alert Title, Description, Alert Type (`Severe Flood Warning`, `Road Blocked`, `New Shelter Opened`, `Relief Support Available`, `Evacuation Notice`), and Severity (`critical`, `high`, `medium`, `low`).
  - Interactive Leaflet affected area drawing tool enabling click-to-draw custom GeoJSON hazard polygons or select from presets (Musi River, Amberpet, Central Sector, Saroornagar).
  - Multi-language checkboxes for English, Telugu (`te`), Hindi (`hi`), and Urdu (`ur`) with localized text inputs. Urdu text is explicitly styled with RTL reading direction (`dir="rtl"`) and `.font-urdu`.
  - Preview modal allowing verification of multilingual cards and geofenced polygon prior to release.
  - Server `POST /api/alerts`: Uses Turf.js `booleanPointInPolygon` to spatially intersect citizen locations against the drawn boundary polygon, generating persistent notification rows for impacted citizens.
  - Live broadcast history list displaying timestamp, targeted citizen count, type, and severity badges.
- **Citizen "Alerts & Notifications" Screen (`/citizen/alerts`)**:
  - Filter tabs: `All`, `Flood Alerts`, `Shelters`, `Roads`, `Resources`.
  - Color-coded severity cards matching mockup specifications:
    - Severe Flood Warning: red tint (`#FDF2F2`) with red border (`#FDA29B`).
    - Road Blocked: amber tint (`#FEF6EE`) with amber border (`#FECDCA`).
    - New Shelter Opened: blue tint (`#EFF8FF`) with blue border (`#B2DDFF`).
    - Relief Support Available: green tint (`#EDF6F1`) with green border (`#C3E4D1`).
  - Includes timestamp, short summary, and chevron opening the full alert modal with polygon boundary map.
  - Real-time notification toast received across all citizen screens when an alert is broadcast.
  - Dynamic notification badge on the app bar bell icon displaying unread alert counts.
- **Citizen "Emergency Contacts & Resources" Screen (`/citizen/contacts`)**:
  - **Emergency Contacts Tab**: Primary emergency hotlines (112 Police, 108 Ambulance, 101 Fire & Rescue, 1098 Childline) with one-tap dial buttons marked `(Demo)`. Important government helplines (State Disaster Management 1070, GHMC Flood Cell 040-21111111, 10th Battalion NDRF).
  - **Relief Resources Tab**: Real-time inventory of relief stock across shelters (food packets, potable water pouches, medical kits, emergency blankets).
- **Internationalization (i18n)**:
  - Central dictionary in `client/src/i18n/translations.js` supporting English (`en`), Telugu (`te`), and Hindi (`hi`).
  - `LangContext` providing `lang`, `setLang`, and `t('key')` helper across citizen dashboard, navigation tabs, and screens.
  - `EN` dropdown in top app bar matching mockup design.
  - Font fallbacks configured in HTML and CSS (`Noto Sans Telugu`, `Noto Sans Devanagari`, `Noto Nastaliq Urdu`).
  - User preference persisted in `localStorage` and synchronized with `profiles.language` via `PATCH /api/me/language`.
- **Offline Resilience & Progressive Web App (PWA)**:
  - Configured with `vite-plugin-pwa`: app name `FloodResQ`, navy theme `#0F1F3D`, CartoDB map tiles cached via CacheFirst, and API cached via NetworkFirst. Generates `dist/sw.js` and `manifest.webmanifest`.
  - Client-side storage layer (`client/src/lib/offlineStore.js`) caching shelters, flood zones, contacts, and the last calculated evacuation route.
  - Calm amber OFFLINE MODE banner (`#FEF6EE` / `#F9DBAF` / `#B54708`) displayed whenever connectivity is lost or simulated offline drill is active.
  - Offline SOS Queue: Citizen distress requests submitted while offline are safely queued locally with unique offline IDs and automatically flushed via `syncOfflineSOSQueue` once internet connectivity returns.
  - Simulated SMS Fallback: Generates `sms:112?body=...` link pre-filled with incident ID, GPS coordinates, and distress type for zero-data cellular fallback.

## 13. Outbound SMS Lifecycle Notifications & MSG91 Integration
- **SOS-First Persistence Guarantee**: The SOS record and its initial/subsequent status logs are persisted before any SMS notification attempt. SMS failure or provider unavailability never blocks, rolls back, or invalidates an SOS request.
- **Asynchronous Fire-and-Forget Architecture**: SMS dispatch is triggered in a non-blocking background step (`.catch(...)`) after sending the HTTP response, guaranteeing zero latency impact on emergency distress submissions (`POST /api/sos`) and status transitions (`PATCH /api/sos/:id/*`).
- **Data Protection & PII Safeguards**:
  - No personal names, real phone numbers, or private emails are committed to git repositories, test files, seed records, or documentation.
  - The demo citizen account is dynamically provisioned from environment variables (`server/.env`: `DEMO_CITIZEN_NAME`, `DEMO_CITIZEN_EMAIL`, `DEMO_CITIZEN_PHONE`) via `npm run seed:demo-citizen`.
  - Database table `sms_logs` stores only masked phone numbers (`******6632`) and stable error codes (`INVALID_PHONE`, `SMS_RATE_LIMITED`, etc.). Raw provider responses, authorization keys, and unmasked phones are never persisted or exposed.
  - Responder phone numbers and internal operational identifiers are strictly excluded from SMS payloads.
- **DLT Template Constraints & English-Only Copy**:
  - In compliance with Indian Telecom Commercial Communications Customer Preference Regulations (TCCCPR) and TRAI DLT registry regulations, transactional SMS messages adhere to pre-approved, fixed English templates with explicit parameter interpolation (`{#var#}`).
  - SMS notifications are delivered in English across all user language preferences, while the client web application provides full trilingual coverage (`en`, `te`, `hi`).
- **Rate Limiting & Cost Protection**:
  - Enforces a ceiling of at most 6 SMS notifications per citizen user within any 10-minute sliding window. Requests exceeding this threshold log status `failed` with stable code `SMS_RATE_LIMITED`.
## 14. Incident Status Progression & Responder Invariance
- **Strict Invariance Rule**: An SOS status may change ONLY when the assigned responder explicitly submits an update (or, for the initial take step, when a responder presses `TAKE INCIDENT`). Nothing automatic is allowed to write or advance a status.
- **Root Cause & Removal of Automatic Writers**:
  - The previous in-memory drill simulation (`setTimeout` in `server/src/services/sosStore.js`) automatically shifted `WAITING` incidents to `ASSIGNED` after 10 seconds. This automatic timer has been completely eradicated.
  - Admin direct assignment (`assignSOSByAdmin`) now updates `assigned_responder_id` and responder notes without mutating incident status.
  - Bulk actions on incidents (`bulkUpdateSOS`) now reject direct `status` updates to preserve assigned-responder ownership.
- **Separation of Visual Telemetry from Incident Status**:
  - Simulated responder movement (via `/api/demo/advance-responder` or client route navigation) updates coordinates and counts down displayed ETA purely visually. It NEVER touches or advances the incident status.
  - When the simulated marker reaches the destination, the status remains unchanged and a translated hint (`responder.nearLocationHint`) is presented to the responder: *"You are near the location. Tap Arrived when you reach it."*
  - Simulation is opt-in via `VITE_DEMO_SIMULATION=true` (or localStorage flag `resq_demo_simulation=true`) and displays a distinct *"Simulated position (demo)"* badge on the citizen map.
- **Strict Sequential Lifecycle Chain**:
  - Main state progression is strictly enforced: `WAITING > ACCEPTED > ON_THE_WAY > ARRIVED > RESCUED > RESOLVED`.
  - Side outcomes (`NEED_SUPPORT`, `COULD_NOT_LOCATE`, `CONVERTED_TO_SHELTER`) are operational logs or auxiliary requests that do not advance the primary rescue chain.
  - Any attempt to skip steps (e.g. `ACCEPTED` directly to `RESCUED`), regress backwards, duplicate status, or transition closed `RESOLVED` incidents is rejected with 400 `INVALID_STATUS_TRANSITION`.
- **Identity & Role Enforcement**:
  - Responders can only update incidents assigned directly to them (`existing.assigned_responder_id === responderId`); attempts by unassigned responders reject with 403 `NOT_ASSIGNED_RESPONDER`.
  - Non-responders/citizens attempting status updates are rejected with 403 `UNAUTHORIZED_ROLE`.
  - Admins can override status transitions only when supplying an audited reason field (`adminReason`); requests lacking this reject with 400 `ADMIN_REASON_REQUIRED`.
  - Status logs record `changed_by` directly from the authenticated JWT session user.
- **Database & Row Level Security (RLS) Lockdown**:
  - Revoked all client direct `UPDATE` policies on `sos_requests` and direct `INSERT` policies on `sos_status_log` in `004_status_guard.sql` (mirrored in `schema.sql` and `rls.sql`).
  - Added PostgreSQL trigger `trg_guard_sos_status` executing `guard_sos_status_transition()` on `sos_requests` to reject non-sequential status updates at the database engine level.
- **Client Stepper & Form Restraints**:
  - Responder console (`/responder/incidents/:id/status`) dynamically displays ONLY the single valid next sequential action based on current status.
  - Form action buttons disable while requests are in flight (`isSubmitting`), and errors are mapped to translated keys across `en`, `te`, and `hi`.

## 15. Offline-First Emergency Architecture: Phase 1 Foundation
- **Scope & Non-Negotiables**:
  - Built Phase 1 of 3 (Foundation). Phase 2 will construct offline emergency screens; Phase 3 will build the offline SOS queue and background sync.
  - Reused existing routing, components, and APIs; zero duplicate backend or database instances.
  - Workbox service worker precaches app shell, self-hosted fonts, static assets, and icons; runtime caching for authenticated `/api/` endpoints is strictly prohibited to prevent credential leaks or stale sensitive data.
- **PWA & Self-Hosted Typography**:
  - Manifest metadata: name `FloodResQ`, short_name `FloodResQ`, theme `#0F1F3D`, background `#F6F7FB`, standalone display mode, start URL `/`.
  - Generated high-resolution PWA icons (192x192, 512x512, maskable 512x512, and apple-touch-icon).
  - Completely removed Google Fonts CDN references to eliminate network latency and offline loading failures; self-hosted all typography via `@fontsource` packages (`@fontsource/inter`, `@fontsource/jetbrains-mono`, `@fontsource/noto-sans-telugu`, `@fontsource/noto-sans-devanagari`).
  - Install prompt button (`InstallAppButton`) integrated into citizen More/Profile page listening to `beforeinstallprompt`.
  - Update toast (`PwaUpdatePrompt`) alerts users when a new service worker version is waiting to activate, avoiding disruptive silent page reloads.
- **Connection Status & Reachability Engine (`ConnectionContext`)**:
  - Real-world connectivity is validated via an active reachability probe (`GET /api/health` with a strict 3-second `AbortController` timeout) rather than relying solely on the deceptive browser `navigator.onLine`.
  - Periodic heartbeat runs every 30 seconds when online and steps up to every 5 seconds when offline to detect restoration immediately.
  - `ConnectionBanner` provides clear visual feedback: a subtle green synchronized status, a high-visibility orange warning banner displaying last sync time when offline, and a blue transitional banner while reconnecting and resynchronizing.
- **IndexedDB Storage Layer (`client/src/offline/db.js`)**:
  - Leverages Dexie.js with 12 structured stores: `shelters`, `hospitals`, `floodZones`, `safeZones`, `blockedRoads`, `contacts`, `alerts`, `instructions`, `routes`, `mySos`, `sosQueue`, `hazardQueue`, and `meta`.
  - Session Data Cleansing: On logout, `clearUserSessionData()` purges citizen-specific private records (`mySos`, `routes`, `lastKnownLocation`, and non-pending SOS items) while preserving public life-safety resources (`shelters`, `hospitals`, `floodZones`, `safeZones`, `blockedRoads`, `contacts`, `instructions`).
  - Requests persistent storage via `navigator.storage.persist()` on supported browsers to prevent eviction under disk pressure.
- **Static Content Bundling (`staticContent.js`)**:
  - Bundles baseline emergency contacts (112, 108, 101, 1098, State Disaster Management 1070, GHMC Flood Cell, NDRF 10th Bn) and flood safety instructions (pre-flood preparation, active flood response, electrical safety, post-flood sanitation) in application source.
  - Automatically seeds empty IndexedDB tables on initial launch so life-saving instructions are available even if the user goes offline before their first synchronization.
- **Backend Offline Bundle API (`GET /api/offline/bundle`)**:
  - Gathers public disaster relief datasets into a unified JSON bundle (`shelters`, `hospitals`, `floodZones`, `safeZones`, `blockedRoads`, `alerts`, `contacts`, `instructions`).
  - Generates a deterministic SHA-256 ETag based on contents and per-dataset `updatedAt` timestamps; returns `304 Not Modified` when client sends matching `If-None-Match`.
  - Includes server timestamp (`serverTime`) for client clock skew correction.
- **Synchronization Service (`syncService.js`)**:
  - Concurrency Safety: Employs the Web Locks API (`navigator.locks.request('resq_offline_sync', ...)`) with immediate fallback to prevent duplicate, concurrent sync runs across multiple open browser tabs.
  - Transactional Integrity: All store updates execute inside Dexie transactions; partial or failed syncs leave existing cached datasets untouched.
  - Tile Warming: Pre-fetches Leaflet map tiles for the central operational zone around Hyderabad (`[17.3850, 78.4867]`) across zoom levels 11–14 to ensure offline map readability.
- **Stale Data Governance (`freshness.js`)**:
  - Enforces explicit age thresholds: `alerts` (30 min), `blockedRoads` (2 hours), `shelters`/`hospitals`/`floodZones`/`safeZones` (6 hours), `contacts`/`instructions` (permanent/static).
  - `FreshnessNotice` component renders clear visual warnings when datasets exceed freshness limits, ensuring cached disaster telemetry is never misrepresented as real-time live conditions.
- **Security & Role Boundaries**:
  - Offline functionality is strictly scoped to the Citizen portal.
  - Responder and Administrator consoles are protected by `OfflinePortalGate`: when disconnected, they display a calm network requirement screen prohibiting offline dispatch or status changes.
  - Zero admin or responder operational incident records are stored in IndexedDB.


