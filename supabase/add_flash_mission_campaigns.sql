-- ==============================================================================
-- PIGGY APP — Consolidated Flash Missions (Single Table Architecture)
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 0. Drop deprecated separate table if it exists from previous iterations
DROP TABLE IF EXISTS public.flash_mission_campaigns CASCADE;

-- 1. Create the piggy_type ENUM if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'piggy_type_enum') THEN
    CREATE TYPE public.piggy_type_enum AS ENUM ('silver', 'gold', 'premium', 'advanced30', 'advanced60');
  END IF;
END $$;

-- 2. Create or recreate the consolidated user_flash_missions table
CREATE TABLE IF NOT EXISTS public.user_flash_missions (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE NULL, -- NULL indicates a Global Template
  campaign_id        UUID NULL,                                                  -- References template ID when copied to users
  mission_title      TEXT DEFAULT 'MISIÓN FLASH',                                -- Default title for banner header
  title              TEXT NOT NULL,                                              -- Custom mission title
  description        TEXT,                                                       -- Mission description
  icon               TEXT DEFAULT '⚡',                                          -- Mission icon
  piggy_type         public.piggy_type_enum NOT NULL,                            -- Dropdown Enum selection
  piggy_label        TEXT NULL,                                                  -- Custom Piggy Label (e.g. 'Piggy Flash')
  benefit_title      TEXT NULL,                                                  -- Custom Benefit title
  benefit_description TEXT NULL,                                                 -- Custom Benefit description
  badge              TEXT NULL,                                                  -- Custom Header badge
  price              NUMERIC DEFAULT 1000000,
  is_active          BOOLEAN DEFAULT FALSE,
  scheduled_at       TIMESTAMP WITH TIME ZONE NULL,                              -- Exact expiration deadline timestamp
  is_purchased       BOOLEAN DEFAULT FALSE,
  purchased_at       TIMESTAMP WITH TIME ZONE NULL,
  purchased_piggy_id UUID REFERENCES public.piggies(id) ON DELETE SET NULL NULL,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- In case table already existed, ensure columns are added/altered safely
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.user_flash_missions ALTER COLUMN user_id DROP NOT NULL;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS campaign_id UUID NULL;
  EXCEPTION WHEN others THEN END;

  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS mission_title TEXT DEFAULT 'MISIÓN FLASH';
  EXCEPTION WHEN others THEN END;

  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE NULL;
  EXCEPTION WHEN others THEN END;

  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS piggy_label TEXT NULL;
  EXCEPTION WHEN others THEN END;

  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS benefit_title TEXT NULL;
  EXCEPTION WHEN others THEN END;

  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS benefit_description TEXT NULL;
  EXCEPTION WHEN others THEN END;

  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS badge TEXT NULL;
  EXCEPTION WHEN others THEN END;

  BEGIN
    -- Remove deprecated / obsolete columns
    ALTER TABLE public.user_flash_missions DROP COLUMN IF EXISTS mission_key;
    ALTER TABLE public.user_flash_missions DROP COLUMN IF EXISTS extra_roi_bonus;
    ALTER TABLE public.user_flash_missions DROP COLUMN IF EXISTS duration_hours;
    ALTER TABLE public.user_flash_missions DROP COLUMN IF EXISTS activated_at;
  EXCEPTION WHEN others THEN END;
  
  -- Convert piggy_type column to enum safely if it was text
  BEGIN
    ALTER TABLE public.user_flash_missions DROP CONSTRAINT IF EXISTS user_flash_missions_piggy_type_check;
    ALTER TABLE public.user_flash_missions ALTER COLUMN piggy_type TYPE public.piggy_type_enum USING piggy_type::public.piggy_type_enum;
  EXCEPTION WHEN others THEN END;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_flash_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read user flash missions for authenticated" ON public.user_flash_missions;
CREATE POLICY "Allow read user flash missions for authenticated"
  ON public.user_flash_missions FOR SELECT USING (
    auth.role() = 'authenticated' AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- 2. Trigger Function to auto-duplicate Global Templates to all existing Users
CREATE OR REPLACE FUNCTION public.process_consolidated_flash_mission()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_template_id UUID;
BEGIN
  -- We only trigger duplication if this is a GLOBAL TEMPLATE (user_id IS NULL)
  IF NEW.user_id IS NULL THEN
    v_template_id := NEW.id;

    -- CASE A: Template is activated (is_active becomes TRUE)
    IF NEW.is_active = TRUE AND (TG_OP = 'INSERT' OR OLD.is_active = FALSE) THEN
      FOR v_profile IN SELECT id FROM public.profiles LOOP
        -- Only insert if this user doesn't already have an active/unpurchased copy for this campaign_id
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
            piggy_label,
            benefit_title,
            benefit_description,
            badge,
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
            NEW.piggy_label,
            NEW.benefit_title,
            NEW.benefit_description,
            NEW.badge,
            NEW.price,
            TRUE,
            NEW.scheduled_at
          );
        END IF;
      END LOOP;
      RAISE NOTICE 'Global Flash Mission % replicated to all users.', v_template_id;

    -- CASE B: Template is deactivated (is_active becomes FALSE)
    ELSIF NEW.is_active = FALSE AND (TG_OP = 'UPDATE' AND OLD.is_active = TRUE) THEN
      UPDATE public.user_flash_missions
      SET is_active = FALSE
      WHERE campaign_id = v_template_id AND is_purchased = FALSE;
      RAISE NOTICE 'Global Flash Mission % deactivated for all users.', v_template_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger to user_flash_missions
DROP TRIGGER IF EXISTS trg_process_consolidated_flash_mission ON public.user_flash_missions;
CREATE TRIGGER trg_process_consolidated_flash_mission
  AFTER INSERT OR UPDATE ON public.user_flash_missions
  FOR EACH ROW EXECUTE FUNCTION public.process_consolidated_flash_mission();

-- 4. Trigger to assign active global templates to NEWLY REGISTERED users automatically
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
      piggy_label,
      benefit_title,
      benefit_description,
      badge,
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
      v_template.piggy_label,
      v_template.benefit_title,
      v_template.benefit_description,
      v_template.badge,
      v_template.price,
      TRUE,
      v_template.scheduled_at
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assign_flash_missions_new_user ON public.profiles;
CREATE TRIGGER trg_assign_flash_missions_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_active_flash_missions_to_new_user();

-- 5. Trigger to enforce is_active = FALSE when is_purchased = TRUE or when scheduled_at passed
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

-- 6. Stored Procedure (RPC) to deactivate all outdated / purchased flash missions in bulk
CREATE OR REPLACE FUNCTION public.expire_outdated_flash_missions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_template_record RECORD;
BEGIN
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

-- ==============================================================================
-- EXAMPLE USAGE IN SUPABASE SQL EDITOR OR STUDIO:
-- ==============================================================================
-- 1. Create an instant Global Flash Mission (valid until a specific deadline):
-- INSERT INTO public.user_flash_missions (user_id, title, description, piggy_type, price, is_active, scheduled_at)
-- VALUES (NULL, '¡Acelera tu Crecimiento!', 'Inicia tu cerdito en el 2do mes.', 'advanced30', 1000000, TRUE, '2026-08-30 20:00:00+00');
