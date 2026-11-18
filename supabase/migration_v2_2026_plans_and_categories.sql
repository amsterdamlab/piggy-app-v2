-- ==============================================================================
-- PIGGY APP — MIGRACIÓN OFICIAL V2 (2026-11): NUEVOS PORCENTAJES, TIEMPOS Y CATEGORÍAS
-- 100% NO DESTRUCTIVA PARA CERDITOS EXISTENTES (COHORTE 'v1_legacy')
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. AGREGAR COLUMNAS DE COHORTE Y CONGELAR CERDITOS EXISTENTES ('v1_legacy')
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS plan_version TEXT;
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS cycle_days INTEGER;
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS locked_base_roi NUMERIC;
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS final_return_amount NUMERIC;

-- Congelar TODOS los cerditos existentes hasta este momento como 'v1_legacy' (144 días, base 8/9/10%)
-- sin alterar sus fechas end_date, pesos ni bonos actuales.
UPDATE public.piggies
SET plan_version = 'v1_legacy',
    cycle_days = COALESCE(cycle_days, 144)
WHERE plan_version IS NULL;

-- Para nuevas compras de aquí en adelante, el default será 'v2_2026' y 122 días
ALTER TABLE public.piggies ALTER COLUMN plan_version SET DEFAULT 'v2_2026';
ALTER TABLE public.piggies ALTER COLUMN cycle_days SET DEFAULT 122;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. AGREGAR 'avanzado15' AL ENUM DE CATEGORÍAS Y ADECUAR `marketplace`
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'piggy_category_enum') THEN
    ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'avanzado15';
  END IF;
END $$;

ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS cycle_days INTEGER DEFAULT 122;

-- Desactivar del Mercado: Piggy Plus y Avanzados mayores a 30 días
UPDATE public.marketplace
SET stock = 0
WHERE category::text IN ('plus', 'silver', 'plata', 'avanzado45', 'advanced45', 'avanzado60', 'advanced60', 'avanzado75', 'advanced75', 'avanzado90', 'advanced90')
   OR COALESCE(days_advanced, 0) > 30;

-- Actualizar trigger de cálculo automático en `marketplace` (V2: 122d Estándar/Avanzado, 152d Dorado/Premium, Premium +4%)
CREATE OR REPLACE FUNCTION public.trg_auto_calc_marketplace_item()
RETURNS TRIGGER AS $$
DECLARE
  v_cat TEXT;
  v_total_days INT := 122;
BEGIN
  v_cat := LOWER(TRIM(COALESCE(NEW.category::TEXT, 'estandar')));

  IF v_cat IN ('avanzado15', 'advanced15') THEN
    v_total_days := 122;
    NEW.days_advanced := 15;
    NEW.extra_roi := 0.00;
  ELSIF v_cat IN ('avanzado30', 'advanced30', 'avanzado', 'advanced') THEN
    v_total_days := 122;
    NEW.days_advanced := 30;
    NEW.extra_roi := 0.00;
  ELSIF v_cat IN ('dorado', 'gold') THEN
    v_total_days := 152;
    NEW.days_advanced := 0;
    NEW.extra_roi := 0.02;
  ELSIF v_cat = 'premium' THEN
    v_total_days := 152;
    NEW.days_advanced := 0;
    NEW.extra_roi := 0.04;
  ELSE -- 'estandar'
    v_total_days := 122;
    NEW.days_advanced := COALESCE(NEW.days_advanced, 0);
    IF NEW.days_advanced > 30 THEN
      NEW.days_advanced := 30;
    END IF;
    NEW.extra_roi := 0.00;
  END IF;

  NEW.cycle_days := v_total_days;
  NEW.days_remaining := GREATEST(1, v_total_days - NEW.days_advanced);
  NEW.current_weight := ROUND((6.0 + (NEW.days_advanced::NUMERIC / v_total_days::NUMERIC) * (82.5 - 6.0)), 1);
  NEW.current_month := CASE
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

-- Recalcular items activos del marketplace con las nuevas reglas
UPDATE public.marketplace SET category = category WHERE stock > 0;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. ACTUALIZAR MISIONES DE CICLO (M10 - PROPUESTA 1) Y MISIONES FLASH
-- ──────────────────────────────────────────────────────────────────────────────

-- Desactivar misiones flash de Piggy Plus o Avanzados > 30 días
UPDATE public.user_flash_missions
SET is_active = FALSE
WHERE LOWER(COALESCE(piggy_type::text, '')) IN ('plus', 'silver', 'plata', 'avanzado45', 'advanced45', 'avanzado60', 'advanced60', 'avanzado75', 'advanced75', 'avanzado90', 'advanced90');

