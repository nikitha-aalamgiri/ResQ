# FloodResQ - 3-Minute Live Demonstration Script

An end-to-end operational walkthrough of the **FloodResQ Emergency Response Platform** showcasing the complete citizen distress, responder field tactical triage, automated safe detour routing, atomic relief shelter management, multi-lingual emergency broadcasting, and dynamic road hazard verification.

---

## Demo Credentials & Role Access

The platform provides pre-configured verified credentials with one-click **"Fill Demo Credentials"** buttons on all login portals:

| Role | Portal URL | Email | Password | Official Name & Agency |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | `/login` | `arif.hyd@example.com` | `demo-password-123` | Mohammed Arif (Chaderghat Resident) |
| **Responder** | `/responder/login` | `vikram.ndrf@resq.gov.in` | `demo-password-123` | Insp. K. Vikram (10th Bn NDRF Boat Rescue) |
| **Admin** | `/admin/login` | `admin@resq.gov.in` | `demo-password-123` | Suresh Reddy (TSDMA SEOC Central Command) |

---

## 3-Minute Chronological Walkthrough

### Part 1: Citizen SOS Distress Dispatch (0:00 - 0:35)
1. **Open Citizen Portal** (`http://localhost:5173/login`).
   - Click **"Fill Demo Credentials"** -> click **"Sign In"**.
   - Landing on **Citizen Dashboard** (`/citizen/dashboard`):
     - Notice GPS detection of Hyderabad Musi River Basin (`17.3750° N, 78.4867° E`).
     - Point out the current risk badge: **"HIGH INUNDATION RISK"**.
2. **Dispatch Emergency SOS**:
   - Click the red **"I Need Help"** tile to navigate to `/citizen/sos`.
   - Select Emergency Type: **"Trapped in Rising Water"** (Critical).
   - Set Number of People: `3` (includes elderly/children).
   - Tap **"Send SOS Distress Call"**.
   - Immediate transition to `/citizen/sos/status` displaying:
     - Realtime distress status **"Awaiting Dispatch"** with glowing radar beacon.
     - Live broadcast event `SOS_CREATED` transmitted with 0ms delay across WebSockets/Supabase Realtime.

---

### Part 2: Admin Master Command & Instant Dispatch (0:35 - 1:10)
1. **Open Admin SEOC Command Center** (`http://localhost:5173/admin/login`):
   - Click **"Fill Demo Credentials"** -> click **"Sign In as Incident Commander"**.
   - View **Command Overview** (`/admin/dashboard`):
     - Observe 5 tinted real-time KPI cards: **Active SOS**, **In Progress**, **Shelters Open**, **High Risk Zones**, **Responders Online**.
     - Notice the new SOS from Mohammed Arif appearing instantly in the live incident queue and map without refreshing.
2. **Assign Responder**:
   - Navigate to **Dispatch Center** (`/admin/dispatch`).
   - Find the newly logged incident (`Trapped in Rising Water - 3 people`).
   - Open the **Assign Responder** dropdown -> Select **"Insp. K. Vikram (NDRF)"**.
   - Click **Assign**. Priority updates to `ASSIGNED` in real-time.

---

### Part 3: Responder Field Triage & Safe Detour Navigation (1:10 - 2:00)
1. **Switch to Responder Portal** (`http://localhost:5173/responder/dashboard`):
   - Log in as `vikram.ndrf@resq.gov.in`.
   - Notification toast appears: *"Incident Assigned: Trapped in Rising Water"*.
   - Click **"Distress Pool"** (`/responder/triage`) or **"My Tasks"** (`/responder/tasks`).
   - Click **"View Incident"** on the assigned ticket.
2. **Navigate with OSRM Turf.js Hazard Avoidance**:
   - Click **"Navigate to Scene"** (`/responder/incidents/:id/navigate`).
   - Observe the map and routing card:
     - The **Safest Route** toggle is active (`indigo` route).
     - Notice the route visibly detours around the **Moosarambagh Bridge** / Critical Flood Hazard Zone.
     - Thin grey dashed line illustrates the direct unsafe hazard path.
     - Badge displays **"SAFE"** with checks: *"Avoids flooded areas"*, *"Avoids blocked roads"*.
   - Toggle to **"Shortest Route"**:
     - Route snaps through the flooded sector and badge flips to amber **"CAUTION"**.
   - Switch back to **"Safest Route"** and click **"Start Navigation"** to view turn-by-turn guidance.
