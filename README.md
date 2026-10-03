# ResQ: Flood Emergency Response Platform

ResQ is an operational, mission-critical flood emergency response platform engineered for rapid civilian distress routing, multi-agency field rescue triage (NDRF, GHMC DRF, SDRF), and live situational awareness during severe urban inundation events.

> **Operational Sector**: Hyderabad, Telangana, India (Simulation Drill Area)  
> **Simulation Disclaimer**: All geospatial boundaries, civilian records, responder profiles, and road obstruction data are mock/demo entities generated solely for testing, drills, and architectural validation.

---

## 1. Monorepo Architecture & Folder Structure

```
ResQ/
├── client/                     # Vite + React 19 + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/             # Core UI Design System (Button, Card, Badge, Toast, Modal)
│   │   ├── lib/
│   │   │   └── supabase.js     # Supabase browser client initialization
│   │   ├── App.jsx             # Operations Console & Verification Testbed
│   │   ├── main.jsx            # React root entry point
│   │   └── index.css           # Tailwind base directives & Inter typography
│   ├── index.html              # HTML shell with Inter & JetBrains Mono font preconnects
│   ├── tailwind.config.js      # Palette tokens & severity scales matching DESIGN.md
│   ├── postcss.config.js       # PostCSS Tailwind plugins
│   ├── vite.config.js          # Vite configuration
│   ├── .env.example            # Client environment template
│   └── package.json            # Client dependencies (React, Tailwind, Lucide, Supabase-js)
│
├── server/                     # Node.js + Express (ES Modules) API Service
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js     # Supabase backend client (service role)
│   │   └── index.js            # Express API server & mock telemetry endpoints
│   ├── .env.example            # Server environment template
│   └── package.json            # Server dependencies (Express, CORS, Dotenv, Supabase-js)
│
├── supabase/                   # Supabase PostgreSQL Database Layer
│   ├── schema.sql              # DDL schema: enums, sequence, tables, updated_at triggers, Realtime
│   ├── rls.sql                 # Row Level Security policies (Citizen, Responder, Admin)
│   └── seed.sql                # Hyderabad demo data (1 Admin, 3 Responders, 3 Citizens, 6 Zones, etc.)
│
├── data/
│   └── mock/                   # Static GeoJSON Assets
│       ├── flood_zones.geojson # 6 polygon flood zones (critical, high, medium, low)
│       ├── shelters.geojson    # 5 relief shelters with capacity and occupancy
│       └── blocked_roads.geojson # 3 blocked roads with obstruction telemetry
│
├── DESIGN.md                   # Permanent rule for visual palette, typography, and styling
├── ASSUMPTIONS.md              # Log of all engineering decisions and assumptions
├── PROJECT_CONTEXT.md          # High-level system context and demo loop definition
├── .env.example                # Root environment template
├── .gitignore                  # Root Git ignore rules
└── package.json                # Monorepo root workspace orchestrator
```

---

## 2. Prerequisites

- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **npm**: v9.0.0 or higher
- **Supabase**: Hosted Supabase project or local Supabase CLI instance

---

## 3. Environment Configuration

1. Copy `.env.example` in both `client` and `server`:
   ```bash
   # Client Configuration
   cp client/.env.example client/.env

   # Server Configuration
   cp server/.env.example server/.env
   ```

2. Fill in your Supabase credentials:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://xyzcompany.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Supabase Public Anonymous Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (kept strictly on server)

---

## 4. Database Setup (Supabase)

To initialize the database in your Supabase project (via Supabase Web SQL Editor or Supabase CLI):

1. **Run Table Schemas & Sequences**:
   Execute the contents of `supabase/schema.sql`.
   - Creates enums (`user_role`, `severity_level`, `priority_level`, `sos_status`, `shelter_status`, `road_status`).
   - Creates `sos_id_seq` sequence and generator function returning format `FQ1024`.
   - Creates tables: `profiles`, `sos_requests`, `flood_zones`, `shelters`, `hospitals`, `blocked_roads`, `alerts`, `notifications`.
   - Enables PostgreSQL logical replication on `sos_requests`, `alerts`, `notifications`.

2. **Apply Row Level Security (RLS)**:
   Execute the contents of `supabase/rls.sql`.
   - **Citizen**: Can view and create own SOS requests only (`citizen_id = auth.uid()`). Read-only access to public safety layers (zones, shelters, hospitals, blocked roads).
   - **Responder**: Can view `open` unassigned SOS requests and incidents assigned to themselves. Can claim and update incident progress.
   - **Admin**: Full administrative CRUD across all tables.

3. **Populate Demo Seed Data**:
   Execute the contents of `supabase/seed.sql`.
   - Seeds 1 Admin, 3 Responders (NDRF, GHMC DRF, SDRF), and 3 Citizens.
   - Seeds 6 flood zones in Hyderabad (Musi River, Begumpet Nala, Tolichowki, Saroornagar, Alwal, Hitec City).
   - Seeds 5 shelters with live capacity and occupancy metrics.
   - Seeds 3 trauma hospitals and 3 impassable road blockages.
   - Seeds 5 sample SOS requests (`FQ1024` to `FQ1028`) with varied triage priorities.

---

## 5. Running the Application

### Option A: From Repository Root
```bash
# Start Client Dev Server (http://localhost:5173)
npm run dev:client

# In a separate terminal, start Server (http://localhost:5000)
npm run dev:server
```

### Option B: Running Services Individually

#### Client (Vite + React)
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Server (Express ES Modules)
```bash
cd server
npm install
npm run dev
```
Server runs on [http://localhost:5000](http://localhost:5000).  
Health check endpoint: `http://localhost:5000/api/health`  
Mock overview endpoint: `http://localhost:5000/api/mock/overview`

---

## 6. Design System Compliance

ResQ strictly follows [`DESIGN.md`](./DESIGN.md) across all components:
- **Palette**: Ink Navy (`#0F2A3D`), Deep Teal (`#1F6F78`), Teal Light (`#E6F1F2`), Background (`#F7F5F1`), Surface (`#FFFFFF`), Border (`#E2DED6`), Muted Text (`#5B6770`).
- **Muted Severity Tokens**: Critical (`#B42318`), High (`#B54708`), Medium (`#A16207`), Low/Safe (`#3B7A57`).
- **Single Permitted Gradient**: `linear-gradient(135deg, #0F2A3D 0%, #1F6F78 100%)` strictly limited to the top app bar and login hero.
- **Typography**: Inter for interface text, JetBrains Mono for incident IDs (`FQ1024`) and telemetry numerals.
- **Form Factor**: 1px borders, 6-8px border radius, 8px grid, solid tactile buttons, and no emojis.