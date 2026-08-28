-- ==============================================================================
-- PIGGY APP — Update Flash Missions: Custom Texts from DB
-- Ejecutar en el SQL Editor de Supabase
-- Permite personalizar desde BD: títulos, subtítulos, beneficios y etiquetas
-- ==============================================================================

-- 0. Eliminar triggers y funciones obsoletas que usaban la columna 'activated_at'
DROP TRIGGER IF EXISTS trg_user_flash_mission_activated ON public.user_flash_missions;
DROP FUNCTION IF EXISTS public.set_flash_mission_activated_at() CASCADE;

-- 1. Agregar columnas para textos personalizados a user_flash_missions
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS piggy_label TEXT NULL;
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS benefit_title TEXT NULL;
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS benefit_description TEXT NULL;
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS badge TEXT NULL;

-- 2. Actualizar la función trigger para copiar y SINCRONIZAR todos los campos de texto al crear o editar plantillas globales
CREATE OR REPLACE FUNCTION public.process_consolidated_flash_mission()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_template_id UUID;
BEGIN
  -- Solo se activa si es una PLANTILLA GLOBAL (user_id IS NULL)
  IF NEW.user_id IS NULL THEN
    v_template_id := NEW.id;

    -- CASO A: La plantilla está activa (is_active = TRUE)
    IF NEW.is_active = TRUE THEN
      FOR v_profile IN SELECT id FROM public.profiles LOOP
        -- Si el usuario ya tiene una fila activa/no comprada de esta campaña, ACTUALIZAR TODOS los campos
        IF EXISTS (
          SELECT 1 FROM public.user_flash_missions
          WHERE user_id = v_profile.id AND campaign_id = v_template_id AND is_purchased = FALSE
        ) THEN
          UPDATE public.user_flash_missions
          SET
            mission_title       = COALESCE(NEW.mission_title, 'MISIÓN FLASH'),
            title               = NEW.title,
            description         = NEW.description,
            icon                = COALESCE(NEW.icon, '⚡'),
            piggy_type          = NEW.piggy_type,
            piggy_label         = NEW.piggy_label,
            benefit_title       = NEW.benefit_title,
            benefit_description = NEW.benefit_description,
            badge               = NEW.badge,
            price               = NEW.price,
            is_active           = TRUE,
            scheduled_at        = NEW.scheduled_at
          WHERE user_id = v_profile.id AND campaign_id = v_template_id AND is_purchased = FALSE;
        ELSE
          -- Si no la tiene, INSERTAR copia con todos los campos
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
      RAISE NOTICE 'Plantilla global de Misión Flash % sincronizada a todos los usuarios.', v_template_id;

    -- CASO B: La plantilla se desactiva (is_active pasa a FALSE)
    ELSIF NEW.is_active = FALSE THEN
      UPDATE public.user_flash_missions
      SET is_active = FALSE
      WHERE campaign_id = v_template_id AND is_purchased = FALSE;
      RAISE NOTICE 'Plantilla global de Misión Flash % desactivada para todos los usuarios.', v_template_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar trigger para nuevos usuarios registrados
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
