-- ==============================================================================
-- PIGGY APP — Sincronización y Corrección de Misiones Flash (scheduled_at & expires_at)
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Asegurar la existencia de las columnas scheduled_at y expires_at en user_flash_missions
DO $$ 
BEGIN
  -- Fecha y hora de programación / inicio de la misión
  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE NULL;
  EXCEPTION WHEN others THEN END;

  -- Fecha y hora de vencimiento / caducidad de la misión
  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE NULL;
  EXCEPTION WHEN others THEN END;

  -- Columnas de personalización visual de textos
  BEGIN
    ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS mission_title TEXT DEFAULT 'MISIÓN FLASH';
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
END $$;

-- 2. Trigger para replicar Plantillas Globales (user_id IS NULL) a todos los usuarios
CREATE OR REPLACE FUNCTION public.process_consolidated_flash_mission()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_template_id UUID;
BEGIN
  -- Solo actúa si es una PLANTILLA GLOBAL (user_id IS NULL)
  IF NEW.user_id IS NULL THEN
    v_template_id := NEW.id;

    -- CASO A: La plantilla se crea o se activa (is_active pasa a TRUE)
    IF NEW.is_active = TRUE AND (TG_OP = 'INSERT' OR OLD.is_active = FALSE) THEN
      FOR v_profile IN SELECT id FROM public.profiles LOOP
        -- Evitar duplicados no comprados para la misma campaña
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
            scheduled_at,
            expires_at
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
            NEW.scheduled_at,
            NEW.expires_at
          );
        ELSE
          -- Si ya existe copia, sincronizar fechas y estado
          UPDATE public.user_flash_missions
          SET is_active = TRUE,
              scheduled_at = NEW.scheduled_at,
              expires_at = NEW.expires_at,
              mission_title = COALESCE(NEW.mission_title, mission_title),
              title = NEW.title,
              description = NEW.description,
              icon = COALESCE(NEW.icon, icon),
              piggy_type = NEW.piggy_type,
              piggy_label = NEW.piggy_label,
              benefit_title = NEW.benefit_title,
              benefit_description = NEW.benefit_description,
              badge = NEW.badge,
              price = NEW.price
          WHERE user_id = v_profile.id AND campaign_id = v_template_id AND is_purchased = FALSE;
        END IF;
      END LOOP;
      RAISE NOTICE 'Plantilla global de Misión Flash % replicada a todos los usuarios.', v_template_id;

    -- CASO B: La plantilla se desactiva (is_active pasa a FALSE)
    ELSIF NEW.is_active = FALSE AND (TG_OP = 'UPDATE' AND OLD.is_active = TRUE) THEN
      UPDATE public.user_flash_missions
      SET is_active = FALSE
      WHERE campaign_id = v_template_id AND is_purchased = FALSE;
      RAISE NOTICE 'Plantilla global de Misión Flash % desactivada para todos los usuarios.', v_template_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_process_consolidated_flash_mission ON public.user_flash_missions;
CREATE TRIGGER trg_process_consolidated_flash_mission
  AFTER INSERT OR UPDATE ON public.user_flash_missions
  FOR EACH ROW EXECUTE FUNCTION public.process_consolidated_flash_mission();

-- 3. Trigger para asignar automáticamente plantillas vigentes a NUEVOS usuarios registrados
CREATE OR REPLACE FUNCTION public.assign_active_flash_missions_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_template RECORD;
BEGIN
  FOR v_template IN 
    SELECT * FROM public.user_flash_missions 
    WHERE user_id IS NULL 
      AND is_active = TRUE 
      AND (expires_at IS NULL OR NOW() < expires_at)
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
      scheduled_at,
      expires_at
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
      v_template.scheduled_at,
      v_template.expires_at
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assign_flash_missions_new_user ON public.profiles;
CREATE TRIGGER trg_assign_flash_missions_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_active_flash_missions_to_new_user();

-- 4. Trigger de Sincronización de Estado: SOLO desactiva por expires_at (NUNCA por scheduled_at)
CREATE OR REPLACE FUNCTION public.sync_flash_mission_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si ya fue comprada, se desactiva
  IF NEW.is_purchased = TRUE THEN
    NEW.is_active := FALSE;
  END IF;

  -- Si la fecha límite de caducidad (expires_at) ya pasó, se desactiva
  IF NEW.is_active = TRUE AND NEW.expires_at IS NOT NULL THEN
    IF NOW() >= NEW.expires_at THEN
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

-- 5. Procedimiento RPC para expirar misiones en lote evaluando expires_at
CREATE OR REPLACE FUNCTION public.expire_outdated_flash_missions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_template_record RECORD;
BEGIN
  -- Desactivar plantillas globales cuyo expires_at ya venció
  FOR v_template_record IN
    SELECT id FROM public.user_flash_missions
    WHERE user_id IS NULL
      AND is_active = TRUE
      AND expires_at IS NOT NULL
      AND NOW() >= expires_at
  LOOP
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE id = v_template_record.id;

    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE campaign_id = v_template_record.id AND is_active = TRUE;
  END LOOP;

  -- Desactivar misiones de usuario compradas o con expires_at vencido
  WITH expired_rows AS (
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND (
        is_purchased = TRUE
        OR (
          expires_at IS NOT NULL AND NOW() >= expires_at
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

-- 6. Limpieza / Reactivación automática de misiones vigentes que fueron desactivadas erróneamente
-- (Reactiva plantillas y asignaciones cuyo expires_at aún está en el futuro o es NULL)
UPDATE public.user_flash_missions
SET is_active = TRUE
WHERE is_purchased = FALSE
  AND (expires_at IS NULL OR NOW() < expires_at)
  AND (scheduled_at IS NULL OR NOW() >= scheduled_at);

SELECT 'Configuración de scheduled_at y expires_at completada exitosamente.' AS resultado;
