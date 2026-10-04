# FloodResQ Engineering Progress Log

## Summary of All Implemented Phases

### Phase 1–8: Core Emergency Flood Management Platform
- **Phase 1: Project Setup & Monorepo Configuration** — Vite React frontend with Tailwind CSS, Express backend, Supabase PostgreSQL schema, environment isolation.
- **Phase 2: Authentication & Role-Based Access Control** — Citizens, Responders, and Administrators with protected routes and role gates.
- **Phase 3: Shared Interactive GIS Map** — Leaflet map with custom SVG icons, flood zone polygons, shelter status, blocked roads, and GPS geolocation.
- **Phase 4: Citizen Emergency Triage & SOS Stepper** — Distress form with priority scoring matrix, photo upload, in-memory drill mirror, and live status timeline.
- **Phase 5: Responder Command Terminal & Live Triage** — Atomic incident take (`PATCH /api/sos/:id/take` with 409 Conflict protection), strict status progression (`WAITING -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> RESCUED -> RESOLVED`), side outcomes, and cross-tab BroadcastChannel sync.
- **Phase 6: Flood-Safe Routing Engine** — OSRM routing with Turf.js polygon hazard avoidance, detour calculation, step-by-step turn guidance.
- **Phase 7: Shelter Telemetry & Admin Dispatch** — Nearest open shelter with spare capacity matching, atomic occupancy increment on rescue.
- **Phase 8: Multi-Lingual Broadcast Alerts & Offline PWA** — 100% trilingual parity across English (`en`), Telugu (`te`), and Hindi (`hi`), service worker caching, and offline queue.

---

### Phase 9: Outbound SMS Lifecycle Notifications & MSG91 Integration (COMPLETED)

#### 1. Database & Migrations
- [x] Created `supabase/migrations/003_sms_support.sql`:
  - Extended `profiles` with `phone_verified boolean NOT NULL DEFAULT false` and `sms_enabled boolean NOT NULL DEFAULT true`.
  - Created `sms_logs` table (`id uuid PK`, `user_id uuid FK`, `sos_id text FK`, `phone_masked text NOT NULL`, `event_type text NOT NULL`, `provider text NOT NULL`, `provider_request_id text`, `status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))`, `error_code text`, `created_at timestamptz`, `sent_at timestamptz`).
  - Added indexes: `idx_sms_logs_user_id`, `idx_sms_logs_sos_id`, `idx_sms_logs_created_at_desc`.
  - Added unique partial index: `idx_sms_logs_unique_pending_sent` on `(sos_id, event_type) WHERE status IN ('pending', 'sent')`.
  - RLS policies: Citizens can select only their own logs; Admins can select all; zero client insert/update/delete policies.
  - Realtime publication enabled for `sms_logs`.
- [x] Mirrored schema changes into `supabase/schema.sql` and `supabase/rls.sql`.

#### 2. Environment Configuration & Demo Citizen Seeding
- [x] Updated `.env.example` and `server/.env.example` with MSG91 variables and demo citizen placeholders.
- [x] Zero personal data committed in git: names, emails, and phone numbers are loaded strictly from environment.
- [x] Created `server/scripts/seed-demo-citizen.js` creating or updating the demo citizen (`phone_verified=true`, `sms_enabled=true`) via Supabase Service Role without overwriting existing seed users. Added `npm run seed:demo-citizen`.

#### 3. Provider Abstraction & Notification Service
- [x] Created `server/src/services/sms.js`:
  - `sendSms({ to, eventType, variables, sosId })`: supports `SMS_PROVIDER="msg91"` and `"mock"`.
  - MSG91 Flow API (`https://control.msg91.com/api/v5/flow`) with 5s `AbortController` timeout and per-event Flow IDs.
  - Mock mode logging with masked phone number and in-memory preview storage.
  - Indian phone normalization (`normalizeIndianPhone`): strips `+91`, `91`, `0`, spaces, dashes; validates 10 digits starting with 6-9; formats as `91` + 10 digits. Throws stable code `INVALID_PHONE`.
  - Phone masking (`maskPhone`): formats as `******XXXX`.
  - Stable error codes: `INVALID_PHONE`, `SMS_PROVIDER_NOT_CONFIGURED`, `SMS_PROVIDER_FAILED`, `SMS_RATE_LIMITED`, `SMS_TEMPLATE_INVALID`, `SMS_DISABLED`, `NO_PHONE`.
