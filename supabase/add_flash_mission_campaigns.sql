-- ==========================================================
-- PIGGY APP — Flash Mission Campaigns (Global and Targeted)
-- Run this in Supabase SQL Editor
-- ==========================================================

-- 1. Create the campaigns table
CREATE TABLE IF NOT EXISTS public.flash_mission_campaigns (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_key        TEXT NOT NULL,              -- 'm8' | 'm9'
  title              TEXT NOT NULL,
  description        TEXT,
  icon               TEXT DEFAULT '⚡',
  piggy_type         TEXT NOT NULL DEFAULT 'advanced', -- 'advanced' | 'gold'
  piggy_label        TEXT NOT NULL DEFAULT 'Piggy Advanced',
  extra_roi_bonus    NUMERIC DEFAULT 0.01,
  price              NUMERIC DEFAULT 1000000,
  duration_hours     INTEGER DEFAULT 72,
  target_scope       TEXT NOT NULL DEFAULT 'all', -- 'all' or a valid user UUID
  is_active          BOOLEAN DEFAULT FALSE,       -- Set TRUE to trigger launch, FALSE to stop
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on campaigns table (Read-only for users, full access for service_role)
ALTER TABLE public.flash_mission_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read campaigns for authenticated" ON public.flash_mission_campaigns;
CREATE POLICY "Allow read campaigns for authenticated"
  ON public.flash_mission_campaigns FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Create the Trigger Function to automate user assignments
CREATE OR REPLACE FUNCTION public.process_flash_mission_campaign()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_target_uuid UUID;
BEGIN
  -- 1. CAMPAIGN ACTIVATION (FALSE -> TRUE)
  IF NEW.is_active = TRUE AND (TG_OP = 'INSERT' OR OLD.is_active = FALSE) THEN
    IF LOWER(NEW.target_scope) = 'all' THEN
      -- Loop and insert for all users
      FOR v_profile IN SELECT id FROM public.profiles LOOP
        -- Only insert if there isn't already an active, unpurchased assignment of this mission_key
        IF NOT EXISTS (
          SELECT 1 FROM public.user_flash_missions
          WHERE user_id = v_profile.id AND mission_key = NEW.mission_key AND is_purchased = FALSE
        ) THEN
          INSERT INTO public.user_flash_missions 
            (user_id, mission_key, title, description, icon, piggy_type, piggy_label, extra_roi_bonus, price, duration_hours, is_active)
          VALUES 
            (v_profile.id, NEW.mission_key, NEW.title, NEW.description, NEW.icon, NEW.piggy_type, NEW.piggy_label, NEW.extra_roi_bonus, NEW.price, NEW.duration_hours, TRUE);
        END IF;
      END LOOP;
      RAISE NOTICE 'Campaign activated for ALL users.';
    ELSE
      -- Verify if target_scope is a valid UUID
      IF NEW.target_scope ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        v_target_uuid := NEW.target_scope::UUID;
        
        -- Insert for specific user
        IF NOT EXISTS (
          SELECT 1 FROM public.user_flash_missions
          WHERE user_id = v_target_uuid AND mission_key = NEW.mission_key AND is_purchased = FALSE
        ) THEN
          INSERT INTO public.user_flash_missions 
            (user_id, mission_key, title, description, icon, piggy_type, piggy_label, extra_roi_bonus, price, duration_hours, is_active)
          VALUES 
            (v_target_uuid, NEW.mission_key, NEW.title, NEW.description, NEW.icon, NEW.piggy_type, NEW.piggy_label, NEW.extra_roi_bonus, NEW.price, NEW.duration_hours, TRUE);
        END IF;
        RAISE NOTICE 'Campaign activated for user UUID %', v_target_uuid;
      ELSE
        RAISE EXCEPTION 'Invalid UUID format in target_scope: %', NEW.target_scope;
      END IF;
    END IF;
  
  -- 2. CAMPAIGN DEACTIVATION (TRUE -> FALSE)
  ELSIF NEW.is_active = FALSE AND (TG_OP = 'UPDATE' AND OLD.is_active = TRUE) THEN
    IF LOWER(NEW.target_scope) = 'all' THEN
      -- Deactivate for all users who haven't purchased yet
      UPDATE public.user_flash_missions
      SET is_active = FALSE
      WHERE mission_key = NEW.mission_key AND is_purchased = FALSE;
      RAISE NOTICE 'Campaign deactivated for ALL users.';
    ELSE
      -- Verify if target_scope is a valid UUID
      IF NEW.target_scope ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        v_target_uuid := NEW.target_scope::UUID;
        
        -- Deactivate for specific user
        UPDATE public.user_flash_missions
        SET is_active = FALSE
        WHERE user_id = v_target_uuid AND mission_key = NEW.mission_key AND is_purchased = FALSE;
        RAISE NOTICE 'Campaign deactivated for user UUID %', v_target_uuid;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to campaigns table
DROP TRIGGER IF EXISTS trg_process_flash_mission_campaign ON public.flash_mission_campaigns;
CREATE TRIGGER trg_process_flash_mission_campaign
  AFTER INSERT OR UPDATE ON public.flash_mission_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.process_flash_mission_campaign();
