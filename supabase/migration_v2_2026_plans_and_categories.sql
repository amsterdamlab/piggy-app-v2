-- ==============================================================================
-- PIGGY APP — MIGRACIÓN OFICIAL V2 (2026-11): NUEVOS PORCENTAJES, TIEMPOS Y CATEGORÍAS
-- 100% NO DESTRUCTIVA: GARANTIZA CERO CAMBIOS EN TIEMPO RESTANTE (end_date),
-- PORCENTAJES, CONTRATOS, PESOS, LIQUIDACIONES Y SALDOS DE USUARIOS ACTUALES.
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. AGREGAR COLUMNAS DE COHORTE Y SELLAR TODOS LOS CERDITOS EXISTENTES ('v1_legacy')
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS plan_version TEXT;
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS cycle_days INTEGER;
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS locked_base_roi NUMERIC;
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS final_return_amount NUMERIC;

-- Sellar TODOS los cerditos actuales (los 40+ en engorde y todos los completados)
-- como 'v1_legacy' (ciclo base original de 144 días, tabla 8% / 9% / 10%).
-- NOTA CRÍTICA: NO se toca end_date, purchase_date, fixed_end_date, contract_url,
-- contract_code, investment_amount, extra_roi_bonus, current_weight ni final_weight.
-- Como el tiempo restante se calcula como (end_date - HOY), a los que les faltan
-- 41 días les seguirán faltando 41 días y a los de 97 días les seguirán faltando 97 días.
UPDATE public.piggies
SET plan_version = 'v1_legacy',
    cycle_days = COALESCE(cycle_days, 144)
WHERE plan_version IS NULL;

-- Solo para las NUEVAS compras que se inserten de aquí en adelante:
ALTER TABLE public.piggies ALTER COLUMN plan_version SET DEFAULT 'v2_2026';
ALTER TABLE public.piggies ALTER COLUMN cycle_days SET DEFAULT 122;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. TRIGGER NO INVASIVO PARA CONGELAR EL RETORNO AL COMPLETARSE UN CICLO
--    (No reemplaza ni altera tu función mark_expired_piggies actual)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_lock_piggy_roi_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INTEGER;
  v_base_roi NUMERIC;
BEGIN
  -- Solo actuar cuando un cerdito pasa de 'engorde' a 'completado' o 'liquidado'
  IF OLD.status = 'engorde' AND NEW.status IN ('completado', 'liquidado') THEN
    -- Contar cuántos cerditos activos tenía el usuario en este momento (incluyendo el que vence hoy)
    SELECT COUNT(*) INTO v_active_count
    FROM public.piggies
    WHERE user_id = NEW.user_id AND status = 'engorde';

    v_active_count := GREATEST(1, COALESCE(v_active_count, 1));

    IF COALESCE(NEW.plan_version, 'v1_legacy') = 'v1_legacy' THEN
      v_base_roi := CASE
        WHEN v_active_count >= 3 THEN 0.10
        WHEN v_active_count = 2 THEN 0.09
        ELSE 0.08
      END;
    ELSE
      v_base_roi := CASE
        WHEN v_active_count >= 3 THEN 0.14
        WHEN v_active_count = 2 THEN 0.13
        ELSE 0.12
      END;
    END IF;

    NEW.locked_base_roi := COALESCE(NEW.locked_base_roi, v_base_roi);
    NEW.final_return_amount := COALESCE(
      NEW.final_return_amount,
      ROUND(COALESCE(NEW.investment_amount, 1000000) * (1.0 + NEW.locked_base_roi + COALESCE(NEW.extra_roi_bonus, 0)))
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_piggy_roi_on_completion ON public.piggies;
CREATE TRIGGER trg_lock_piggy_roi_on_completion
BEFORE UPDATE ON public.piggies
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_lock_piggy_roi_on_completion();

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. AGREGAR 'avanzado15' AL ENUM DE CATEGORÍAS Y ADECUAR `marketplace`
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'piggy_category_enum') THEN
    ALTER TYPE public.piggy_category_enum ADD VALUE IF NOT EXISTS 'avanzado15';
  END IF;
END $$;

ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS cycle_days INTEGER DEFAULT 122;