- [x] Created `server/src/services/smsNotifications.js`:
  - `notifySosEvent({ sosId, eventType, extra })`: skips with `SMS_DISABLED` or `NO_PHONE` when disabled or missing.
  - In-memory rate limiting: max 6 SMS per citizen user per 10 minutes (`SMS_RATE_LIMITED`).
  - Deduplication: checks existing pending/sent logs for `(sosId, eventType)`.
  - Audit logging to `sms_logs` and in-memory store.
  - Never throws and never alters the SOS row.
  - Admin dev preview endpoint: `GET /api/dev/sms-preview/:sosId` (only active when `NODE_ENV !== 'production'`).

#### 4. Server API Integration
- [x] `POST /api/sos`: persists SOS and initial `WAITING` status log, responds with HTTP 201, then fires `SOS_CREATED` asynchronously.
- [x] `PATCH /api/sos/:id/take`: atomic claim check (`WHERE responder_id IS NULL AND status = 'WAITING'`). On success returns HTTP 200 and fires `RESPONDER_ASSIGNED`. On conflict returns 409 `SOS_ALREADY_TAKEN` and sends no SMS.
- [x] `PATCH /api/sos/:id/status`: sequential progression check (`WAITING -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> RESCUED -> RESOLVED`). On invalid transition returns 400 `INVALID_STATUS_TRANSITION`. On success returns HTTP 200 and fires `ON_THE_WAY`, `ARRIVED`, or `RESCUED` (with shelter name).
- [x] Added `GET /api/sos/:id/sms-logs` for retrieving incident SMS history.
- [x] Added `PATCH /api/me/profile`: allows citizens to update phone number and SMS preferences; editing phone automatically resets `phone_verified` to `false`.

#### 5. Client UI & i18n
- [x] Added translations for all SMS error codes, profile fields, and status indicators in English, Telugu, and Hindi in `client/src/i18n/translations.js`.
- [x] Verified 100% key parity (458 leaf keys) across all 3 languages via `npm run i18n:check`.
- [x] SOS Status Tracking (`client/src/pages/citizen/SOSStatusPage.jsx`): Realtime subscription to `sms_logs` displaying "SMS update sent at {time}" non-intrusively.
- [x] Citizen Profile Page (`client/src/pages/citizen/CitizenProfilePage.jsx`): phone input with normalization validation, "SMS updates" toggle switch, verified phone badge, and quick emergency links. Accessible under bottom navigation "More" tab.
- [x] Admin Incident Details (`client/src/pages/responder/IncidentDetailsPage.jsx`): "SMS Log" tab displaying incident SMS history (event, status, sent time, masked phone, provider) and dev preview cards.
- [x] Verified client production build via `npm run build` (Vite v8.3.2 passed cleanly).

#### 6. Automated Testing & Verification
- [x] Created `server/test/sms.test.js`:
  - 16 automated tests covering 5 test groups (Phone Normalization, Provider Abstraction, Notification Logic, SOS Lifecycle & Conflict Protection, Database Migration Idempotency via pg-mem).
  - 100% passing (16 passed, 0 failed).

---

### Phase 10: Responder Status Invariance & Automated Status Guards (COMPLETED)

#### 1. Audit & Root Cause Analysis
- [x] Audited full repository for automatic status writers, timers, and RLS loopholes (documented in `docs/STATUS_AUDIT.md`).
- [x] Eradicated 10-second `setTimeout` in `server/src/services/sosStore.js` that was auto-advancing `WAITING` incidents to `ASSIGNED`.
- [x] Removed status mutation from `assignSOSByAdmin` (now only updates `assigned_responder_id` and notes).
- [x] Disallowed direct `status` mutations in `bulkUpdateSOS`.

