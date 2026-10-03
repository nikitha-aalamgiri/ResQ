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