-- Ocultar del Mercado únicamente las categorías descontinuadas: Piggy Plus y Avanzados > 30 días
UPDATE public.marketplace
SET stock = 0
WHERE category::text IN ('plus', 'silver', 'plata', 'avanzado45', 'advanced45', 'avanzado60', 'advanced60', 'avanzado75', 'advanced75', 'avanzado90', 'advanced90')
   OR (fixed_end_date IS NULL AND COALESCE(days_advanced, 0) > 30);

-- Actualizar trigger de cálculo automático en `marketplace` (preservando soporte de fixed_end_date)
CREATE OR REPLACE FUNCTION public.trg_auto_calc_marketplace_item()
RETURNS TRIGGER AS $$
DECLARE
  v_cat TEXT;
  v_total_days INT := 122;
BEGIN
  v_cat := LOWER(TRIM(COALESCE(NEW.category::TEXT, 'estandar')));

  IF v_cat IN ('dorado', 'gold', 'premium') THEN
    v_total_days := 152;
  ELSE
    v_total_days := 122;
  END IF;

  -- A. Si tiene fecha fija asignada (fixed_end_date), respetar sus días restantes exactos por calendario
  IF NEW.fixed_end_date IS NOT NULL THEN
    NEW.days_remaining := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (NEW.fixed_end_date - NOW())) / 86400));
    NEW.days_advanced := GREATEST(0, LEAST(v_total_days - 1, v_total_days - NEW.days_remaining));

    IF v_cat IN ('dorado', 'gold') THEN
      NEW.extra_roi := 0.02;
    ELSIF v_cat = 'premium' THEN
      NEW.extra_roi := 0.04;
    ELSE
      NEW.extra_roi := COALESCE(NEW.extra_roi, 0.00);
    END IF;

  -- B. Si NO tiene fecha fija, cálculo estándar V2
  ELSE
    IF v_cat IN ('avanzado15', 'advanced15') THEN
      NEW.days_advanced := 15;
      NEW.extra_roi := 0.00;
    ELSIF v_cat IN ('avanzado30', 'advanced30', 'avanzado', 'advanced') THEN
      NEW.days_advanced := 30;
      NEW.extra_roi := 0.00;
    ELSIF v_cat IN ('dorado', 'gold') THEN
      NEW.days_advanced := 0;
      NEW.extra_roi := 0.02;
    ELSIF v_cat = 'premium' THEN
      NEW.days_advanced := 0;
      NEW.extra_roi := 0.04;
    ELSE -- 'estandar'
      NEW.days_advanced := LEAST(30, GREATEST(0, COALESCE(NEW.days_advanced, 0)));
      NEW.extra_roi := 0.00;
    END IF;

    NEW.days_remaining := GREATEST(1, v_total_days - NEW.days_advanced);
  END IF;

  NEW.cycle_days := v_total_days;
  NEW.current_weight := ROUND((6.0 + (NEW.days_advanced::NUMERIC / v_total_days::NUMERIC) * (82.5 - 6.0)), 1);
  NEW.current_month := CASE
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

-- Actualizar items activos del marketplace que NO tienen fecha fija
UPDATE public.marketplace
SET category = category
WHERE stock > 0 AND fixed_end_date IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. ACTUALIZAR MISIONES DE CICLO (M10 - PROPUESTA 1) Y MISIONES FLASH
-- ──────────────────────────────────────────────────────────────────────────────

-- Desactivar misiones flash pendientes de Piggy Plus o Avanzados > 30 días
UPDATE public.user_flash_missions
SET is_active = FALSE
WHERE is_purchased = FALSE
  AND LOWER(COALESCE(piggy_type::text, '')) IN ('plus', 'silver', 'plata', 'avanzado45', 'advanced45', 'avanzado60', 'advanced60', 'avanzado75', 'advanced75', 'avanzado90', 'advanced90');

-- Actualizar trigger y tabla `exclusive_piggy_config` (M10: 1-2 Piggies -> Dorado +2%, 3+ Piggies -> Premium +4%)
CREATE OR REPLACE FUNCTION public.auto_fill_exclusive_piggy_config()
RETURNS TRIGGER AS $$
BEGIN
  NEW.piggy_type := LOWER(TRIM(NEW.piggy_type::text));

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