#### 2. Server & Database Enforcement
- [x] Created `supabase/migrations/004_status_guard.sql`:
  - PostgreSQL trigger `trg_guard_sos_status` executing `guard_sos_status_transition()` on `sos_requests` to reject non-sequential status updates (`WAITING > ACCEPTED > ON_THE_WAY > ARRIVED > RESCUED > RESOLVED`).
  - Revoked client direct `UPDATE` permissions on `sos_requests` and direct `INSERT` permissions on `sos_status_log`. Status updates can only be executed via backend service role.
  - Mirrored migration into `supabase/schema.sql` and `supabase/rls.sql`.
- [x] Backend endpoint `PATCH /api/sos/:id/status` enforcement:
  - Verifies assigned responder identity (`assigned_responder_id === req.user.id`), rejecting unassigned responders with 403 `NOT_ASSIGNED_RESPONDER`.
  - Rejects citizens with 403 `UNAUTHORIZED_ROLE`.
  - Requires audited `adminReason` for admin overrides, rejecting with 400 `ADMIN_REASON_REQUIRED`.
  - Rejects step-skipping (e.g. `ACCEPTED` -> `RESCUED`) and regressive transitions with 400 `INVALID_STATUS_TRANSITION`.
  - Rejects transitions on `RESOLVED` incidents.
  - Writes `changed_by` directly from authenticated JWT user.

#### 3. Client Behavior & UI Updates
- [x] Citizen tracking page (`client/src/pages/citizen/SOSStatusPage.jsx`):
  - Derives timeline exclusively from server `sos_requests.status` and `sos_status_log`.
  - Displays `"Simulated position (demo)"` badge on map when `VITE_DEMO_SIMULATION=true` (or `resq_demo_simulation=true`).
- [x] Responder status console (`client/src/pages/responder/UpdateStatusPage.jsx`):
  - Renders ONLY the single valid next sequential action button based on current status.
  - Displays prominent translated hint `t('responder.nearLocationHint')` ("You are near the location. Tap Arrived when you reach it.") when on `ON_THE_WAY`.
  - Button disables while requests are in flight (`isSubmitting`).
  - Displays translated error messages on rejection.
- [x] Admin Demo Controls page (`client/src/pages/admin/AdminDemoPage.jsx` at `/admin/demo`):
  - "Advance Responder One Step" advances simulated coordinates visually, strictly never modifying incident status.
  - "Spawn Test SOS Incident" creates a new incident in `WAITING` status.
  - "Update Flood Warning Level" cycles hydraulic risk drill levels.
  - "Broadcast Sample Alert" publishes high-urgency advisory.
  - "Reset Demo Drill Data" calls `POST /api/demo/reset`, restoring seed data with clear labeling.

#### 4. Internationalization (i18n)
- [x] Added all new error keys (`NOT_ASSIGNED_RESPONDER`, `ADMIN_REASON_REQUIRED`, `INCIDENT_RESOLVED`, `UNAUTHORIZED_ROLE`), `responder.nearLocationHint`, `sos.simulatedPosition`, and admin demo keys across `en`, `te`, and `hi` in `client/src/i18n/translations.js`.
- [x] `npm run i18n:check` passes with 100% key parity (472 leaf keys across English, Telugu, Hindi) and 0 missing keys.

#### 5. Automated Test Suites
- [x] Created `server/test/status_guard.test.js`:
  - 10 automated tests covering the 90-second invariant (no auto-advance), visual marker movement without status mutation, responder-driven status updates, unassigned responder rejection (403), citizen rejection (403), admin reason validation (400), step-skipping rejection (400 `INVALID_STATUS_TRANSITION`), resolution terminal guard, and PostgreSQL trigger rule validation.
- [x] `npm test` runs both suites: 26 passed, 0 failed.
- [x] `npm run build` in `client` passes cleanly.

---

