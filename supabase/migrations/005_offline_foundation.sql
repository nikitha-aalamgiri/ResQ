-- ==============================================================================
-- Migration: 005_offline_foundation.sql
-- Description: Offline foundation schema extensions:
--              1. Ensure hospitals.phone column exists and aliases contact_phone.
--              2. Dedicated safe_zones table for non-inundated relief staging.
--              3. Automated updated_at triggers across emergency datasets.
--              4. RLS policies allowing public/authenticated read for offline bundle.
--              5. Seed data for safe zones.
-- ==============================================================================

-- 1. Ensure hospitals.phone exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'phone'
  ) THEN
    ALTER TABLE hospitals ADD COLUMN phone text;
    UPDATE hospitals SET phone = contact_phone WHERE phone IS NULL;
  END IF;
END $$;

-- Ensure hospitals.emergency_available has proper default
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'emergency_available'
  ) THEN
    ALTER TABLE hospitals ADD COLUMN emergency_available boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 2. Dedicated Table: safe_zones (High-ground safe sectors and elevated assembly points)
CREATE TABLE IF NOT EXISTS safe_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  elevation_meters numeric(6,2) DEFAULT 540.00,
  capacity integer DEFAULT 1000,
  area text NOT NULL,
  geometry jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for safe_zones
CREATE INDEX IF NOT EXISTS idx_safe_zones_area ON safe_zones(area);

-- 3. Automated updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_safe_zones_updated_at'
  ) THEN
    CREATE TRIGGER trg_safe_zones_updated_at
      BEFORE UPDATE ON safe_zones
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_shelters_updated_at'
  ) THEN
    CREATE TRIGGER trg_shelters_updated_at
      BEFORE UPDATE ON shelters
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_hospitals_updated_at'
  ) THEN
    CREATE TRIGGER trg_hospitals_updated_at
      BEFORE UPDATE ON hospitals
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_blocked_roads_updated_at'
  ) THEN
    CREATE TRIGGER trg_blocked_roads_updated_at
      BEFORE UPDATE ON blocked_roads
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_flood_zones_updated_at'
  ) THEN
    CREATE TRIGGER trg_flood_zones_updated_at
      BEFORE UPDATE ON flood_zones
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 4. Enable Row Level Security (RLS) on safe_zones
ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to safe zones" ON safe_zones;
CREATE POLICY "Public read access to safe zones"
  ON safe_zones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can modify safe zones" ON safe_zones;
CREATE POLICY "Admins can modify safe zones"
  ON safe_zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. Seed Initial Hyderabad Safe Zones
INSERT INTO safe_zones (id, name, elevation_meters, capacity, area, geometry, description)
VALUES 
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Jubilee Hills Plateau Safe Sector',
    585.00,
    3500,
    'Jubilee Hills',
    '{
      "type": "Polygon",
      "coordinates": [[
        [78.4050, 17.4300],
        [78.4180, 17.4320],
        [78.4220, 17.4410],
        [78.4120, 17.4450],
        [78.4010, 17.4380],
        [78.4050, 17.4300]
      ]]
    }'::jsonb,
    'High elevation rocky terrain naturally immune to riverine flooding and urban flash inundation.'
  ),
  (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'Banjara Hills High Ground Assembly Point',
    570.00,
    2500,
    'Banjara Hills',
    '{
      "type": "Polygon",
      "coordinates": [[
        [78.4350, 17.4120],
        [78.4480, 17.4150],
        [78.4510, 17.4240],
        [78.4420, 17.4280],
        [78.4310, 17.4200],
        [78.4350, 17.4120]
      ]]
    }'::jsonb,
    'Elevated ridge sector designated for civilian assembly and emergency helicopter staging.'
  ),
  (
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'Hitec City Cyber Towers Safe Basin Corridor',
    555.00,
    4000,
    'Madhapur / Hitec City',
    '{
      "type": "Polygon",
      "coordinates": [[
        [78.3750, 17.4450],
        [78.3880, 17.4480],
        [78.3940, 17.4580],
        [78.3840, 17.4610],
        [78.3710, 17.4540],
        [78.3750, 17.4450]
      ]]
    }'::jsonb,
    'Commercial grade elevated campus with dedicated stormwater retention and uninterrupted backup generators.'
  )
ON CONFLICT (id) DO NOTHING;