-- Actualizar misiones de ciclo pendientes no completadas para ofrecer Dorado (+2%) o Premium (+4%)
UPDATE public.cycle_completion_missions
SET piggy_type = 'dorado', piggy_label = 'Piggy Dorado', extra_roi_bonus = 0.02
WHERE is_completed = FALSE AND LOWER(COALESCE(piggy_type::text, '')) IN ('plus', 'silver', 'dorado', 'gold');

UPDATE public.cycle_completion_missions
SET piggy_type = 'premium', piggy_label = 'Piggy Premium', extra_roi_bonus = 0.04
WHERE is_completed = FALSE AND LOWER(COALESCE(piggy_type::text, '')) = 'premium';

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. ACTUALIZAR RPC TRANSACCIONAL `buy_piggy` (CON DÉBITO CONTABLE, CONTRATO Y REFERIDOS)
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
  v_current_stock int;
  v_wallet_balance numeric;
  v_new_balance numeric;
  v_referral_result jsonb;
  v_days_advanced int := 0;
  v_days_remaining int;
  v_total_cycle_days int := 122;
  v_full_name text;
  v_stage int;
  v_image_url text;
  v_fixed_end_date timestamptz;
  v_final_end_date timestamptz;
  v_final_contract_code text;
  v_weight numeric := 6.0;
  v_final_weight numeric := 82.5;
  v_extra_roi numeric := 0;
  v_category text;
