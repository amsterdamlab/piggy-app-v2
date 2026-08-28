-- ==============================================================================
-- PIGGY APP — Update Flash Missions: Custom Texts from DB
-- Ejecutar en el SQL Editor de Supabase
-- Permite personalizar desde BD: títulos, subtítulos, beneficios y etiquetas
-- ==============================================================================

-- 1. Agregar columnas para textos personalizados a user_flash_missions
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS piggy_label TEXT NULL;
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS benefit_title TEXT NULL;
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS benefit_description TEXT NULL;
ALTER TABLE public.user_flash_missions ADD COLUMN IF NOT EXISTS badge TEXT NULL;

-- 2. Actualizar la función trigger para copiar todos los campos de texto al duplicar plantillas globales
CREATE OR REPLACE FUNCTION public.process_consolidated_flash_mission()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_template_id UUID;
BEGIN
  -- Solo se activa si es una PLANTILLA GLOBAL (user_id IS NULL)
  IF NEW.user_id IS NULL THEN
    v_template_id := NEW.id;

    -- CASO A: La plantilla se activa (is_active pasa a TRUE)
    IF NEW.is_active = TRUE AND (TG_OP = 'INSERT' OR OLD.is_active = FALSE) THEN
      FOR v_profile IN SELECT id FROM public.profiles LOOP
        -- Solo insertar si el usuario no tiene ya una copia activa/no comprada de esta campaña
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
      RAISE NOTICE 'Plantilla global de Misión Flash % replicada a todos los usuarios con textos personalizados.', v_template_id;

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