### Phase 11: Offline-First Emergency Architecture — Phase 1: Foundation (COMPLETED)

#### 1. Audit & Baseline Documentation
- [x] Conducted comprehensive pre-implementation audit and authored `docs/OFFLINE_AUDIT.md`:
  - Analyzed routing, auth lifecycle, Supabase subscriptions, PWA/Service Worker setup, Leaflet map caching, i18n, and role permissions.
  - Formulated explicit reuse/extend/replace architecture matrix.

#### 2. Progressive Web App (PWA) & Self-Hosted Typography
- [x] Extended `vite-plugin-pwa` configuration in `client/vite.config.js`:
  - Configured standalone web manifest: name `FloodResQ`, short_name `FloodResQ`, theme color `#0F1F3D`, background `#F6F7FB`, start_url `/`.
  - Precaches app shell, fonts, icons, static assets, and placeholder files.
  - Completely excluded authenticated `/api/` endpoints from service worker runtime caches to prevent credential leaks or stale sensitive data.
  - Maintained CartoDB raster tile cache rule with max 600 entries and 7-day retention.
  - Set `registerType: 'prompt'` to avoid silent disruptive reloads.
- [x] Generated high-res PWA icons via `client/scripts/generate-pwa-icons.js`:
  - `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`.
- [x] Replaced external Google Fonts with self-hosted `@fontsource` packages:
  - Installed `@fontsource/inter`, `@fontsource/jetbrains-mono`, `@fontsource/noto-sans-telugu`, `@fontsource/noto-sans-devanagari`.
  - Imported in `client/src/main.jsx` and removed Google Fonts CDN `<link>` tags in `client/index.html`.
- [x] Created `client/src/components/common/InstallAppButton.jsx` (listening to `beforeinstallprompt`) mounted in citizen More tab.
- [x] Created `client/src/components/common/PwaUpdatePrompt.jsx` toast notification ("New version available, refresh") mounted in `AppShell.jsx`.

#### 3. Connection Status & Reachability Engine
- [x] Created `client/src/context/ConnectionContext.jsx` and `useConnection()` hook:
  - Dual-mode reachability check: evaluates browser `navigator.onLine` combined with active reachability heartbeat (`GET /api/health` with strict 3-second timeout).
  - Configured polling intervals: 30 seconds when online, 5 seconds when offline for instant reconnect detection.
  - Dispatches connection state (`online`, `offline`, `reconnecting`, `lastChecked`, `lastSyncTime`, `checkNow`).
- [x] Created `client/src/components/common/ConnectionBanner.jsx`:
  - Green synchronized badge when online.
  - Orange emergency warning bar displaying formatted last sync time when offline (`t('offline.bannerOffline')`).
  - Blue reconnection/syncing progress notice when recovering connectivity (`t('offline.bannerReconnecting')`).

#### 4. IndexedDB Storage Layer (Dexie.js)
- [x] Created `client/src/offline/db.js`:
  - Initialized Dexie database `FloodResQ_Offline` with 12 structured stores:
    - Public safety: `shelters`, `hospitals`, `floodZones`, `safeZones`, `blockedRoads`, `contacts`, `alerts`, `instructions`.
    - User/Session: `routes`, `mySos`.
    - Queues (for Phase 3): `sosQueue`, `hazardQueue`.
    - Metadata: `meta` (key-value timestamps, sync state, and last known location).
  - Implemented `clearUserSessionData()`: invoked on logout to wipe citizen-specific private records while preserving all public life-safety resources.
  - Implemented `requestPersistentStorage()` invoking `navigator.storage.persist()`.
- [x] Created `client/src/offline/staticContent.js`:
  - Packaged static emergency contacts (112, 108, 101, 1098, State Disaster Management 1070, GHMC Flood Cell, NDRF 10th Bn) and flood safety instructions (pre-flood, during flood, electrical safety, post-flood).
  - Seeded into empty IndexedDB stores on initialization for zero-data resilience.

