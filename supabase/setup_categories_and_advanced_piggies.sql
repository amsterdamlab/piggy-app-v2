-- ==============================================================================
-- PIGGY APP — ESTANDARIZACIÓN DE CATEGORÍAS, DÍAS DE ENGORDE Y AUTOMATIZACIÓN
-- Ejecuta este script en Supabase SQL Editor
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. CREACIÓN DEL ENUM DE CATEGORÍAS (Para selección en lista / dropdown)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Si no existe el tipo ENUM unificado, lo creamos
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'piggy_category_enum') THEN
    CREATE TYPE public.piggy_category_enum AS ENUM (
      'estandar',
      'plus',
      'dorado',
      'premium',
      'avanzado30',
      'avanzado45',
      'avanzado60',
      'avanzado75',
      'avanzado90'
    );
  ELSE
    -- Agregar valores que falten si ya existía
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'estandar'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'plus'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'dorado'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'premium'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'avanzado30'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'avanzado45'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'avanzado60'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'avanzado75'; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'avanzado90'; EXCEPTION WHEN others THEN END;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ADAPTACIÓN DE COLUMNAS EN LA TABLA `marketplace`
-- ──────────────────────────────────────────────────────────────────────────────
-- Asegurar columnas para cálculo en días
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS days_advanced INTEGER DEFAULT 0;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS days_remaining INTEGER DEFAULT 144;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_month INTEGER DEFAULT 1;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_weight NUMERIC DEFAULT 15.0;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS extra_roi NUMERIC DEFAULT 0.00;

-- Migración segura de valores antiguos de categoría en `marketplace`
UPDATE public.marketplace SET category = 'estandar' WHERE category IN ('standard', 'estandard', 'estándar');
UPDATE public.marketplace SET category = 'plus' WHERE category IN ('silver', 'plata');
UPDATE public.marketplace SET category = 'dorado' WHERE category IN ('gold', 'oro');
UPDATE public.marketplace SET category = 'premium' WHERE category = 'premium';
UPDATE public.marketplace SET category = 'avanzado30' WHERE category IN ('advanced', 'advanced30', 'avanzado') AND (current_month = 2 OR days_advanced = 30);
UPDATE public.marketplace SET category = 'avanzado60' WHERE category IN ('advanced', 'advanced60') AND (current_month = 3 OR days_advanced = 60);

-- Convertir columna category al tipo ENUM en marketplace
DO $$
BEGIN
  ALTER TABLE public.marketplace DROP CONSTRAINT IF EXISTS marketplace_category_check;
  ALTER TABLE public.marketplace ALTER COLUMN category DROP DEFAULT;
  ALTER TABLE public.marketplace ALTER COLUMN category TYPE public.piggy_category_enum 
    USING (
      CASE 
        WHEN category::text IN ('plus', 'silver', 'plata') THEN 'plus'::public.piggy_category_enum
        WHEN category::text IN ('dorado', 'gold', 'oro') THEN 'dorado'::public.piggy_category_enum
        WHEN category::text IN ('premium') THEN 'premium'::public.piggy_category_enum
        WHEN category::text IN ('avanzado30', 'advanced30') THEN 'avanzado30'::public.piggy_category_enum
        WHEN category::text IN ('avanzado45', 'advanced45') THEN 'avanzado45'::public.piggy_category_enum
        WHEN category::text IN ('avanzado60', 'advanced60') THEN 'avanzado60'::public.piggy_category_enum
        WHEN category::text IN ('avanzado75', 'advanced75') THEN 'avanzado75'::public.piggy_category_enum
        WHEN category::text IN ('avanzado90', 'advanced90') THEN 'avanzado90'::public.piggy_category_enum
        ELSE 'estandar'::public.piggy_category_enum
      END
    );
  ALTER TABLE public.marketplace ALTER COLUMN category SET DEFAULT 'estandar'::public.piggy_category_enum;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'No se pudo convertir category a enum directamente, se mantiene como texto con constraint.';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. TRIGGER AUTOMÁTICO PARA `marketplace`
--    Al insertar o editar un cerdo, calcula automáticamente:
--    - extra_roi (+1%, +2%, +3%)
--    - days_advanced (30, 45, 60, 75, 90)
--    - days_remaining (144 - days_advanced)
--    - current_weight (Curva biológica de engorde de 15kg a 110kg)
--    - current_month (para compatibilidad)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_auto_calc_marketplace_item()
RETURNS TRIGGER AS $$
DECLARE
  v_cat TEXT;
  v_total_days INT := 144;
