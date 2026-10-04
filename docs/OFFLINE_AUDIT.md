# FloodResQ Offline-First Architecture Audit (Phase 1 Foundation)

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-04  
**Author:** AI Agentic Engineer (Antigravity)  
**Target:** Phase 1 of 3 (Offline-First Emergency Architecture)

---

## 1. Executive Summary & Audit Objectives

Phase 1 establishes the rock-solid offline foundation for FloodResQ. During catastrophic flooding in metropolitan Hyderabad, terrestrial cellular cell towers and optical fiber links experience grid power outages and physical infrastructure damage. The application must guarantee that citizens can access critical survival information (shelters, safe high-ground zones, emergency helplines, blocked transit corridors, and flood safety instructions) even with zero network connectivity.

This audit inspects the current repository state across all layers—routing, authentication, APIs, service worker, client caching, map rendering, internationalization, and operational consoles—to establish a clear demarcation of what will be **reused**, **replaced**, and **extended**.

---

## 2. Current Architecture & Baseline Inspection

### 2.1 Current Routing & Navigation
- **Routing Engine**: React Router v7 (`react-router-dom`) with `BrowserRouter` in `client/src/App.jsx`.
- **Portals**:
  - **Public**: `/login`, `/register`, `/responder/login`, `/admin/login`, `/` (Root redirector).
  - **Citizen Portal (`/citizen/*`)**: `/citizen/dashboard`, `/citizen/map`, `/citizen/sos`, `/citizen/sos/:id`, `/citizen/route`, `/citizen/shelters`, `/citizen/alerts`, `/citizen/contacts`, `/citizen/profile`, `/citizen/more`.
  - **Responder Portal (`/responder/*`)**: `/responder/dashboard`, `/responder/triage`, `/responder/tasks`, `/responder/support`, `/responder/messages`, `/responder/reports`, `/responder/resources`, `/responder/profile`, `/responder/incidents/:id`, `/responder/incidents/:id/update`, `/responder/incidents/:id/navigate`, `/responder/map`, `/responder/shelters`.
  - **Admin Command Portal (`/admin/*`)**: `/admin/dashboard`, `/admin/map`, `/admin/dispatch`, `/admin/incidents/:id`, `/admin/zones`, `/admin/shelters`, `/admin/responders`, `/admin/resources`, `/admin/analytics`, `/admin/users`, `/admin/settings`, `/admin/reports`, `/admin/demo`.
- **Layout Shell**: `AppShell.jsx` wraps authenticated portal views, rendering responsive top navigation, desktop side drawers for responders/admins, and a sticky bottom tab bar for mobile citizens.

### 2.2 Authentication & Session Handling
- **Provider**: `client/src/context/AuthContext.jsx` manages active user credentials and user roles (`citizen`, `responder`, `admin`).
- **Session Persistence**: Sessions persist in `localStorage` (`resq_user`, `resq_session`, `resq_role`) and Supabase Auth client session store.
- **Route Guard**: `client/src/routes/ProtectedRoute.jsx` intercepts unauthorized access and redirects to designated role dashboards or login views.
- **Offline Security Consideration**: In offline mode, the cached SPA shell must not leak or display stale administrative or responder operational data. Unauthenticated or disconnected responder/admin access must render a calm network requirement screen while keeping citizen safety data accessible.

### 2.3 API and Supabase Usage
- **REST Endpoints (`server/src/index.js`)**: Express backend providing `/api/health`, `/api/sos`, `/api/shelters`, `/api/alerts`, `/api/mock/*`, `/api/me/profile`.
- **Supabase Integration**:
  - PostgreSQL database backing core operational entities: `profiles`, `sos_requests`, `sos_status_log`, `flood_zones`, `shelters`, `hospitals`, `blocked_roads`, `alerts`, `sms_logs`.
  - Client-side Supabase client (`client/src/lib/supabaseClient.js`) handles Realtime broadcast channels (`onSOSEvent`).
- **Current Offline Limitation**: Direct API requests fail ungracefully when network connectivity drops, relying on partial local fallbacks in specific components.

### 2.4 Existing PWA & Service Worker Configuration
- **Plugin**: `vite-plugin-pwa` configured in `client/vite.config.js`.
- **Current Mode**: `registerType: 'autoUpdate'`.
- **Workbox Configuration**:
  - Precache: `**/*.{js,css,html,ico,png,svg,json}`.
  - Runtime Caching:
    1. Map tiles (`tile.openstreetmap.org`, `arcgisonline.com`, `maptiler.com`, `stadiamaps.com`) cached via `CacheFirst` (max 600 entries, 7-day TTL).
    2. API routes (`/api/(shelters|overview).*`) cached via `NetworkFirst` (max 50 entries, 24-hour TTL).
- **Audit Finding**: Caching authenticated `/api/` endpoints via Workbox violates strict data isolation rules and risks serving stale/invalid tokens. The prompt strictly instructs that Workbox must **NOT** cache authenticated API responses; IndexedDB must manage offline application data explicitly.
- **Fonts**: `client/index.html` loads Inter, JetBrains Mono, Noto Sans Telugu, and Noto Sans Devanagari from Google Fonts CDN (`fonts.googleapis.com`). This fails completely when offline.

