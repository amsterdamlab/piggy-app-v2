-- ==============================================================================
-- PIGGY APP — Sincronización y Trigger Automático de full_name en piggies
-- Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Sincronizar retroactivamente el nombre en todos los cerditos existentes
UPDATE public.piggies p
SET full_name = pr.full_name
FROM public.profiles pr
WHERE p.user_id = pr.id;

-- 2. Función Trigger para autocompletar full_name en nuevos cerditos (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.trg_populate_piggy_user_info()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- Si el cerdito no trae full_name o viene vacío, buscarlo en profiles
  IF NEW.full_name IS NULL OR TRIM(NEW.full_name) = '' THEN
    SELECT full_name INTO v_name 
    FROM public.profiles 
    WHERE id = NEW.user_id;

    NEW.full_name := v_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enganchar el trigger a piggies (BEFORE INSERT)
DROP TRIGGER IF EXISTS trg_set_piggy_user_info ON public.piggies;

CREATE TRIGGER trg_set_piggy_user_info
  BEFORE INSERT ON public.piggies
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_populate_piggy_user_info();

-- 4. Función Trigger para mantener sincronizado full_name si el usuario lo edita en su perfil
CREATE OR REPLACE FUNCTION public.trg_sync_profile_to_piggies()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    UPDATE public.piggies
    SET full_name = NEW.full_name
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enganchar el trigger a profiles (AFTER UPDATE)
DROP TRIGGER IF EXISTS trg_sync_profile_name_to_piggies ON public.profiles;

CREATE TRIGGER trg_sync_profile_name_to_piggies
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_profile_to_piggies();
