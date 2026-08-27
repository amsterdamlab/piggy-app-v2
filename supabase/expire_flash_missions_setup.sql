-- ==============================================================================
-- PIGGY APP — Clean & Remove Obsolete Columns (duration_hours, activated_at)
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Drop obsolete columns from user_flash_missions
ALTER TABLE public.user_flash_missions DROP COLUMN IF EXISTS duration_hours;
ALTER TABLE public.user_flash_missions DROP COLUMN IF EXISTS activated_at;

-- 2. Update Template Replication Trigger Function (clean without dropped columns)
CREATE OR REPLACE FUNCTION public.process_consolidated_flash_mission()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_template_id UUID;
BEGIN
  IF NEW.user_id IS NULL THEN
    v_template_id := NEW.id;

    -- CASE A: Template is activated
    IF NEW.is_active = TRUE AND (TG_OP = 'INSERT' OR OLD.is_active = FALSE) THEN
      FOR v_profile IN SELECT id FROM public.profiles LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.user_flash_missions
          WHERE user_id = v_profile.id AND campaign_id = v_template_id AND is_purchased = FALSE
        ) THEN
          INSERT INTO public.user_flash_missions (
            user_id,
            campaign_id,
            mission_title,
            title,
            description,
            icon,
            piggy_type,
            price,
            is_active,
            scheduled_at
          ) VALUES (
            v_profile.id,
            v_template_id,
            COALESCE(NEW.mission_title, 'MISIÓN FLASH'),
            NEW.title,
            NEW.description,
            COALESCE(NEW.icon, '⚡'),
            NEW.piggy_type,
            NEW.price,
            TRUE,
            NEW.scheduled_at
          );
        END IF;
      END LOOP;

    -- CASE B: Template is deactivated
    ELSIF NEW.is_active = FALSE AND (TG_OP = 'UPDATE' AND OLD.is_active = TRUE) THEN
      UPDATE public.user_flash_missions
      SET is_active = FALSE
      WHERE campaign_id = v_template_id AND is_purchased = FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update New User Registration Trigger Function (clean without dropped columns)
CREATE OR REPLACE FUNCTION public.assign_active_flash_missions_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_template RECORD;
BEGIN
  FOR v_template IN 
    SELECT * FROM public.user_flash_missions 
    WHERE user_id IS NULL AND is_active = TRUE AND (scheduled_at IS NULL OR NOW() < scheduled_at)
  LOOP
    INSERT INTO public.user_flash_missions (
      user_id,
      campaign_id,
      mission_title,
      title,
      description,
      icon,
      piggy_type,
      price,
      is_active,
      scheduled_at
    ) VALUES (
      NEW.id,
      v_template.id,
      COALESCE(v_template.mission_title, 'MISIÓN FLASH'),
      v_template.title,
      v_template.description,
      COALESCE(v_template.icon, '⚡'),
      v_template.piggy_type,
      v_template.price,
      TRUE,
      v_template.scheduled_at
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Status Sync Trigger: if is_purchased = TRUE or NOW() >= scheduled_at -> is_active = FALSE
CREATE OR REPLACE FUNCTION public.sync_flash_mission_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_purchased = TRUE THEN
    NEW.is_active := FALSE;
  END IF;

  IF NEW.is_active = TRUE AND NEW.scheduled_at IS NOT NULL THEN
    IF NOW() >= NEW.scheduled_at THEN
      NEW.is_active := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_flash_mission_status ON public.user_flash_missions;
CREATE TRIGGER trg_sync_flash_mission_status
  BEFORE INSERT OR UPDATE ON public.user_flash_missions
  FOR EACH ROW EXECUTE FUNCTION public.sync_flash_mission_status();

-- 5. Stored Procedure (RPC) to deactivate all outdated / purchased flash missions
CREATE OR REPLACE FUNCTION public.expire_outdated_flash_missions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_template_record RECORD;
BEGIN
  -- Deactivate global templates whose scheduled_at deadline has passed
  FOR v_template_record IN
    SELECT id FROM public.user_flash_missions
    WHERE user_id IS NULL
      AND is_active = TRUE
      AND scheduled_at IS NOT NULL
      AND NOW() >= scheduled_at
  LOOP
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE id = v_template_record.id;

    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE campaign_id = v_template_record.id AND is_active = TRUE;
  END LOOP;

  -- Deactivate user missions that have expired or been purchased
  WITH expired_rows AS (
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND (
        is_purchased = TRUE
        OR (
          scheduled_at IS NOT NULL AND NOW() >= scheduled_at
        )
      )
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM expired_rows;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.expire_outdated_flash_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_outdated_flash_missions() TO anon;
GRANT EXECUTE ON FUNCTION public.expire_outdated_flash_missions() TO service_role;

-- 6. Run cleanup
SELECT public.expire_outdated_flash_missions() AS deactivated_missions_count;
