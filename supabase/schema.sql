-- ==============================================================================
-- ResQ Flood Emergency Response Platform: Database Schema
-- Compatible with Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure auth schema exists (default in Supabase; mock fallback if local vanilla pg)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. Enumerated Types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('citizen', 'responder', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sos_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE shelter_status AS ENUM ('open', 'near_capacity', 'full', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE road_status AS ENUM ('impassable', 'waterlogged', 'caution', 'clear');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. SOS Sequence and Identifier Generator (e.g. FQ1024)
CREATE SEQUENCE IF NOT EXISTS sos_id_seq START WITH 1024 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_sos_id()
RETURNS text AS $$
BEGIN
  RETURN 'FQ' || nextval('sos_id_seq')::text;
END;
$$ LANGUAGE plpgsql;

-- 4. Timestamp Automatic Updater
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 5. Core Tables
-- ==============================================================================

-- Table: profiles (Extends auth.users with operational roles & agency details)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'citizen',
  full_name text NOT NULL,
  phone text,
  email text,
  agency_name text, -- e.g. NDRF, GHMC DRF, SDRF
  is_available boolean NOT NULL DEFAULT true,
  current_lat double precision,
  current_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: sos_requests (Distress requests from citizens; deterministic FQ sequence ID)
CREATE TABLE IF NOT EXISTS sos_requests (
  id text PRIMARY KEY DEFAULT generate_sos_id(),
  citizen_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  citizen_name text NOT NULL,
  citizen_phone text NOT NULL,
  priority priority_level NOT NULL DEFAULT 'high',
  status sos_status NOT NULL DEFAULT 'open',
  emergency_type text NOT NULL, -- e.g. 'Trapped in House', 'Medical Emergency', 'Roof Rescue'
  people_count integer NOT NULL DEFAULT 1 CHECK (people_count > 0),
  special_needs text,           -- e.g. 'Elderly, Infant, Diabetic'
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text NOT NULL,
  landmark text,
  assigned_responder_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  responder_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Table: flood_zones (Monitored inundation areas with GeoJSON boundaries)
CREATE TABLE IF NOT EXISTS flood_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code text UNIQUE NOT NULL, -- e.g. 'FZ-HYD-01'
  name text NOT NULL,
  severity severity_level NOT NULL DEFAULT 'medium',
  water_level_meters numeric(4,2) NOT NULL DEFAULT 0.00,
  danger_threshold_meters numeric(4,2) NOT NULL DEFAULT 2.50,
  evacuation_status text NOT NULL DEFAULT 'Monitoring',
  description text,
  boundary_geojson jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: shelters (Designated relief shelters with capacity & occupancy metrics)
CREATE TABLE IF NOT EXISTS shelters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  occupancy integer NOT NULL DEFAULT 0 CHECK (occupancy >= 0),
  status shelter_status NOT NULL DEFAULT 'open',
  contact_person text NOT NULL,
  contact_phone text NOT NULL,
  supplies jsonb NOT NULL DEFAULT '{"food": true, "water": true, "medical": true, "power_backup": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: hospitals (Emergency triage and trauma facilities)
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  emergency_available boolean NOT NULL DEFAULT true,
  icu_beds_available integer NOT NULL DEFAULT 0 CHECK (icu_beds_available >= 0),
  general_beds_available integer NOT NULL DEFAULT 0 CHECK (general_beds_available >= 0),
  ambulance_available boolean NOT NULL DEFAULT true,
  contact_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: blocked_roads (Impassable or waterlogged road segments)
CREATE TABLE IF NOT EXISTS blocked_roads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  road_name text NOT NULL,
  area text NOT NULL,
  status road_status NOT NULL DEFAULT 'impassable',
  severity severity_level NOT NULL DEFAULT 'high',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  reason text NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: alerts (Broadcast emergency warnings issued by command center)
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  severity severity_level NOT NULL DEFAULT 'high',
  affected_areas text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Table: notifications (User-directed alerts and lifecycle updates)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'sos_update',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. Indexes for Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_requests(status);
CREATE INDEX IF NOT EXISTS idx_sos_priority ON sos_requests(priority);
CREATE INDEX IF NOT EXISTS idx_sos_citizen ON sos_requests(citizen_id);
CREATE INDEX IF NOT EXISTS idx_sos_assigned ON sos_requests(assigned_responder_id);
CREATE INDEX IF NOT EXISTS idx_flood_zones_severity ON flood_zones(severity);
CREATE INDEX IF NOT EXISTS idx_shelters_status ON shelters(status);
CREATE INDEX IF NOT EXISTS idx_blocked_roads_status ON blocked_roads(status);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- ==============================================================================
-- 7. Update Triggers
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sos_updated_at ON sos_requests;
CREATE TRIGGER trg_sos_updated_at BEFORE UPDATE ON sos_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_flood_zones_updated_at ON flood_zones;
CREATE TRIGGER trg_flood_zones_updated_at BEFORE UPDATE ON flood_zones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_shelters_updated_at ON shelters;
CREATE TRIGGER trg_shelters_updated_at BEFORE UPDATE ON shelters
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_hospitals_updated_at ON hospitals;
CREATE TRIGGER trg_hospitals_updated_at BEFORE UPDATE ON hospitals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_blocked_roads_updated_at ON blocked_roads;
CREATE TRIGGER trg_blocked_roads_updated_at BEFORE UPDATE ON blocked_roads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. Enable Realtime Publications (Task 6)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sos_requests;
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

ALTER TABLE sos_requests REPLICA IDENTITY FULL;
ALTER TABLE alerts REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