3. **Update Status to Rescued**:
   - Click **"Update Status"** (`/responder/incidents/:id/update`).
   - Progress through: `EN_ROUTE` -> `ON_SCENE` -> `RESCUED`.
   - Upon moving to `RESCUED`, the system automatically queries `/api/shelters/nearest` and returns the recommended facility: **"Amberpet Relief Camp"** with spare capacity.

---

### Part 4: Relief Shelter Allocation & Capacity Synchronization (2:00 - 2:30)
1. **Resolve Incident**:
   - Responder clicks **"Confirm Shelter Evacuation & Resolve"** (`RESOLVED`).
   - The platform executes an atomic database transaction:
     - Incident status becomes `RESOLVED`.
     - Target shelter occupancy increments by `+3` people.
2. **Verify Realtime Shelter Synchronization**:
   - Switch to Citizen **"Nearby Shelters"** (`/citizen/shelters`):
     - The allocated shelter (e.g. **Lal Bahadur Shastri Stadium Relief Camp**) displays updated capacity bar (`893 / 1200 Occupied`).
   - Switch to Admin **"Manage Shelters"** (`/admin/shelters`):
     - The capacity indicator and status badge dynamically reflect the live increment.
     - Admin counters on `/admin/dashboard` update automatically without manual reload.

---

### Part 5: Multilingual Geo-Alert Broadcast & Dynamic Hazard Detour (2:30 - 3:00)
1. **Admin Broadcasts Emergency Alert**:
   - Navigate to Admin **"Broadcast Alerts"** (`/admin/alerts`).
   - Fill Title: *"Flash Flood Advisory: Musi Water Level Exceeds 85.4m"*.
   - Select Alert Type: **Flood Warning**, Severity: **Critical**.
   - Check Languages: **English**, **Telugu (తెలుగు)**, **Hindi (हिन्दी)**.
   - Click **"Draw Area"** on the mini-map to bound the river basin.
   - Click **"Publish Alert"**.
   - In the Citizen Portal window, a realtime toast immediately flashes in the chosen language:
     - Switch Citizen language from `EN` to `TE` (Telugu) via the top bar dropdown. All cards, tiles, and alerts render in Telugu.
2. **Hazard Reporting & Dynamic Route Recalculation**:
   - On Citizen Dashboard (`/citizen/dashboard`), click **"Report Road Hazard"**.
   - Enter Road Name: *"Chaderghat Causeway"*, Severity: *"Critical"*.
   - Click **"Submit Hazard Report"**.
   - Switch to Admin **"Hazard Reports"** (`/admin/reports`):
     - Click **"Verify & Block Road"**.
   - Instantly, the routing engine `/api/route` injects the newly verified blockage into `blocked_roads`.
   - Any new route calculated through Chaderghat automatically re-routes around the closed causeway!

---

## End-to-End Success Criteria Checklist

- [x] **Distress Dispatch**: Citizen sends SOS with geolocation, instantly visible on responder and admin portals.
- [x] **Master Triage**: Admin assigns responder; real-time status transitions.
- [x] **Smart Routing**: OSRM + Turf.js detects critical flood zones and dynamically computes detours with SAFE / CAUTION badges.
- [x] **Atomic Shelter Sync**: Moving incident to RESCUED recommends nearest open shelter; resolving atomically increments shelter occupancy.
- [x] **Multilingual Alerts**: Geospatial area notification delivers real-time toast to citizens in English, Telugu, and Hindi.
- [x] **Offline Resilience**: Offline banner triggers, contacts and cached shelters remain accessible, and simulated SMS fallback is available.
- [x] **Dynamic Hazards**: Verified hazard reports immediately block roads in the routing engine.
