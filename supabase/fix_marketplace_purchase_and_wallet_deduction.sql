-- ==============================================================================
-- PIGGY APP: CORRECCIÓN ATÓMICA DE COMPRA EN MERCADO Y DÉBITO DE SALDO AGRO (V2)
-- Ejecuta este script en el SQL Editor de Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ASEGURAR QUE LA COLUMNA 'type' DE WALLET_TRANSACTIONS SEA VARCHAR FLEXIBLE
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.wallet_transactions ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TRIGGER BEFORE: FORMATEO UNIFORME DE MONTO (SIGNO POSITIVO / NEGATIVO)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.format_transaction_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_type_str text;
BEGIN
  v_type_str := LOWER(COALESCE(NEW.type::text, ''));
  IF v_type_str IN ('debit', 'withdrawal', 'purchase', 'canje', 'compra') 
     OR v_type_str LIKE '%debit%' 
     OR v_type_str LIKE '%retiro%' 
     OR v_type_str LIKE '%canje%' THEN
    NEW.amount := -ABS(NEW.amount);
  ELSE
    NEW.amount := ABS(NEW.amount);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_format_transaction_amount ON public.wallet_transactions;
CREATE TRIGGER trg_format_transaction_amount
BEFORE INSERT OR UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.format_transaction_amount();

-- ------------------------------------------------------------------------------
-- 3. TRIGGER AFTER: SINCRONIZACIÓN AUTOMÁTICA DE SALDO (handle_wallet_transaction_sync)
-- Usa texto nativo (NEW.type::text) para evitar errores 55P04 de ENUMs en PostgreSQL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_wallet_transaction_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_type_str text;
  v_delta numeric;
BEGIN
  v_type_str := LOWER(COALESCE(NEW.type::text, ''));
  
  -- Si es recarga simulada pendiente o rechazada, no altera saldo real
  IF NEW.simulation_status IS NOT NULL AND NEW.simulation_status NOT IN ('APPROVED', 'simulated_approved') THEN
    RETURN NEW;
  END IF;

  -- Solo afecta saldo de dinero si wallet_type es 'dinero' o nulo (no bonos de consumo)
  IF NEW.wallet_type IS NOT NULL AND NEW.wallet_type NOT IN ('dinero', 'wallet', 'principal') THEN
    RETURN NEW;
  END IF;

  -- Calcular el delta
  IF v_type_str IN ('credit', 'recharge', 'simulation_recharge', 'bono', 'cycle_completion', 'liquidation') THEN
    v_delta := ABS(NEW.amount);
  ELSIF v_type_str IN ('debit', 'withdrawal', 'purchase', 'canje', 'compra') THEN
    v_delta := -ABS(NEW.amount);
  ELSE
    v_delta := NEW.amount;
  END IF;

  -- Autorizar actualización para pasar el trigger de veeduría
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  UPDATE public.profiles
  SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) + v_delta)
  WHERE id = NEW.user_id;

  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enganchar trigger de sincronización
DROP TRIGGER IF EXISTS trg_handle_wallet_transaction_sync ON public.wallet_transactions;
DROP TRIGGER IF EXISTS trg_wallet_transaction_sync ON public.wallet_transactions;
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
DROP TRIGGER IF EXISTS on_wallet_transaction_insert ON public.wallet_transactions;

CREATE TRIGGER trg_handle_wallet_transaction_sync
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_wallet_transaction_sync();

-- ------------------------------------------------------------------------------
-- 4. RPC DEDICADA PARA DÉBITO SEGURO DE WALLET (Flash Missions / Silver Piggy)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_amount numeric,
  p_description text DEFAULT 'Débito: compra de Piggy'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_bal numeric;
  v_new_bal numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
  END IF;

  -- Bloquear y validar saldo del usuario
  SELECT wallet_balance INTO v_current_bal
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_bal IS NULL OR v_current_bal < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'insufficient_balance', 
      'current_balance', COALESCE(v_current_bal, 0)
    );
  END IF;

  -- Registrar movimiento en libro contable (el trigger trg_handle_wallet_transaction_sync sincroniza el saldo en profiles)
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
    v_user_id,
    -p_amount,
    'debit',
    COALESCE(p_description, 'Débito: compra de Piggy'),
    'dinero',
    'SALDO_AGRO',
    'APPROVED'
  );

  SELECT wallet_balance INTO v_new_bal
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal);
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance TO service_role;

-- ------------------------------------------------------------------------------
-- 5. FUNCIÓN TRANSACCIONAL ATÓMICA DE COMPRA (buy_piggy)
-- Valida saldo + descuenta stock + crea piggy + registra débito (que descuenta saldo vía trigger)
-- ------------------------------------------------------------------------------
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
  p_extra_roi numeric,
  p_category text,
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
  v_total_cycle_days int := 143; -- ~4 meses 3 semanas
  v_full_name text;
  v_stage int;
  v_image_url text;
  v_final_contract_code text;
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
  SELECT stock, image_url INTO v_current_stock, v_image_url
  FROM public.marketplace
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Item no encontrado en el marketplace';
  END IF;

  IF v_current_stock <= 0 THEN
    RAISE EXCEPTION 'El Piggy seleccionado ya no tiene stock disponible';
  END IF;

  -- 3. Calcular tiempos y etapa de engorde
  v_days_elapsed := GREATEST(0, (p_current_month - 1) * 30);
  v_days_remaining := GREATEST(1, v_total_cycle_days - v_days_elapsed);

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
    purchase_date, end_date, image_url, contract_url, contract_code
  )
  VALUES (
    v_new_piggy_id, p_user_id, p_item_name, v_full_name, p_price, 'engorde',
    p_extra_roi, p_category, 15.0,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval,
    v_image_url,
    p_contract_url,
    v_final_contract_code
  );

  -- 7. REGISTRAR DÉBITO EN WALLET_TRANSACTIONS
  -- El trigger trg_handle_wallet_transaction_sync sincroniza automáticamente el saldo en profiles
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
    'new_balance', COALESCE(v_new_balance, v_wallet_balance - p_price),
    'days_remaining', v_days_remaining,
    'contract_code', v_final_contract_code,
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_piggy TO service_role;

-- ------------------------------------------------------------------------------
-- 6. AJUSTE DE CUENTA DE DIOMEDES (APLICAR DÉBITO PENDIENTE DE "Timón")
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_diomedes_id uuid := '3349c043-bd00-4937-a831-6b5e6bb91738';
  v_has_tx boolean;
BEGIN
  -- Verificar si ya existe la transacción de Timón
  SELECT EXISTS(
    SELECT 1 FROM public.wallet_transactions 
    WHERE user_id = v_diomedes_id 
    AND (description ILIKE '%Timón%' OR (amount = -1200000 AND created_at >= '2026-08-29'))
  ) INTO v_has_tx;

  IF NOT v_has_tx THEN
    -- Insertar el movimiento oficial de débito por 1.200.000 COP
    -- El trigger trg_handle_wallet_transaction_sync actualiza automáticamente profiles.wallet_balance
    INSERT INTO public.wallet_transactions (
      user_id,
      amount,
      type,
      description,
      wallet_type,
      payment_method,
      simulation_status,
      created_at
    )
    VALUES (
      v_diomedes_id,
      -1200000,
      'debit',
      'Débito: compra de Piggy "Timón"',
      'dinero',
      'SALDO_AGRO',
      'APPROVED',
      '2026-08-29 16:37:52.336583-05:00'::timestamptz
    );

    RAISE NOTICE 'Transacción de Timón registrada y saldo descontado a Diomedes correctamente.';
  END IF;
END $$;