### 2.5 Existing LocalStorage & Offline Code
- **Module**: `client/src/lib/offlineStore.js`.
- **Implementation**: Uses `localStorage` with keys `resq_cache_shelters`, `resq_cache_zones`, `resq_cache_contacts`, `resq_offline_sos_queue`.
- **Storage Constraints**: `localStorage` is synchronous, limited to ~5MB, blocked on the main thread, and lacks indexed query capabilities needed for geospatial filtering and spatial lookups.
- **SMS Fallback**: `generateSmsLink()` produces `sms:112?body=...` formatted emergency distress text with GPS coordinates, people count, and medical flags.
- **Audit Finding**: Existing `localStorage` data structures must be migrated to a structured IndexedDB database powered by Dexie, supporting atomic transactions, schema migrations, and per-category metadata.

### 2.6 Map Implementation
- **Configuration**: `client/src/lib/mapConfig.jsx` defines tile providers (OpenStreetMap, Esri World Light Gray) and metropolitan bounds for Hyderabad (`HYDERABAD_BOUNDS`).
- **Component**: `client/src/components/map/FloodMap.jsx` using `react-leaflet`.
- **Markers & Layers**: Custom Lucide SVG dynamic badges for shelters, hospitals, SOS requests, rescue units, and dashed polylines for blocked roads. Soft fills for flood hazard zones.
- **Map Tile Caching**: Workbox `map-tiles-cache` successfully retains viewed raster tiles up to 600 tiles (7-day TTL). Map tile prefetching must remain bounded to viewed tiles to avoid browser quota exhaustion.

### 2.7 Internationalization (i18n) Setup
- **Context**: `client/src/context/LangContext.jsx` with `useLang()`.
- **Dictionary**: `client/src/i18n/translations.js`.
- **Coverage**: English (`en`), Telugu (`te`), and Hindi (`hi`).
- **Parity**: Validated by `npm run i18n:check` with 472 leaf keys and 100% trilingual key parity.

### 2.8 Portal-by-Portal Offline Behavior
- **Citizen Portal**: Needs full read capability for shelters, safe zones, hospitals, emergency contacts, safety instructions, and recent alerts. Needs "Prepare for Offline" UI and clear freshness indicators.
- **Responder Portal**: High-privilege operational data cannot be cached safely on untrusted devices. Disconnected state must render a calm network required message with retry and citizen redirect.
- **Admin Portal**: SEOC administrative terminal requires live server authority. Disconnected state must render the network required message.

---

## 3. Reuse, Replace, and Extend Strategy

| Subsystem | Action | Implementation Details |
| :--- | :--- | :--- |
| **PWA Manifest & Icons** | **Extend** | Update manifest with `FloodResQ`, `#0F1F3D` theme, `#F6F7FB` background, standalone mode, start_url `/`. Generate PNG wordmark icons (192, 512, maskable). |
| **Service Worker** | **Replace** | Switch `registerType` to `'prompt'`, add user-facing update toast, remove `/api/` runtime caching, add dev toggle flag (`VITE_SW_DEV`), maintain map tile cache (max 600, 7 days). |
| **Typography & Fonts** | **Replace** | Remove external Google Fonts links from `index.html`. Install `@fontsource/inter`, `@fontsource/jetbrains-mono`, `@fontsource/noto-sans-telugu`, `@fontsource/noto-sans-devanagari` as local npm packages imported in `main.jsx` and precached. |
| **Connection Monitor** | **Replace** | Replace naive `navigator.onLine` checks with `ConnectionContext` + `useConnection()` hook. Implement active reachability heartbeat (`GET /api/health` with 3s timeout) triggered on online events, window focus, and 30s interval. |
| **Connection Banner** | **Replace** | Replace crude banner in `AppShell` with dedicated `ConnectionBanner.jsx` displaying synchronized green chip, offline orange warning with last-sync time, and reconnecting synchronization notice. |
| **Client Storage** | **Replace** | Replace `localStorage` with Dexie-backed IndexedDB (`client/src/offline/db.js`) featuring 12 versioned tables: `shelters`, `hospitals`, `floodZones`, `safeZones`, `blockedRoads`, `contacts`, `alerts`, `instructions`, `routes`, `mySos`, `sosQueue`, `hazardQueue`, `meta`. |
| **Static Content** | **New** | Create `client/src/offline/staticContent.js` containing bundled emergency contacts and flood safety procedures across English, Telugu, and Hindi for immediate zero-network availability. |
| **Backend Bundle API** | **New** | Implement `GET /api/offline/bundle?lat=&lng=&radius_km=` in `server/src/index.js` returning all public emergency datasets, timestamps, and ETag/If-None-Match 304 caching. |
| **Offline Preparation** | **New** | Create `client/src/offline/syncService.js` with Web Locks concurrency guard (`navigator.locks`), backoff retries, and transactional writes. Build "Prepare for Offline" UI card with step-by-step checklist. |
| **Data Freshness** | **New** | Build `client/src/offline/freshness.js` with category thresholds (30m, 2h, 6h, static) and `FreshnessNotice.jsx` component. Eliminate deceptive "live" terminology on cached records. |
| **Security Gates** | **Extend** | Enforce network connection requirement panel for responder and admin routes while offline. Flush non-essential user session data on logout while retaining public safety data. |

---

## 4. Baseline Metrics & Git Checkpoint

- **Git Commit Checkpoint**: `1e3f4b0` (HEAD on `main`)
- **Working Tree**: Clean (`git status`: 0 modified, 0 untracked)
- **Client Lint**: 0 errors, 461 warnings (`npm run lint` in `client`)
- **i18n Coverage**: 472 keys, 100% trilingual parity across `en`, `te`, `hi` (`npm run i18n:check`)
- **Server Automated Tests**: 26 passed, 0 failed across `sms.test.js` and `status_guard.test.js` (`npm test` in `server`)
- **Client Production Build**: Succeeded cleanly in 1.60s (`npm run build` in `client`)
