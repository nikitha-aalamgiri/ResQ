-- ==============================================================================
-- Migration: 004_status_guard.sql
-- Description: Enforces strict state machine transitions on sos_requests via 
--              PostgreSQL trigger and locks down RLS so clients cannot directly 
--              mutate status or insert status logs.
-- ==============================================================================

-- 1. Function and Trigger to Guard Status Transitions
CREATE OR REPLACE FUNCTION guard_sos_status_transition()
RETURNS trigger AS $$
DECLARE
  old_stat text;
  new_stat text;
BEGIN
  -- Normalize to upper case
  old_stat := UPPER(OLD.status::text);
  new_stat := UPPER(NEW.status::text);

  -- If status is not changing, allow update (e.g. updating notes, photo, etc.)
  IF old_stat = new_stat THEN
    RETURN NEW;
  END IF;

  -- Disallow any transition out of resolved/RESOLVED
  IF old_stat IN ('RESOLVED', 'CLOSED') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Incident % is already RESOLVED and cannot be updated.', OLD.id;
  END IF;

  -- Validate strict sequential progression:
  -- WAITING (or open) -> ACCEPTED (or assigned)
  IF (old_stat IN ('WAITING', 'OPEN')) AND (new_stat IN ('ACCEPTED', 'ASSIGNED')) THEN
    RETURN NEW;
  END IF;

  -- ACCEPTED (or assigned) -> ON_THE_WAY (or in_progress)
  IF (old_stat IN ('ACCEPTED', 'ASSIGNED')) AND (new_stat IN ('ON_THE_WAY', 'IN_PROGRESS')) THEN
    RETURN NEW;
  END IF;

  -- ON_THE_WAY (or in_progress) -> ARRIVED
  IF (old_stat IN ('ON_THE_WAY', 'IN_PROGRESS')) AND (new_stat = 'ARRIVED') THEN
    RETURN NEW;
  END IF;

  -- ARRIVED -> RESCUED
  IF (old_stat = 'ARRIVED') AND (new_stat = 'RESCUED') THEN
    RETURN NEW;
  END IF;

  -- RESCUED -> RESOLVED
  IF (old_stat = 'RESCUED') AND (new_stat IN ('RESOLVED', 'CLOSED')) THEN
    RETURN NEW;
  END IF;

  -- All other transitions (skipping steps, backward transitions, unexpected states) are strictly rejected
  RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition status from % to % on SOS incident %', old_stat, new_stat, OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_sos_status ON sos_requests;
CREATE TRIGGER trg_guard_sos_status
  BEFORE UPDATE OF status ON sos_requests
  FOR EACH ROW
  EXECUTE FUNCTION guard_sos_status_transition();

-- 2. Restrict Row Level Security (RLS) on sos_requests:
-- Revoke all client UPDATE policies that could allow modifying status directly.
-- Clients must invoke the backend API (which operates via service role).
DROP POLICY IF EXISTS "Citizens can cancel or update own open SOS requests" ON sos_requests;
DROP POLICY IF EXISTS "Responders can claim or update assigned SOS requests" ON sos_requests;
DROP POLICY IF EXISTS "Admins have full control on SOS requests" ON sos_requests;

-- Citizens can only view their own SOS requests
DROP POLICY IF EXISTS "Citizens can view own SOS requests" ON sos_requests;
CREATE POLICY "Citizens can view own SOS requests"
  ON sos_requests FOR SELECT
  USING (citizen_id = auth.uid());

-- Responders can view open/waiting or assigned requests
DROP POLICY IF EXISTS "Responders can view open or self-assigned SOS requests" ON sos_requests;
CREATE POLICY "Responders can view open or self-assigned SOS requests"
  ON sos_requests FOR SELECT
  USING (is_responder() AND (status::text IN ('open', 'WAITING') OR assigned_responder_id = auth.uid()));

-- Admins can view all SOS requests
DROP POLICY IF EXISTS "Admins have full read access to SOS requests" ON sos_requests;
CREATE POLICY "Admins have full read access to SOS requests"
  ON sos_requests FOR SELECT
  USING (is_admin());

-- 3. Restrict Row Level Security (RLS) on sos_status_log:
-- Revoke client direct insert policy.
DROP POLICY IF EXISTS "Responders and Admins can create status logs" ON sos_status_log;

-- Citizens can view status logs of their own SOS only
DROP POLICY IF EXISTS "Citizens can view status logs of their own SOS" ON sos_status_log;
CREATE POLICY "Citizens can view status logs of their own SOS"
  ON sos_status_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sos_requests
      WHERE sos_requests.id = sos_status_log.sos_id
      AND sos_requests.citizen_id = auth.uid()
    )
  );

-- Responders and Admins can view all status logs
DROP POLICY IF EXISTS "Responders and Admins can view status logs" ON sos_status_log;
CREATE POLICY "Responders and Admins can view status logs"
  ON sos_status_log FOR SELECT
  USING (is_responder() OR is_admin());