BEGIN
  v_cat := NEW.category::TEXT;

  -- 1. Determinar días adelantados según la categoría elegida
  IF v_cat = 'avanzado30' THEN
    NEW.days_advanced := 30;
    NEW.extra_roi := 0.00;
  ELSIF v_cat = 'avanzado45' THEN
    NEW.days_advanced := 45;
    NEW.extra_roi := 0.00;
  ELSIF v_cat = 'avanzado60' THEN
    NEW.days_advanced := 60;
    NEW.extra_roi := 0.00;
  ELSIF v_cat = 'avanzado75' THEN
    NEW.days_advanced := 75;
    NEW.extra_roi := 0.00;
  ELSIF v_cat = 'avanzado90' THEN
    NEW.days_advanced := 90;
    NEW.extra_roi := 0.00;
  ELSIF v_cat = 'plus' THEN
    NEW.extra_roi := 0.01;
    NEW.days_advanced := COALESCE(NEW.days_advanced, 0);
  ELSIF v_cat = 'dorado' THEN
    NEW.extra_roi := 0.02;
    NEW.days_advanced := COALESCE(NEW.days_advanced, 0);
  ELSIF v_cat = 'premium' THEN
    NEW.extra_roi := 0.03;
    NEW.days_advanced := COALESCE(NEW.days_advanced, 0);
  ELSE -- 'estandar'
    NEW.extra_roi := 0.00;
    NEW.days_advanced := COALESCE(NEW.days_advanced, 0);
  END IF;

  -- 2. Asegurar que days_advanced esté dentro de límites válidos (0 a 140)
  NEW.days_advanced := GREATEST(0, LEAST(140, NEW.days_advanced));

  -- 3. Calcular días restantes exactos
  NEW.days_remaining := GREATEST(1, v_total_days - NEW.days_advanced);

  -- 4. Calcular peso aproximado según los días adelantados (15 kg inicial -> 110 kg final en 144 días)
  NEW.current_weight := ROUND((15.0 + (NEW.days_advanced::NUMERIC / v_total_days::NUMERIC) * (110.0 - 15.0)), 1);

  -- 5. Calcular mes representativo para compatibilidad
  NEW.current_month := CASE
    WHEN NEW.days_advanced >= 120 THEN 5
    WHEN NEW.days_advanced >= 90 THEN 4
    WHEN NEW.days_advanced >= 60 THEN 3
    WHEN NEW.days_advanced >= 30 THEN 2
    ELSE 1
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_marketplace ON public.marketplace;
CREATE TRIGGER trg_calc_marketplace
BEFORE INSERT OR UPDATE ON public.marketplace
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_calc_marketplace_item();

-- Forzar recalculo de items actuales en marketplace
UPDATE public.marketplace SET category = category;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. ADAPTACIÓN DE OTRAS TABLAS (`piggies`, `user_flash_missions`, `exclusive_piggy_config`, `cycle_completion_missions`)
-- ──────────────────────────────────────────────────────────────────────────────

-- Tabla `piggies`
UPDATE public.piggies SET category = 'estandar' WHERE category IN ('standard', 'estandard', 'estándar');
UPDATE public.piggies SET category = 'plus' WHERE category IN ('silver', 'plata');
UPDATE public.piggies SET category = 'dorado' WHERE category IN ('gold', 'oro');
UPDATE public.piggies SET category = 'premium' WHERE category = 'premium';
UPDATE public.piggies SET category = 'avanzado30' WHERE category IN ('advanced', 'advanced30');
UPDATE public.piggies SET category = 'avanzado60' WHERE category IN ('advanced60');

-- Tabla `user_flash_missions`
DO $$
BEGIN
  -- Adaptar columna piggy_type para usar el nuevo enum si es posible
  ALTER TABLE public.user_flash_missions DROP CONSTRAINT IF EXISTS user_flash_missions_piggy_type_check;
  
  UPDATE public.user_flash_missions SET piggy_type = 'plus'::public.piggy_type_enum WHERE piggy_type::text IN ('silver', 'plata');
  UPDATE public.user_flash_missions SET piggy_type = 'dorado'::public.piggy_type_enum WHERE piggy_type::text IN ('gold', 'oro');
  UPDATE public.user_flash_missions SET piggy_type = 'premium'::public.piggy_type_enum WHERE piggy_type::text = 'premium';
  UPDATE public.user_flash_missions SET piggy_type = 'avanzado30'::public.piggy_type_enum WHERE piggy_type::text IN ('advanced', 'advanced30');
  UPDATE public.user_flash_missions SET piggy_type = 'avanzado60'::public.piggy_type_enum WHERE piggy_type::text IN ('advanced60');
