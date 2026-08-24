-- ==========================================================
-- PIGGY APP — Exclusive Piggy Config Setup (Tiered Rewards)
-- Ejecutar en el SQL Editor de Supabase
-- ==========================================================

-- 1. Eliminar trigger anterior si existía
DROP TRIGGER IF EXISTS trg_exclusive_piggy_config_auto_fill ON public.exclusive_piggy_config;
DROP FUNCTION IF EXISTS public.auto_fill_exclusive_piggy_config();

-- 2. Función Trigger: Auto-rellena piggy_label y extra_roi_bonus según piggy_type
CREATE OR REPLACE FUNCTION public.auto_fill_exclusive_piggy_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalizar a minúsculas y sin espacios
  NEW.piggy_type := LOWER(TRIM(NEW.piggy_type));

  CASE NEW.piggy_type
    WHEN 'plus', 'silver' THEN
      NEW.piggy_type       := 'plus';
      NEW.piggy_label      := 'Piggy Plus';
      NEW.extra_roi_bonus  := 0.01;
    WHEN 'dorado', 'gold' THEN
      NEW.piggy_type       := 'dorado';
      NEW.piggy_label      := 'Piggy Dorado';
      NEW.extra_roi_bonus  := 0.02;
    WHEN 'premium' THEN
      NEW.piggy_type       := 'premium';
      NEW.piggy_label      := 'Piggy Premium';
      NEW.extra_roi_bonus  := 0.03;
    WHEN 'estandar', 'standard' THEN
      NEW.piggy_type       := 'estandar';
      NEW.piggy_label      := 'Piggy Estándar';
      NEW.extra_roi_bonus  := 0.00;
    WHEN 'avanzado30', 'advanced30' THEN
      NEW.piggy_type       := 'avanzado30';
      NEW.piggy_label      := 'Piggy Avanzado (30d)';
      NEW.extra_roi_bonus  := 0.00;
    WHEN 'avanzado45', 'advanced45' THEN
      NEW.piggy_type       := 'avanzado45';
      NEW.piggy_label      := 'Piggy Avanzado (45d)';
      NEW.extra_roi_bonus  := 0.00;
    WHEN 'avanzado60', 'advanced60' THEN
      NEW.piggy_type       := 'avanzado60';
      NEW.piggy_label      := 'Piggy Avanzado (60d)';
      NEW.extra_roi_bonus  := 0.00;
    WHEN 'avanzado75', 'advanced75' THEN
      NEW.piggy_type       := 'avanzado75';
      NEW.piggy_label      := 'Piggy Avanzado (75d)';
      NEW.extra_roi_bonus  := 0.00;
    WHEN 'avanzado90', 'advanced90' THEN
      NEW.piggy_type       := 'avanzado90';
      NEW.piggy_label      := 'Piggy Avanzado (90d)';
      NEW.extra_roi_bonus  := 0.00;
    ELSE
      -- Fallback si no coincide con ninguno
      IF NEW.piggy_label IS NULL OR NEW.piggy_label = '' THEN
        NEW.piggy_label := 'Piggy ' || INITCAP(NEW.piggy_type);
      END IF;
      IF NEW.extra_roi_bonus IS NULL THEN
        NEW.extra_roi_bonus := 0.00;
      END IF;
  END CASE;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el Trigger en la tabla
CREATE TRIGGER trg_exclusive_piggy_config_auto_fill
BEFORE INSERT OR UPDATE ON public.exclusive_piggy_config
FOR EACH ROW EXECUTE FUNCTION public.auto_fill_exclusive_piggy_config();

-- 4. Agregar restricción CHECK para piggy_type (lista permitida)
ALTER TABLE public.exclusive_piggy_config 
DROP CONSTRAINT IF EXISTS exclusive_piggy_type_check;

ALTER TABLE public.exclusive_piggy_config 
ADD CONSTRAINT exclusive_piggy_type_check 
CHECK (piggy_type IN (
  'plus', 'silver',
  'dorado', 'gold',
  'premium',
  'estandar', 'standard',
  'avanzado30', 'advanced30',
  'avanzado45', 'advanced45',
  'avanzado60', 'advanced60',
  'avanzado75', 'advanced75',
  'avanzado90', 'advanced90'
));

-- 5. Limpiar e insertar las 3 filas por niveles de lealtad
DELETE FROM public.exclusive_piggy_config;

-- Nivel 1: Usuario con 1 Piggy -> Piggy Plus (+1%)
INSERT INTO public.exclusive_piggy_config (min_piggies, piggy_type, price, duration_hours, is_enabled)
VALUES (1, 'plus', 1000000, 48, TRUE);

-- Nivel 2: Usuario con 2 Piggies -> Piggy Dorado (+2%)
INSERT INTO public.exclusive_piggy_config (min_piggies, piggy_type, price, duration_hours, is_enabled)
VALUES (2, 'dorado', 1000000, 48, TRUE);

-- Nivel 3: Usuario con 3 o más Piggies -> Piggy Premium (+3%)
INSERT INTO public.exclusive_piggy_config (min_piggies, piggy_type, price, duration_hours, is_enabled)
VALUES (3, 'premium', 1000000, 48, TRUE);

-- 6. Verificación final
SELECT min_piggies, piggy_type, piggy_label, extra_roi_bonus, price, is_enabled 
FROM public.exclusive_piggy_config 
ORDER BY min_piggies ASC;
