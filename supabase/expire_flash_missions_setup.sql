-- ==============================================================================
-- PIGGY APP — Flash Missions Auto-Deactivation Setup (Expiration & Purchase)
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Function to enforce business rules on user_flash_missions rows:
--    a) If is_purchased is TRUE -> is_active MUST BE FALSE.
--    b) If current time is past expiration -> is_active MUST BE FALSE.
CREATE OR REPLACE FUNCTION public.sync_flash_mission_status()
RETURNS TRIGGER AS $$
DECLARE
  v_base_time TIMESTAMP WITH TIME ZONE;
  v_duration_hours INTEGER;
  v_expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Rule 1: Purchased missions can never remain active
  IF NEW.is_purchased = TRUE THEN
    NEW.is_active := FALSE;
  END IF;

  -- Rule 2: If is_active is set to TRUE, verify if it is already expired
  IF NEW.is_active = TRUE THEN
    v_base_time := COALESCE(NEW.scheduled_at, NEW.activated_at, NEW.created_at, NOW());
    v_duration_hours := COALESCE(NEW.duration_hours, 72);
    v_expiry_time := v_base_time + (v_duration_hours * INTERVAL '1 hour');

    IF NOW() >= v_expiry_time THEN
      NEW.is_active := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach Trigger to user_flash_missions BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trg_sync_flash_mission_status ON public.user_flash_missions;
CREATE TRIGGER trg_sync_flash_mission_status
  BEFORE INSERT OR UPDATE ON public.user_flash_missions
  FOR EACH ROW EXECUTE FUNCTION public.sync_flash_mission_status();

-- 3. Stored Procedure (RPC) to deactivate all outdated / purchased flash missions in bulk
CREATE OR REPLACE FUNCTION public.expire_outdated_flash_missions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_template_record RECORD;
BEGIN
  -- A) Deactivate templates (user_id IS NULL) that have expired
  FOR v_template_record IN
    SELECT id FROM public.user_flash_missions
    WHERE user_id IS NULL
      AND is_active = TRUE
      AND (
        (COALESCE(scheduled_at, activated_at, created_at) + (COALESCE(duration_hours, 72) * INTERVAL '1 hour')) <= NOW()
      )
  LOOP
    -- Deactivate template
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE id = v_template_record.id;

    -- Deactivate all user copies associated with this template campaign
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE campaign_id = v_template_record.id AND is_active = TRUE;
  END LOOP;

  -- B) Deactivate any user missions that have expired or been purchased
  WITH expired_rows AS (
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND (
        is_purchased = TRUE
        OR (
          (COALESCE(scheduled_at, activated_at, created_at) + (COALESCE(duration_hours, 72) * INTERVAL '1 hour')) <= NOW()
        )
      )
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM expired_rows;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permissions on the RPC function
GRANT EXECUTE ON FUNCTION public.expire_outdated_flash_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_outdated_flash_missions() TO anon;
GRANT EXECUTE ON FUNCTION public.expire_outdated_flash_missions() TO service_role;

-- 5. Run immediate cleanup on all current records in user_flash_missions
SELECT public.expire_outdated_flash_missions() AS deactivated_missions_count;

-- 6. Optional: If pg_cron extension is enabled on your Supabase instance,
--    you can schedule this to run automatically in background every minute:
--
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
--     PERFORM cron.schedule(
--       'expire-flash-missions-job',
--       '* * * * *',
--       'SELECT public.expire_outdated_flash_missions();'
--     );
--   END IF;
-- EXCEPTION WHEN others THEN
--   -- pg_cron not installed or insufficient permissions, safe to ignore
-- END $$;
