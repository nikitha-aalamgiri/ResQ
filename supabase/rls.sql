-- ==============================================================================
-- ResQ Flood Emergency Response Platform: Row Level Security (RLS) Policies
-- Matching Access Control Matrix:
--   - Citizen: Own SOS only; read-only public safety resources & alerts
--   - Responder: Open + own-assigned SOS requests; field resource updates
--   - Admin: Full CRUD across all tables
-- ==============================================================================

-- 1. Helper Functions to Check Current Role securely
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_responder()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'responder'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Enable Row Level Security on All Tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE flood_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. Profiles Policies
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Responders can view responder profiles" ON profiles;
CREATE POLICY "Responders can view responder profiles"
ON profiles FOR SELECT
USING (
  is_responder() AND role = 'responder'
);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Admins have full access to profiles"
ON profiles FOR ALL
USING (is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 4. SOS Requests Policies (Mission-Critical Access Control)
-- ==============================================================================

-- Citizen Policies: Own SOS Only
DROP POLICY IF EXISTS "Citizens can view own SOS requests" ON sos_requests;
CREATE POLICY "Citizens can view own SOS requests"
ON sos_requests FOR SELECT
USING (
  citizen_id = auth.uid()
);

DROP POLICY IF EXISTS "Citizens can create own SOS requests" ON sos_requests;
CREATE POLICY "Citizens can create own SOS requests"
ON sos_requests FOR INSERT
WITH CHECK (
  citizen_id = auth.uid() OR citizen_id IS NULL
);

DROP POLICY IF EXISTS "Citizens can cancel or update own open SOS requests" ON sos_requests;
CREATE POLICY "Citizens can cancel or update own open SOS requests"
ON sos_requests FOR UPDATE
USING (citizen_id = auth.uid())
WITH CHECK (citizen_id = auth.uid());

-- Responder Policies: Open + Own-Assigned SOS Requests
DROP POLICY IF EXISTS "Responders can view open or self-assigned SOS requests" ON sos_requests;
CREATE POLICY "Responders can view open or self-assigned SOS requests"
ON sos_requests FOR SELECT
USING (
  is_responder() AND (status = 'open' OR assigned_responder_id = auth.uid())
);

DROP POLICY IF EXISTS "Responders can claim or update assigned SOS requests" ON sos_requests;
CREATE POLICY "Responders can claim or update assigned SOS requests"
ON sos_requests FOR UPDATE
USING (
  is_responder() AND (status = 'open' OR assigned_responder_id = auth.uid())
)
WITH CHECK (
  is_responder() AND (assigned_responder_id = auth.uid() OR status = 'open')
);

-- Admin Policies: Unrestricted Oversight
DROP POLICY IF EXISTS "Admins have full control on SOS requests" ON sos_requests;
CREATE POLICY "Admins have full control on SOS requests"
ON sos_requests FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ==============================================================================
-- 5. Flood Zones Policies (Public Read, Admin Write)
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can view flood zones" ON flood_zones;
CREATE POLICY "Anyone can view flood zones"
ON flood_zones FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage flood zones" ON flood_zones;
CREATE POLICY "Admins can manage flood zones"
ON flood_zones FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ==============================================================================
-- 6. Shelters Policies (Public Read, Responder/Admin Updates)
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can view shelters" ON shelters;
CREATE POLICY "Anyone can view shelters"
ON shelters FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Responders and Admins can update shelter occupancy" ON shelters;
CREATE POLICY "Responders and Admins can update shelter occupancy"
ON shelters FOR UPDATE
USING (is_responder() OR is_admin())
WITH CHECK (is_responder() OR is_admin());

DROP POLICY IF EXISTS "Admins can insert and delete shelters" ON shelters;
CREATE POLICY "Admins can insert and delete shelters"
ON shelters FOR INSERT
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete shelters" ON shelters;
CREATE POLICY "Admins can delete shelters"
ON shelters FOR DELETE
USING (is_admin());

-- ==============================================================================
-- 7. Hospitals Policies (Public Read, Admin Write)
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can view hospitals" ON hospitals;
CREATE POLICY "Anyone can view hospitals"
ON hospitals FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage hospitals" ON hospitals;
CREATE POLICY "Admins can manage hospitals"
ON hospitals FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ==============================================================================
-- 8. Blocked Roads Policies (Public Read, Responders/Admin Manage)
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can view blocked roads" ON blocked_roads;
CREATE POLICY "Anyone can view blocked roads"
ON blocked_roads FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Responders and Admins can report or update blocked roads" ON blocked_roads;
CREATE POLICY "Responders and Admins can report or update blocked roads"
ON blocked_roads FOR ALL
USING (is_responder() OR is_admin())
WITH CHECK (is_responder() OR is_admin());

-- ==============================================================================
-- 9. Alerts Policies (Public Read Active, Admin Manage)
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can view active alerts" ON alerts;
CREATE POLICY "Anyone can view active alerts"
ON alerts FOR SELECT
USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage alerts" ON alerts;
CREATE POLICY "Admins can manage alerts"
ON alerts FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ==============================================================================
-- 10. Notifications Policies (Own Notifications Only, Admin Manage)
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark own notifications as read" ON notifications;
CREATE POLICY "Users can mark own notifications as read"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
CREATE POLICY "Admins can manage all notifications"
ON notifications FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ==============================================================================
-- 11. SOS Status Log Policies
-- ==============================================================================
ALTER TABLE IF EXISTS sos_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens can view status logs of their own SOS" ON sos_status_log;
CREATE POLICY "Citizens can view status logs of their own SOS"
ON sos_status_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sos_requests
    WHERE sos_requests.id = sos_status_log.sos_id
    AND (sos_requests.citizen_id = auth.uid() OR is_responder() OR is_admin())
  )
);

DROP POLICY IF EXISTS "Responders and Admins can create status logs" ON sos_status_log;
CREATE POLICY "Responders and Admins can create status logs"
ON sos_status_log FOR INSERT
WITH CHECK (is_responder() OR is_admin());

