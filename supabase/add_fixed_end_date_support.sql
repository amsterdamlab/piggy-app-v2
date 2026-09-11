-- ==============================================================================
-- PIGGY APP — SOPORTE PARA FECHA FIJA DE VENCIMIENTO (fixed_end_date)
-- Ejecuta este script en el Editor SQL de Supabase
-- ==============================================================================

-- 1. AGREGAR COLUMNA `fixed_end_date` A `marketplace` Y `piggies`
ALTER TABLE public.marketplace 
ADD COLUMN IF NOT EXISTS fixed_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.piggies 
ADD COLUMN IF NOT EXISTS fixed_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. ACTUALIZAR TRIGGER DE AUTO-CÁLCULO EN `marketplace`
-- Si un cerdito tiene `fixed_end_date`, calcula automáticamente days_remaining, days_advanced, peso y mes
CREATE OR REPLACE FUNCTION public.trg_auto_calc_marketplace_item()
RETURNS TRIGGER AS $$
DECLARE
  v_cat TEXT;
  v_total_days INT := 144;
BEGIN
  v_cat := NEW.category::TEXT;

  -- A. Si tiene fecha fija asignada, calcular días en base al calendario
  IF NEW.fixed_end_date IS NOT NULL THEN
    NEW.days_remaining := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (NEW.fixed_end_date - NOW())) / 86400));
    NEW.days_advanced := GREATEST(0, LEAST(140, v_total_days - NEW.days_remaining));
    
    -- Extra ROI según categoría
    IF v_cat = 'plus' THEN
      NEW.extra_roi := 0.01;
    ELSIF v_cat = 'dorado' THEN
      NEW.extra_roi := 0.02;
    ELSIF v_cat = 'premium' THEN
      NEW.extra_roi := 0.03;
    ELSE
      NEW.extra_roi := COALESCE(NEW.extra_roi, 0.00);
    END IF;

  -- B. Si NO tiene fecha fija, comportamiento estándar relativo
  ELSE
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

    NEW.days_advanced := GREATEST(0, LEAST(140, NEW.days_advanced));
    NEW.days_remaining := GREATEST(1, v_total_days - NEW.days_advanced);
  END IF;

  -- Calcular peso inicial/actual según avance biológico
  NEW.current_weight := ROUND((6.0 + (NEW.days_advanced::NUMERIC / v_total_days::NUMERIC) * (85.0 - 6.0)), 1);

  -- Calcular mes representativo
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

-- 3. ACTUALIZAR FUNCIÓN TRANSACCIONAL DE COMPRA `buy_piggy`
-- Limpiar sobrecargas
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure as proc_name
        FROM pg_proc 
        WHERE proname = 'buy_piggy'
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.proc_name;
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
  v_days_elapsed int;
  v_days_remaining int;
  v_total_cycle_days int := 144;
  v_full_name text;
  v_stage int;
  v_image_url text;
  v_fixed_end_date timestamptz;
  v_final_end_date timestamptz;
  v_final_contract_code text;
  v_weight numeric := 6.0;
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
  SELECT stock, image_url, fixed_end_date, days_remaining, current_weight, extra_roi, category::text
  INTO v_current_stock, v_image_url, v_fixed_end_date, v_days_remaining, v_weight, v_extra_roi, v_category
  FROM public.marketplace
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Item no encontrado en el marketplace';
  END IF;

  IF v_current_stock <= 0 THEN
    RAISE EXCEPTION 'El Piggy seleccionado ya no tiene stock disponible';
  END IF;

  -- 3. Calcular tiempos, fecha de vencimiento y etapa
  IF v_fixed_end_date IS NOT NULL THEN
    v_final_end_date := v_fixed_end_date;
    v_days_remaining := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_fixed_end_date - NOW())) / 86400));
    v_days_elapsed := GREATEST(0, v_total_cycle_days - v_days_remaining);
  ELSE
    v_days_elapsed := GREATEST(0, (COALESCE(p_current_month, 1) - 1) * 30);
    v_days_remaining := COALESCE(v_days_remaining, GREATEST(1, v_total_cycle_days - v_days_elapsed));
    v_final_end_date := NOW() + (v_days_remaining || ' days')::interval;
  END IF;

  IF v_days_elapsed > 90 THEN
    v_stage := 3;
  ELSIF v_days_elapsed > 30 THEN
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

  -- 6. Insertar Piggy en la base de datos
  INSERT INTO public.piggies (
    id, user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, current_weight,
    purchase_date, end_date, fixed_end_date, image_url, contract_url, contract_code
  )
  VALUES (
    v_new_piggy_id, p_user_id, p_item_name, v_full_name, p_price, 'engorde',
    COALESCE(v_extra_roi, p_extra_roi, 0.00),
    COALESCE(v_category, p_category, 'estandar'),
    COALESCE(v_weight, 6.0),
    NOW(),
    v_final_end_date,
    v_fixed_end_date,
    v_image_url,
    p_contract_url,
    v_final_contract_code
  );

  -- 7. REGISTRAR DÉBITO EN WALLET_TRANSACTIONS
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
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_piggy TO service_role;
