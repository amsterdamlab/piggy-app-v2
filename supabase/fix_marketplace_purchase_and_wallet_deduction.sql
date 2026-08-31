-- ==============================================================================
-- PIGGY APP: CORRECCIÓN ATÓMICA DE COMPRA EN MERCADO Y DÉBITO DE SALDO AGRO
-- Ejecuta este script en el SQL Editor de Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ASEGURAR COMPATIBILIDAD DE TIPOS EN WALLET_TRANSACTIONS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  -- Si existe el enum transaction_type_enum, agregar los valores necesarios
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'debit';
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'credit';
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'recharge';
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'withdrawal';
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'simulation_recharge';
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'purchase';
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'bono';
  ALTER TYPE public.transaction_type_enum ADD VALUE IF NOT EXISTS 'canje';
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Convertir columna 'type' a VARCHAR para evitar bloqueos por enums rígidos
DO $$ BEGIN
  ALTER TABLE public.wallet_transactions ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TRIGGER DE FORMATEO DE MONTO (SIGNO POSITIVO / NEGATIVO)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.format_transaction_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(NEW.type::text) LIKE '%debit%' 
     OR LOWER(NEW.type::text) LIKE '%retiro%' 
     OR LOWER(NEW.type::text) LIKE '%canje%' 
     OR LOWER(NEW.type::text) LIKE '%withdrawal%' THEN
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
-- 3. RPC DEDICADA PARA DÉBITO SEGURO DE WALLET (Flash Missions / Silver Piggy)
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

  v_new_bal := v_current_bal - p_amount;

  -- 🟢 Autorización para pasar Veeduría
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  -- Registrar movimiento en libro contable
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

  -- Actualizar saldo en profiles
  UPDATE public.profiles
  SET wallet_balance = v_new_bal
  WHERE id = v_user_id;

  -- 🔴 Cerrar autorización
  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal);
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance TO service_role;

-- ------------------------------------------------------------------------------
-- 4. FUNCIÓN TRANSACCIONAL ATÓMICA DE COMPRA (buy_piggy)
-- Descuenta saldo + crea movimiento contable + descuenta stock + crea piggy
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

  -- 7. REGISTRAR DÉBITO Y ACTUALIZAR SALDO ATÓMICAMENTE EN DB
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

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

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_price
  WHERE id = p_user_id;

  PERFORM set_config('app.wallet_update_authorized', '', true);

  -- 8. Procesar comisión por referidos si aplica
  BEGIN
    v_referral_result := process_referral_on_purchase(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_referral_result := jsonb_build_object('triggered', false, 'reason', 'error');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'new_balance', (v_wallet_balance - p_price),
    'days_remaining', v_days_remaining,
    'contract_code', v_final_contract_code,
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_piggy TO service_role;

-- ------------------------------------------------------------------------------
-- 5. AJUSTE DE CUENTA DE DIOMEDES (APLICAR DÉBITO PENDIENTE DE "Timón")
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
    PERFORM set_config('app.wallet_update_authorized', 'true', true);

    -- Insertar el movimiento oficial de débito por 1.200.000 COP
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

    -- Descontar el valor del saldo de la cuenta agro de Diomedes
    UPDATE public.profiles
    SET wallet_balance = wallet_balance - 1200000
    WHERE id = v_diomedes_id;

    PERFORM set_config('app.wallet_update_authorized', '', true);

    RAISE NOTICE 'Transacción de Timón registrada y saldo descontado a Diomedes correctamente.';
  END IF;
END $$;