EXCEPTION WHEN others THEN
  -- Si falla por tipo enum previo, actualizar como texto
  UPDATE public.user_flash_missions SET piggy_type = 'plus' WHERE piggy_type::text IN ('silver', 'plata');
  UPDATE public.user_flash_missions SET piggy_type = 'dorado' WHERE piggy_type::text IN ('gold', 'oro');
  UPDATE public.user_flash_missions SET piggy_type = 'avanzado30' WHERE piggy_type::text IN ('advanced', 'advanced30');
  UPDATE public.user_flash_missions SET piggy_type = 'avanzado60' WHERE piggy_type::text IN ('advanced60');
END $$;

-- Tabla `exclusive_piggy_config` (M10)
UPDATE public.exclusive_piggy_config SET piggy_type = 'plus', piggy_label = 'Piggy Plus' WHERE piggy_type IN ('silver', 'plata');
UPDATE public.exclusive_piggy_config SET piggy_type = 'dorado', piggy_label = 'Piggy Dorado' WHERE piggy_type IN ('gold', 'oro');

-- Tabla `cycle_completion_missions`
UPDATE public.cycle_completion_missions SET piggy_type = 'plus', piggy_label = 'Piggy Plus' WHERE piggy_type IN ('silver', 'plata');
UPDATE public.cycle_completion_missions SET piggy_type = 'dorado', piggy_label = 'Piggy Dorado' WHERE piggy_type IN ('gold', 'oro');

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. FUNCIÓN `buy_piggy` ACTUALIZADA (Basada en días de engorde exactos)
-- ──────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS buy_piggy(bigint, uuid, numeric, text, numeric, text);
DROP FUNCTION IF EXISTS buy_piggy(uuid, uuid, numeric, text, numeric, text);
DROP FUNCTION IF EXISTS buy_piggy(uuid, uuid, numeric, text, numeric, text, integer);

CREATE OR REPLACE FUNCTION buy_piggy(
  p_item_id uuid,
  p_user_id uuid,
  p_price numeric,
  p_item_name text,
  p_extra_roi numeric,
  p_category text,
  p_current_month integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_piggy_id uuid;
  v_item record;
  v_days_advanced int := 0;
  v_days_remaining int;
  v_total_cycle_days int := 144;
  v_extra_roi numeric := 0;
  v_category text;
  v_weight numeric := 15.0;
BEGIN
  -- Bloquear fila del marketplace
  SELECT * INTO v_item
  FROM marketplace
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Item no encontrado en el marketplace';
  END IF;

  IF v_item.stock <= 0 THEN
    RAISE EXCEPTION 'No hay existencias disponibles (stock agotado)';
  END IF;

  -- Tomar datos calculados del item o fallbacks
  v_category := COALESCE(v_item.category::text, p_category, 'estandar');
  v_extra_roi := COALESCE(v_item.extra_roi, p_extra_roi, 0.00);

  IF v_item.days_remaining IS NOT NULL AND v_item.days_remaining > 0 THEN
    v_days_remaining := v_item.days_remaining;
    v_weight := COALESCE(v_item.current_weight, 15.0);
  ELSIF v_item.days_advanced IS NOT NULL AND v_item.days_advanced > 0 THEN
    v_days_remaining := GREATEST(1, v_total_cycle_days - v_item.days_advanced);
    v_weight := COALESCE(v_item.current_weight, ROUND((15.0 + (v_item.days_advanced::numeric / v_total_days::numeric) * (110.0 - 15.0)), 1));
  ELSE
    -- Cálculo fallback por categoría o mes
    IF v_category = 'avanzado30' THEN v_days_remaining := 114; v_weight := 35.0;
    ELSIF v_category = 'avanzado45' THEN v_days_remaining := 99; v_weight := 45.0;
    ELSIF v_category = 'avanzado60' THEN v_days_remaining := 84; v_weight := 55.0;
    ELSIF v_category = 'avanzado75' THEN v_days_remaining := 69; v_weight := 65.0;
    ELSIF v_category = 'avanzado90' THEN v_days_remaining := 54; v_weight := 75.0;
    ELSE
      v_days_advanced := GREATEST(0, (COALESCE(p_current_month, 1) - 1) * 30);
      v_days_remaining := GREATEST(1, v_total_cycle_days - v_days_advanced);
      v_weight := 15.0;
    END IF;
  END IF;

  -- Reducir stock
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- Crear el cerdito en la granja del usuario
  INSERT INTO piggies (
    user_id, name, investment_amount, status,
    extra_roi_bonus, category, current_weight,
    purchase_date, end_date
  )
  VALUES (
    p_user_id, p_item_name, p_price, 'engorde',
    v_extra_roi, v_category, v_weight,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval
  )
  RETURNING id INTO v_new_piggy_id;

  RETURN json_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'days_remaining', v_days_remaining,
    'weight', v_weight
  );
END;
$$;

GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;

SELECT 'Base de datos configurada exitosamente con automatización de categorías y días de engorde' AS estado;