#### 5. Backend Offline Bundle Endpoint
- [x] Created migration `supabase/migrations/005_offline_foundation.sql` (mirrored in `schema.sql`):
  - Added `phone` column to `hospitals` table.
  - Created `safe_zones` table with high-ground polygon geometries and RLS policies.
  - Added automated `updated_at` trigger handlers across emergency tables.
- [x] Created `server/src/services/offlineBundle.js`:
  - `getOfflineBundle()` aggregates all public disaster relief datasets.
  - `computeBundleEtag()` computes deterministic SHA-256 hash.
- [x] Added `GET /api/offline/bundle` in `server/src/index.js`:
  - Requires user authentication; serves only public safety data.
  - Returns `304 Not Modified` when `If-None-Match` matches calculated ETag.
  - Appends `serverTime` for synchronization clock skew correction.

#### 6. Synchronization Service & "Prepare for Offline"
- [x] Created `client/src/offline/syncService.js`:
  - `syncAll()` coordinates offline bundle download and atomic Dexie writes.
  - Concurrency Guard: uses `navigator.locks` (Web Locks API) to eliminate duplicate synchronization conflicts across multiple browser tabs.
  - Transactional persistence: updates all datasets inside Dexie transactions without wiping data if network fails.
  - Pre-warms Leaflet map tiles for central Hyderabad across zoom levels 11–14.
- [x] Created `client/src/components/offline/PrepareOfflineCard.jsx`:
  - Step-by-step progress checklist for offline preparation.
  - Mounted on citizen Home (`CitizenDashboard.jsx`) and citizen More tab (`CitizenProfilePage.jsx`).
- [x] Created `client/src/pages/citizen/OfflineDataPage.jsx` (`/citizen/offline-data`):
  - Displays connection state, manual sync trigger, storage usage metrics, per-dataset record counts and sync timestamps, and clear storage action.

#### 7. Stale Data Governance
- [x] Created `client/src/offline/freshness.js`:
  - Defined strict data validity thresholds: `alerts` (30m), `blockedRoads` (2h), `shelters`/`hospitals`/`floodZones`/`safeZones` (6h), `contacts`/`instructions` (permanent).
  - Helpers `getFreshness(category, syncedAt)` returning `fresh`, `stale`, or `very_stale`.
- [x] Created `client/src/components/common/FreshnessNotice.jsx`:
  - Renders explicit visual indicators for cached content; strictly prevents presenting cached data as live conditions.

#### 8. Security & Role Isolation
- [x] Created `client/src/components/common/OfflinePortalGate.jsx`:
  - Mounted in `AppShell.jsx`.
  - When disconnected, responder and administrator consoles render a calm network requirement screen, preventing offline dispatch mutations while keeping citizen access active.
  - Zero admin or responder operational records are stored in client-side IndexedDB.
- [x] Clean session tear-down in `AuthContext.jsx`:
  - Calling `signOut()` triggers `clearUserSessionData()`, purging citizen credentials, route history, and location data while keeping public emergency resources cached.

#### 9. Internationalization (i18n)
- [x] Added full `offline` translation dictionary across English, Telugu, and Hindi in `client/src/i18n/translations.js`.
- [x] Verified 100% key parity via `npm run i18n:check`: 557 leaf keys across all 3 languages, 0 missing keys.

#### 10. Verification & Automated Testing
- [x] Backend Tests (`npm test` in `server`):
  - Created `server/test/offline_bundle.test.js` validating schema aggregation, no credential leakage, and deterministic ETag generation.
  - All 28 server tests passing (16 SMS + 10 Status Guard + 2 Offline Bundle).
- [x] Client Tests (`npm test` in `client`):
  - Created `client/test/offline.test.js` with 13 tests covering IndexedDB schema, session isolation, freshness governance, static content seeding, sync concurrency guards, and health check reachability.
  - 100% passing (13 passed, 0 failed).
- [x] Linting & Production Build:
  - `npm run lint` in `client`: 0 errors.
  - `npm run build` in `client`: built cleanly in 1.97s with 135 precached entries.