-- Actualizar trigger y tabla `exclusive_piggy_config` (M10: 1-2 Piggies -> Dorado +2%, 3+ Piggies -> Premium +4%)
CREATE OR REPLACE FUNCTION public.auto_fill_exclusive_piggy_config()
RETURNS TRIGGER AS $$
BEGIN
  NEW.piggy_type := LOWER(TRIM(NEW.piggy_type));

  CASE NEW.piggy_type
    WHEN 'dorado', 'gold', 'plus', 'silver' THEN
      NEW.piggy_type       := 'dorado';
      NEW.piggy_label      := 'Piggy Dorado';
      NEW.extra_roi_bonus  := 0.02;
    WHEN 'premium' THEN
      NEW.piggy_type       := 'premium';
      NEW.piggy_label      := 'Piggy Premium';
      NEW.extra_roi_bonus  := 0.04;
    WHEN 'avanzado15', 'advanced15' THEN
      NEW.piggy_type       := 'avanzado15';
      NEW.piggy_label      := 'Piggy Avanzado (15d)';
      NEW.extra_roi_bonus  := 0.00;
    WHEN 'avanzado30', 'advanced30' THEN
      NEW.piggy_type       := 'avanzado30';
      NEW.piggy_label      := 'Piggy Avanzado (30d)';
      NEW.extra_roi_bonus  := 0.00;
    ELSE
      NEW.piggy_type       := 'dorado';
      NEW.piggy_label      := 'Piggy Dorado';
      NEW.extra_roi_bonus  := 0.02;
  END CASE;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DELETE FROM public.exclusive_piggy_config;

INSERT INTO public.exclusive_piggy_config (min_piggies, piggy_type, price, duration_hours, is_enabled)
VALUES
  (1, 'dorado', 1000000, 48, TRUE),
  (2, 'dorado', 1000000, 48, TRUE),
  (3, 'premium', 1000000, 48, TRUE);

-- Actualizar misiones de ciclo pendientes no completadas para que no ofrezcan Plus sino Dorado (+2%) o Premium (+4%)
UPDATE public.cycle_completion_missions
SET piggy_type = 'dorado', piggy_label = 'Piggy Dorado', extra_roi_bonus = 0.02
WHERE is_completed = FALSE AND LOWER(COALESCE(piggy_type::text, '')) IN ('plus', 'silver', 'dorado', 'gold');

