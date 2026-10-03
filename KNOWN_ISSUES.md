# FloodResQ - Known Issues & Operational Considerations

This document provides a transparent, candid audit of current operational constraints, simulation boundaries, and known technical nuances in the FloodResQ disaster management platform as of Step 9.

---

### 1. Public OSRM Driving Engine & Rate Throttling
- **Observation**: The platform connects to the public OSRM demonstration server (`router.project-osrm.org`) for real-time GeoJSON route calculation. During intermittent network latency spikes or upstream public API throttling, requests can exceed 5 seconds.
- **Resilience Mechanism**: The server implements a strict 5-second timeout (`AbortController`) and automatically falls back to curated topological fallback routes in `/data/mock/demo_routes.json` labeled `source: "demo"`.
- **Production Recommendation**: Self-host an internal Dockerized OSRM instance with pre-compiled OpenStreetMap `.osrm` graphs of the target metropolitan region for sub-20ms route computations without external internet dependency.

---

### 2. Offline SOS via Cellular SMS Fallback
- **Observation**: When offline connectivity is detected (`navigator.onLine === false` or simulated offline toggle), the platform provides an emergency SMS link using standard `sms:` URI scheme (`sms:112?body=...`) containing pre-formatted GPS coordinates and distress details.
- **Limitation**: Modern desktop web browsers (Chrome/Firefox on Windows/macOS) do not natively bind the `sms:` URI scheme without an external VoIP or cellular client installed. On Android and iOS mobile devices, it opens the default SMS app with pre-populated dispatch text.
- **Offline Sync**: In tandem with the SMS link, offline SOS requests submitted in the web interface are locally queued in IndexedDB/localStorage and automatically synchronized with the SEOC dispatch server once the network is restored.

---

### 3. Leaflet Draw Touch Precision on Compact Mobile Devices (< 360px)
- **Observation**: The Leaflet Draw control (`leaflet-draw`) on the Admin **"Broadcast Alerts"** map allows commanders to trace custom polygon boundaries. On ultra-compact mobile viewports (< 360px), drawing polygon vertices with finger touches can sometimes trigger map panning.
- **Workaround**: Zooming in slightly prior to tapping vertex points improves polygon boundary precision. Default rectangular/circular hazard boundary presets can be added for quick single-tap mobilization.

---

### 4. Realtime Broadcast Fallback in Local / Air-Gapped Environments
- **Observation**: When executing locally without an active cloud Supabase WebSocket connection (`VITE_SUPABASE_URL` pointing to localhost or placeholder), WebSocket push notifications do not originate from a cloud server.
- **Resilience Mechanism**: ResQ includes an in-memory `BroadcastChannel` and event emitter fallback (`lib/broadcast.js`) that mirrors every dispatch event (`SOS_CREATED`, `STATUS_UPDATED`, `ALERT_PUBLISHED`, `SUPPORT_REQUESTED`, `HAZARD_REPORT_SUBMITTED`, `SHELTER_INCREMENTED`) across all open browser windows and tabs with 0ms latency.
- **Production Recommendation**: Deploy Supabase Realtime server with Postgres Logical Replication (`supabase_realtime` publication) enabled on production AWS/GCP clusters.

---

### 5. Multi-Language Chrome vs Alert Content (Urdu Scope)
- **Observation**: In accordance with Step 8 specifications, complete UI translation (`LangContext`) covers **English (en)**, **Telugu (te)**, and **Hindi (hi)**, paired with `Noto Sans Telugu` and `Noto Sans Devanagari` web font fallbacks.
- **Urdu Implementation**: **Urdu (ur)** is intentionally scoped exclusively to the Emergency Broadcast Alert text messages and renders in a specialized Right-to-Left (RTL) typography container (`dir="rtl"`), rather than localizing the underlying administrative dashboard UI chrome.

---

### 6. Geolocation Accuracy & Browser Permissions
- **Observation**: The browser Geolocation API (`navigator.geolocation.getCurrentPosition`) returns high accuracy on mobile devices equipped with GPS chipsets, but on desktop PCs without GPS, coordinates may resolve to the nearest ISP gateway.
- **Platform Behavior**: If geolocation permission is declined or times out, the platform defaults gracefully to the central Musi River basin coordinates (`17.3750° N, 78.4867° E`) and provides manual address search and coordinate pin adjustment on the interactive Leaflet map.

---

### 7. Dynamic Hazard Routing LineString Approximation
- **Observation**: When a citizen or responder reports a road hazard with a single GPS point, the system approximates the blocked road segment as a 200-meter directional bounding LineString centered on the incident coordinates to allow Turf.js intersection checks.
- **Refinement**: In production with municipal GIS data, the backend can snap the point to the nearest OSM highway segment ID using OSRM's `/nearest` API and blacklist the exact road edge ID in the routing graph.
