-- ==============================================================================
-- Migration: 003_sms_support.sql
-- Description: Adds outbound SMS lifecycle tracking, profile verification flags,
--              sms_logs audit table, deduplication indexes, and RLS policies.
-- ==============================================================================

-- 1. Extend profiles table with phone verification and SMS preference
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT true;

-- 2. Create sms_logs audit table
-- Note: sos_id is text REFERENCES sos_requests(id) matching the FQ{sequence} text primary key
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sos_id text REFERENCES sos_requests(id) ON DELETE SET NULL,
  phone_masked text NOT NULL,
  event_type text NOT NULL,
  provider text NOT NULL,
  provider_request_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_code text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- 3. Indexes for lookup and rate limiting
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sos_id ON sms_logs(sos_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at_desc ON sms_logs(created_at DESC);

-- Unique index to prevent duplicate pending/sent SMS for the same SOS and event
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_logs_unique_pending_sent 
  ON sms_logs(sos_id, event_type) 
  WHERE status IN ('pending', 'sent');

-- 4. Row Level Security (RLS)
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Citizens can only view their own SMS logs
DROP POLICY IF EXISTS "Citizens can view own sms logs" ON sms_logs;
CREATE POLICY "Citizens can view own sms logs"
  ON sms_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all SMS logs across all incidents
DROP POLICY IF EXISTS "Admins have full read access to sms logs" ON sms_logs;
CREATE POLICY "Admins have full read access to sms logs"
  ON sms_logs FOR SELECT
  USING (is_admin());

-- Note: No client INSERT, UPDATE, or DELETE policies are granted.
-- Backend operations are strictly performed via the backend service role.

-- 5. Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sms_logs;
  END IF;
END $$;

ALTER TABLE sms_logs REPLICA IDENTITY FULL;