UPDATE public.cycle_completion_missions
SET piggy_type = 'premium', piggy_label = 'Piggy Premium', extra_roi_bonus = 0.04
WHERE is_completed = FALSE AND LOWER(COALESCE(piggy_type::text, '')) = 'premium';

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. ACTUALIZAR RPC `buy_piggy` (CREA CERDITOS 'v2_2026' CON 122 O 152 DÍAS)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc
        WHERE proname = 'buy_piggy'
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.buy_piggy(
  p_item_id uuid,
  p_user_id uuid,
  p_price numeric,
  p_item_name text,
  p_extra_roi numeric DEFAULT 0,
  p_category text DEFAULT 'estandar',
  p_current_month integer DEFAULT 1,
  p_contract_url text DEFAULT NULL,
  p_contract_code text DEFAULT NULL
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
  v_total_cycle_days int := 122;
  v_extra_roi numeric := 0;
  v_category text;
  v_weight numeric := 6.0;
  v_final_weight numeric := 82.5;
BEGIN
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad detectada.';
  END IF;

  SELECT * INTO v_item
  FROM public.marketplace
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Item no encontrado en el marketplace';
  END IF;

  IF v_item.stock <= 0 THEN
    RAISE EXCEPTION 'No hay existencias disponibles (stock agotado)';
  END IF;

  v_category := LOWER(COALESCE(v_item.category::text, p_category, 'estandar'));

  IF v_category IN ('dorado', 'gold') THEN
    v_total_cycle_days := 152;
    v_extra_roi := 0.02;
    v_days_advanced := 0;
    v_final_weight := ROUND((90.1 + random() * (105.0 - 90.1))::numeric, 1);
  ELSIF v_category = 'premium' THEN
    v_total_cycle_days := 152;
    v_extra_roi := 0.04;
    v_days_advanced := 0;
    v_final_weight := ROUND((105.1 + random() * (120.0 - 105.1))::numeric, 1);
  ELSIF v_category IN ('avanzado15', 'advanced15') THEN
    v_total_cycle_days := 122;
    v_extra_roi := 0.00;
    v_days_advanced := 15;
    v_final_weight := ROUND((75.0 + random() * (90.0 - 75.0))::numeric, 1);
  ELSIF v_category IN ('avanzado30', 'advanced30', 'avanzado', 'advanced') THEN
    v_total_cycle_days := 122;
    v_extra_roi := 0.00;
    v_days_advanced := 30;
    v_final_weight := ROUND((75.0 + random() * (90.0 - 75.0))::numeric, 1);
  ELSE
    v_total_cycle_days := 122;
    v_extra_roi := COALESCE(v_item.extra_roi, p_extra_roi, 0.00);
    v_days_advanced := LEAST(30, GREATEST(0, COALESCE(v_item.days_advanced, 0)));
    v_final_weight := ROUND((75.0 + random() * (90.0 - 75.0))::numeric, 1);
  END IF;

  v_days_remaining := GREATEST(1, v_total_cycle_days - v_days_advanced);
  v_weight := CASE
    WHEN v_days_advanced > 0 THEN ROUND((6.0 + (v_days_advanced::numeric / v_total_cycle_days::numeric) * (v_final_weight - 6.0))::numeric, 1)
    ELSE 6.0
  END;

  UPDATE public.marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  INSERT INTO public.piggies (
    user_id, name, investment_amount, status,
    extra_roi_bonus, category, plan_version, cycle_days,
    current_weight, final_weight,
    purchase_date, end_date, contract_url, contract_code
  )
  VALUES (
    p_user_id, p_item_name, p_price, 'engorde',
    v_extra_roi, v_category, 'v2_2026', v_total_cycle_days,
    v_weight, v_final_weight,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval,
    p_contract_url, p_contract_code
  )
  RETURNING id INTO v_new_piggy_id;

  RETURN json_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'days_remaining', v_days_remaining,
    'cycle_days', v_total_cycle_days,
    'plan_version', 'v2_2026',
    'weight', v_weight,
    'final_weight', v_final_weight
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_piggy(uuid, uuid, numeric, text, numeric, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_piggy(uuid, uuid, numeric, text, numeric, text, integer, text, text) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. ACTUALIZAR RPCs `sync_piggy_weights` Y `mark_expired_piggies` (POR COHORTE)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_piggy_weights(p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_min_weight numeric := 6.0;
BEGIN
  IF p_user_id IS NOT NULL AND auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad';
  END IF;

  -- Usa cycle_days de cada cerdito (144 para v1_legacy, 122 o 152 para v2_2026)
  IF p_user_id IS NOT NULL THEN
    UPDATE public.piggies
    SET current_weight = CASE
      WHEN status = 'completado' OR end_date <= NOW() THEN COALESCE(final_weight, 85.0)
      ELSE ROUND((v_min_weight + (COALESCE(final_weight, 85.0) - v_min_weight) *
        LEAST(1.0, GREATEST(0.0, (COALESCE(cycle_days, 144)::numeric - GREATEST(0.0, EXTRACT(EPOCH FROM (end_date - NOW())) / 86400.0)) / COALESCE(cycle_days, 144)::numeric))
      )::numeric, 1)
    END
    WHERE status = 'engorde' AND user_id = p_user_id;
  ELSE
    UPDATE public.piggies
    SET current_weight = CASE
      WHEN status = 'completado' OR end_date <= NOW() THEN COALESCE(final_weight, 85.0)
      ELSE ROUND((v_min_weight + (COALESCE(final_weight, 85.0) - v_min_weight) *
        LEAST(1.0, GREATEST(0.0, (COALESCE(cycle_days, 144)::numeric - GREATEST(0.0, EXTRACT(EPOCH FROM (end_date - NOW())) / 86400.0)) / COALESCE(cycle_days, 144)::numeric))
      )::numeric, 1)
    END
    WHERE status = 'engorde';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_piggy_weights(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_piggy_weights(uuid) TO service_role;

-- Al vencer un cerdito, congela su locked_base_roi y final_return_amount según el volumen activo en ese instante y su plan_version
CREATE OR REPLACE FUNCTION public.mark_expired_piggies(p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_active_count integer;
BEGIN
  IF p_user_id IS NOT NULL AND auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad';
  END IF;

  IF p_user_id IS NOT NULL THEN
    -- Contar cuántos cerditos estaban en 'engorde' justo en el momento de cerrarse el ciclo
    SELECT COUNT(*) INTO v_active_count
    FROM public.piggies
    WHERE user_id = p_user_id AND status = 'engorde';

    v_active_count := GREATEST(1, COALESCE(v_active_count, 1));

    UPDATE public.piggies
    SET status = 'completado',
        current_weight = COALESCE(final_weight, current_weight, 85.0),
        locked_base_roi = CASE
          WHEN COALESCE(plan_version, 'v1_legacy') = 'v1_legacy' THEN
            CASE WHEN v_active_count >= 3 THEN 0.10 WHEN v_active_count = 2 THEN 0.09 ELSE 0.08 END
          ELSE
            CASE WHEN v_active_count >= 3 THEN 0.14 WHEN v_active_count = 2 THEN 0.13 ELSE 0.12 END
        END,
        final_return_amount = ROUND(
          COALESCE(investment_amount, 1000000) * (
            1.0 + COALESCE(extra_roi_bonus, 0) + (
              CASE
                WHEN COALESCE(plan_version, 'v1_legacy') = 'v1_legacy' THEN
                  CASE WHEN v_active_count >= 3 THEN 0.10 WHEN v_active_count = 2 THEN 0.09 ELSE 0.08 END
                ELSE
                  CASE WHEN v_active_count >= 3 THEN 0.14 WHEN v_active_count = 2 THEN 0.13 ELSE 0.12 END
              END
            )
          )
        )
    WHERE user_id = p_user_id
      AND status = 'engorde'
      AND end_date <= NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.mark_expired_piggies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_expired_piggies(uuid) TO service_role;

SELECT 'Migración V2 (12/13/14%, 122d/152d, Dorado +2%, Premium +4%, Avanzado 15d/30d) configurada sin alterar cerditos existentes.' AS estado;