BEGIN
  -- 🔒 Verificación de seguridad (anti-suplantación)
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad detectada.';
  END IF;

  -- 1. Validar y bloquear saldo del usuario
  SELECT wallet_balance, full_name INTO v_wallet_balance, v_full_name
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_wallet_balance IS NULL OR v_wallet_balance < p_price THEN
    RAISE EXCEPTION 'Saldo insuficiente en tu Cuenta Agro para comprar este Piggy (Saldo: %, Requerido: %)', COALESCE(v_wallet_balance, 0), p_price;
  END IF;

  -- 2. Validar y bloquear stock del marketplace
  SELECT stock, image_url, fixed_end_date, days_remaining, days_advanced, current_weight, extra_roi, category::text
  INTO v_current_stock, v_image_url, v_fixed_end_date, v_days_remaining, v_days_advanced, v_weight, v_extra_roi, v_category
  FROM public.marketplace
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Item no encontrado en el marketplace';
  END IF;

  IF v_current_stock <= 0 THEN
    RAISE EXCEPTION 'El Piggy seleccionado ya no tiene stock disponible';
  END IF;

  v_category := LOWER(COALESCE(v_category, p_category, 'estandar'));

  -- 3. Determinar duración de ciclo V2, bono extra y peso objetivo final
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
    v_extra_roi := COALESCE(v_extra_roi, p_extra_roi, 0.00);
    v_days_advanced := LEAST(30, GREATEST(0, COALESCE(v_days_advanced, (COALESCE(p_current_month, 1) - 1) * 30)));
    v_final_weight := ROUND((75.0 + random() * (90.0 - 75.0))::numeric, 1);
  END IF;

  IF v_fixed_end_date IS NOT NULL THEN
    v_final_end_date := v_fixed_end_date;
    v_days_remaining := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_fixed_end_date - NOW())) / 86400));
    v_days_advanced := GREATEST(0, v_total_cycle_days - v_days_remaining);
  ELSE
    v_days_remaining := GREATEST(1, v_total_cycle_days - v_days_advanced);
    v_final_end_date := NOW() + (v_days_remaining || ' days')::interval;
  END IF;

  v_weight := CASE
    WHEN v_days_advanced > 0 THEN ROUND((6.0 + (v_days_advanced::numeric / v_total_cycle_days::numeric) * (v_final_weight - 6.0))::numeric, 1)
    ELSE 6.0
  END;

  IF v_days_advanced > 75 THEN
    v_stage := 3;
  ELSIF v_days_advanced >= 30 THEN
    v_stage := 2;
  ELSE
    v_stage := 1;
  END IF;

  IF v_image_url IS NULL OR v_image_url = '' THEN
    v_image_url := 'assets/piggies/stage' || v_stage || '/et' || v_stage || '-1.jpg';
  END IF;

  -- 4. Decrementar stock en marketplace
  UPDATE public.marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- 5. Generar UUID y código del contrato
  v_new_piggy_id := gen_random_uuid();

  IF p_contract_code IS NOT NULL AND p_contract_code <> '' THEN
    v_final_contract_code := p_contract_code;
  ELSIF p_contract_url IS NOT NULL AND p_contract_url <> '' THEN
    v_final_contract_code := substring(p_contract_url from 'PGY-TX-[A-Za-z0-9]+-([A-Za-z0-9]+)');
    IF v_final_contract_code IS NOT NULL THEN
      v_final_contract_code := 'PGY-TX-' || upper(v_final_contract_code);
    ELSE
      v_final_contract_code := '#' || upper(substring(replace(v_new_piggy_id::text, '-', '') from 27 for 6));
    END IF;
  ELSE
    v_final_contract_code := '#' || upper(substring(replace(v_new_piggy_id::text, '-', '') from 27 for 6));
  END IF;

  -- 6. Insertar Piggy con plan_version = 'v2_2026'
  INSERT INTO public.piggies (
    id, user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, plan_version, cycle_days,
    current_weight, final_weight,
    purchase_date, end_date, fixed_end_date, image_url, contract_url, contract_code
  )
  VALUES (
    v_new_piggy_id, p_user_id, p_item_name, v_full_name, p_price, 'engorde',
    v_extra_roi, v_category, 'v2_2026', v_total_cycle_days,
    v_weight, v_final_weight,
    NOW(),
    v_final_end_date,
    v_fixed_end_date,
    v_image_url,
    p_contract_url,
    v_final_contract_code
  );

  -- 7. Registrar débito en wallet_transactions (sincroniza wallet_balance en profiles vía trigger canónico)
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    description,
    wallet_type,
    payment_method,
    simulation_status
  )
  VALUES (
    p_user_id,
    -p_price,
    'debit',
    'Débito: compra de Piggy "' || p_item_name || '"',
    'dinero',
    'SALDO_AGRO',
    'APPROVED'
  );

  -- 8. Leer saldo real actualizado
  SELECT wallet_balance INTO v_new_balance
  FROM public.profiles
  WHERE id = p_user_id;

  -- 9. Procesar comisión por referidos si aplica
  BEGIN
    v_referral_result := process_referral_on_purchase(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_referral_result := jsonb_build_object('triggered', false, 'reason', 'error');
  END;

  RETURN json_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'new_balance', v_new_balance,
    'end_date', v_final_end_date,
    'days_remaining', v_days_remaining,
    'cycle_days', v_total_cycle_days,
    'plan_version', 'v2_2026',
    'weight', v_weight,
    'final_weight', v_final_weight,
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_piggy(uuid, uuid, numeric, text, numeric, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_piggy(uuid, uuid, numeric, text, numeric, text, integer, text, text) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. ACTUALIZAR RPCs ATÓMICAS DE MISIONES FLASH Y MISIONES DE CICLO (M10)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.buy_flash_mission_atomic(
  p_mission_id UUID,
  p_custom_name TEXT,
  p_contract_url TEXT DEFAULT NULL,
  p_contract_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_mission RECORD;
  v_profile RECORD;
  v_price NUMERIC;
  v_final_name TEXT;
  v_new_piggy_id UUID;
  v_category TEXT;
  v_extra_roi NUMERIC := 0;
  v_total_cycle_days INTEGER := 122;
  v_days_remaining INTEGER := 122;
  v_weight NUMERIC := 6.0;
  v_final_weight NUMERIC := 82.5;
  v_end_date TIMESTAMPTZ;
  v_raw_type TEXT;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT id, wallet_balance, full_name INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  SELECT * INTO v_mission
  FROM public.user_flash_missions
  WHERE id = p_mission_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_mission IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Misión no encontrada');
  END IF;

  IF v_mission.is_purchased = TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta misión ya fue comprada');
  END IF;

  IF v_mission.scheduled_at IS NOT NULL AND NOW() < v_mission.scheduled_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta oferta aún no está disponible');
  END IF;

  IF v_mission.expires_at IS NOT NULL AND NOW() >= v_mission.expires_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'La oferta ha expirado');
  END IF;

  v_raw_type := LOWER(COALESCE(v_mission.piggy_type::text, 'avanzado30'));
  v_price := COALESCE(v_mission.price, 1000000);

  IF COALESCE(v_profile.wallet_balance, 0) < v_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente en tu Cuenta Agro',
      'current_balance', COALESCE(v_profile.wallet_balance, 0),
      'required_price', v_price
    );
  END IF;

  IF v_raw_type IN ('advanced15', 'avanzado15') THEN
    v_category := 'avanzado15';
    v_extra_roi := 0;
    v_total_cycle_days := 122;
    v_days_remaining := 107;
    v_weight := 15.4;
    v_final_weight := ROUND((75.0 + random() * (90.0 - 75.0))::numeric, 1);
  ELSIF v_raw_type IN ('advanced30', 'avanzado30', 'avanzado', 'advanced') THEN
    v_category := 'avanzado30';
    v_extra_roi := 0;
    v_total_cycle_days := 122;
    v_days_remaining := 92;
    v_weight := 24.8;
    v_final_weight := ROUND((75.0 + random() * (90.0 - 75.0))::numeric, 1);
  ELSIF v_raw_type IN ('dorado', 'gold') THEN
    v_category := 'dorado';
    v_extra_roi := 0.02;
    v_total_cycle_days := 152;
    v_days_remaining := 152;
    v_weight := 6.0;
    v_final_weight := ROUND((90.1 + random() * (105.0 - 90.1))::numeric, 1);
  ELSIF v_raw_type = 'premium' THEN
    v_category := 'premium';
    v_extra_roi := 0.04;
    v_total_cycle_days := 152;
    v_days_remaining := 152;
    v_weight := 6.0;
    v_final_weight := ROUND((105.1 + random() * (120.0 - 105.1))::numeric, 1);
  ELSE
    v_category := 'dorado';
    v_extra_roi := 0.02;
    v_total_cycle_days := 152;
    v_days_remaining := 152;
    v_weight := 6.0;
    v_final_weight := ROUND((90.1 + random() * (105.0 - 90.1))::numeric, 1);
  END IF;

  v_final_name := COALESCE(NULLIF(TRIM(p_custom_name), ''), v_mission.piggy_label, v_mission.title, 'Piggy Flash');
  v_end_date := NOW() + (v_days_remaining || ' days')::interval;
  v_new_piggy_id := gen_random_uuid();

  INSERT INTO public.wallet_transactions (
    user_id, amount, type, description, wallet_type, payment_method, simulation_status
  ) VALUES (
    v_user_id, -v_price, 'purchase', 'Compra de Oferta Flash: ' || v_final_name, 'dinero', 'SALDO_AGRO', 'APPROVED'
  );

  INSERT INTO public.piggies (
    id, user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, plan_version, cycle_days,
    current_weight, final_weight, purchase_date, end_date, contract_url, contract_code
  ) VALUES (
    v_new_piggy_id, v_user_id, v_final_name, COALESCE(v_profile.full_name, ''), v_price, 'engorde',
    v_extra_roi, v_category, 'v2_2026', v_total_cycle_days,
    v_weight, v_final_weight, NOW(), v_end_date, p_contract_url, p_contract_code
  );

  UPDATE public.user_flash_missions
  SET is_purchased = TRUE,
      is_active = FALSE,
      purchased_at = NOW(),
      purchased_piggy_id = v_new_piggy_id
  WHERE id = p_mission_id;

  SELECT wallet_balance INTO v_new_balance
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'new_balance', v_new_balance,
    'piggy', jsonb_build_object(
      'id', v_new_piggy_id,
      'name', v_final_name,
      'investment_amount', v_price,
      'category', v_category,
      'plan_version', 'v2_2026',
      'cycle_days', v_total_cycle_days,
      'status', 'engorde'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_flash_mission_atomic(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_flash_mission_atomic(UUID, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.buy_cycle_mission_atomic(
  p_mission_id UUID,
  p_custom_name TEXT,
  p_contract_url TEXT DEFAULT NULL,
  p_contract_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_mission RECORD;
  v_profile RECORD;
  v_price NUMERIC;
  v_final_name TEXT;
  v_new_piggy_id UUID;
  v_new_balance NUMERIC;
  v_category TEXT;
  v_extra_roi NUMERIC;
  v_final_weight NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT id, wallet_balance, full_name INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  SELECT * INTO v_mission
  FROM public.cycle_completion_missions
  WHERE id = p_mission_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_mission IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Misión de ciclo no encontrada');
  END IF;

  IF v_mission.is_completed = TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta misión ya fue completada');
  END IF;

  IF v_mission.expires_at IS NOT NULL AND NOW() >= v_mission.expires_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'La oferta ha expirado');
  END IF;

  v_price := COALESCE(v_mission.price, 1000000);

  IF COALESCE(v_profile.wallet_balance, 0) < v_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente en tu Cuenta Agro',
      'current_balance', COALESCE(v_profile.wallet_balance, 0),
      'required_price', v_price
    );
  END IF;

  IF LOWER(COALESCE(v_mission.piggy_type::text, 'dorado')) = 'premium' THEN
    v_category := 'premium';
    v_extra_roi := 0.04;
    v_final_weight := ROUND((105.1 + random() * (120.0 - 105.1))::numeric, 1);
  ELSE
    v_category := 'dorado';
    v_extra_roi := 0.02;
    v_final_weight := ROUND((90.1 + random() * (105.0 - 90.1))::numeric, 1);
  END IF;

  v_final_name := COALESCE(NULLIF(TRIM(p_custom_name), ''), v_mission.piggy_label, 'Piggy Ciclo');
  v_new_piggy_id := gen_random_uuid();

  INSERT INTO public.wallet_transactions (
    user_id, amount, type, description, wallet_type, payment_method, simulation_status
  ) VALUES (
    v_user_id, -v_price, 'purchase', 'Compra de Oferta Exclusiva M10: ' || v_final_name, 'dinero', 'SALDO_AGRO', 'APPROVED'
  );

  INSERT INTO public.piggies (
    id, user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, plan_version, cycle_days,
    current_weight, final_weight, purchase_date, end_date, contract_url, contract_code
  ) VALUES (
    v_new_piggy_id, v_user_id, v_final_name, COALESCE(v_profile.full_name, ''), v_price, 'engorde',
    v_extra_roi, v_category, 'v2_2026', 152,
    6.0, v_final_weight, NOW(), NOW() + interval '152 days', p_contract_url, p_contract_code
  );

  UPDATE public.cycle_completion_missions
  SET is_completed = TRUE,
      purchased_piggy_id = v_new_piggy_id,
      purchased_at = NOW()
  WHERE id = p_mission_id;

  SELECT wallet_balance INTO v_new_balance
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'new_balance', v_new_balance,
    'piggy', jsonb_build_object(
      'id', v_new_piggy_id,
      'name', v_final_name,
      'investment_amount', v_price,
      'category', v_category,
      'plan_version', 'v2_2026',
      'cycle_days', 152,
      'status', 'engorde'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_cycle_mission_atomic(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_cycle_mission_atomic(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. ACTUALIZAR `sync_piggy_weights` (RESPETANDO cycle_days DE CADA CERDITO: 144, 122 O 152)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_piggy_weights(p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_min_weight numeric := 6.0;
BEGIN
  IF p_user_id IS NOT NULL AND auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad';
  END IF;

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

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. CONSULTA DE VERIFICACIÓN POST-MIGRACIÓN (MUESTRA CONTEO DE CERDITOS PROTEGIDOS)
-- ──────────────────────────────────────────────────────────────────────────────
SELECT
  plan_version,
  status,
  cycle_days,
  COUNT(*) AS total_cerditos,
  MIN(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (end_date - NOW())) / 86400))) AS min_dias_restantes,
  MAX(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (end_date - NOW())) / 86400))) AS max_dias_restantes
FROM public.piggies
GROUP BY plan_version, status, cycle_days
ORDER BY plan_version, status;
