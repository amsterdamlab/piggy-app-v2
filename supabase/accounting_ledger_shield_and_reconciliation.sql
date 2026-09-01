-- ==============================================================================
-- PIGGY APP — BLINDAJE CONTABLE DEFINITIVO Y RECONCILIACIÓN DEL LIBRO MAYOR
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. RECONCILIACIÓN Y AUDITORÍA GLOBAL DE SALDOS
-- Detecta si algún usuario tiene un saldo en profiles mayor a la suma de sus transacciones
-- e inserta el asiento contable de respaldo para que NINGÚN usuario pierda dinero.
DO $$
DECLARE
  v_user RECORD;
  v_tx_sum NUMERIC;
  v_profile_bal NUMERIC;
  v_diff NUMERIC;
  v_reconciled_count INTEGER := 0;
BEGIN
  -- Autorizar sesión para pasar veedurías durante la migración
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  FOR v_user IN SELECT id, full_name, email, COALESCE(wallet_balance, 0) AS current_bal FROM public.profiles LOOP
    -- Calcular suma real en el libro de transacciones en dinero
    SELECT COALESCE(SUM(amount), 0) INTO v_tx_sum
    FROM public.wallet_transactions
    WHERE user_id = v_user.id 
      AND (wallet_type = 'dinero' OR wallet_type IS NULL);

    v_profile_bal := v_user.current_bal;
    v_diff := v_profile_bal - v_tx_sum;

    -- Si el perfil tiene más saldo que el libro de transacciones, respaldar la diferencia con asiento contable
    IF v_diff > 0.001 THEN
      INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        type,
        description,
        wallet_type,
        payment_method,
        simulation_status
      ) VALUES (
        v_user.id,
        v_diff,
        'credit',
        'Asiento de Reconciliación y Respaldo Contable',
        'dinero',
        'SALDO_AGRO',
        'APPROVED'
      );
      v_reconciled_count := v_reconciled_count + 1;
      RAISE NOTICE 'Usuario [%] % reconciliado: +$% respaldados en libro contable.', v_user.id, v_user.full_name, v_diff;
    END IF;
  END LOOP;

  PERFORM set_config('app.wallet_update_authorized', '', true);
  RAISE NOTICE '=== TOTAL DE CUENTAS RECONCILIADAS Y RESPALDADAS: % ===', v_reconciled_count;
END $$;

-- 2. TRIGGER CANÓNICO DE LIBRO MAYOR (SINGLE SOURCE OF TRUTH)
-- Este trigger es la ÚNICA entidad autorizada para modificar saldos en profiles.
CREATE OR REPLACE FUNCTION public.handle_canonical_wallet_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_type TEXT;
BEGIN
  v_wallet_type := LOWER(COALESCE(NEW.wallet_type, 'dinero'));

  -- Si es una recarga simulada pendiente o rechazada, no altera el saldo real
  IF NEW.simulation_status IS NOT NULL AND NEW.simulation_status NOT IN ('APPROVED', 'simulated_approved') THEN
    RETURN NEW;
  END IF;

  -- Habilitar veeduría en sesión para este cambio contable autorizado
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  -- CASO A: Transacción de Dinero Real (Cuenta Agro)
  IF v_wallet_type = 'dinero' THEN
    UPDATE public.profiles
    SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) + NEW.amount)
    WHERE id = NEW.user_id;

  -- CASO B: Transacción de Bono de Consumo (Tienda / Aliados)
  ELSIF v_wallet_type LIKE '%consumo%' THEN
    UPDATE public.profiles
    SET consumption_balance = GREATEST(0, COALESCE(consumption_balance, 0) + NEW.amount)
    WHERE id = NEW.user_id;
  END IF;

  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpiar todos los triggers viejos y redundantes en wallet_transactions
DROP TRIGGER IF EXISTS trg_handle_wallet_transaction_sync ON public.wallet_transactions;
DROP TRIGGER IF EXISTS trg_wallet_transaction_sync ON public.wallet_transactions;
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
DROP TRIGGER IF EXISTS trg_sync_wallet_balance_to_profile ON public.wallet_transactions;
DROP TRIGGER IF EXISTS on_wallet_transaction_insert ON public.wallet_transactions;
DROP TRIGGER IF EXISTS trg_canonical_wallet_ledger ON public.wallet_transactions;

-- Enganchar el nuevo trigger canónico único
CREATE TRIGGER trg_canonical_wallet_ledger
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_canonical_wallet_ledger();

-- 3. TRIGGER DE PROTECCIÓN DE SALDOS EN PROFILES
-- Impide modificaciones manuales o directas a wallet_balance o consumption_balance sin asiento contable
CREATE OR REPLACE FUNCTION public.protect_profile_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el saldo no cambió, permitir
  IF OLD.wallet_balance = NEW.wallet_balance AND OLD.consumption_balance = NEW.consumption_balance THEN
    RETURN NEW;
  END IF;

  -- Verificar si el cambio proviene de una función autorizada o del trigger de transacciones
  IF current_setting('app.wallet_update_authorized', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Bloquear modificación no autorizada
  RAISE EXCEPTION 'Operación denegada: Los saldos de Cuenta Agro no pueden modificarse directamente. Todo movimiento debe registrarse en wallet_transactions.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_balances ON public.profiles;
CREATE TRIGGER trg_protect_profile_balances
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_balances();

-- 4. RPC ATÓMICA DE COMPRA PARA MISIONES FLASH (buy_flash_mission_atomic)
-- Valida saldo, descuenta dinero, crea el cerdito y cierra la misión en UNA SOLA transacción ACID.
CREATE OR REPLACE FUNCTION public.buy_flash_mission_atomic(
  p_mission_id UUID,
  p_custom_name TEXT
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
  v_days_remaining INTEGER := 144;
  v_weight NUMERIC := 15.0;
  v_end_date TIMESTAMPTZ;
  v_raw_type TEXT;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- A. Bloquear y consultar el perfil del usuario
  SELECT id, wallet_balance, full_name INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  -- B. Consultar y bloquear la misión flash del usuario
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

  -- C. Calcular precio y validar fondos
  v_raw_type := LOWER(COALESCE(v_mission.piggy_type, 'avanzado30'));
  IF v_raw_type IN ('advanced60', 'avanzado60', 'advanced30', 'avanzado30') THEN
    v_price := COALESCE(v_mission.price, 1300000);
  ELSE
    v_price := COALESCE(v_mission.price, 1000000);
  END IF;

  IF COALESCE(v_profile.wallet_balance, 0) < v_price THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Saldo insuficiente en tu Cuenta Agro', 
      'current_balance', COALESCE(v_profile.wallet_balance, 0),
      'required_price', v_price
    );
  END IF;

  -- D. Definir parámetros del cerdito según tipo
  v_category := v_raw_type;
  IF v_raw_type IN ('advanced30', 'avanzado30') THEN
    v_category := 'avanzado30';
    v_extra_roi := 0;
    v_days_remaining := 114;
    v_weight := 35.0;
  ELSIF v_raw_type IN ('advanced45', 'avanzado45') THEN
    v_category := 'avanzado45';
    v_extra_roi := 0;
    v_days_remaining := 99;
    v_weight := 45.0;
  ELSIF v_raw_type IN ('advanced60', 'avanzado60') THEN
    v_category := 'avanzado60';
    v_extra_roi := 0;
    v_days_remaining := 84;
    v_weight := 55.0;
  ELSIF v_raw_type IN ('advanced75', 'avanzado75') THEN
    v_category := 'avanzado75';
    v_extra_roi := 0;
    v_days_remaining := 69;
    v_weight := 65.0;
  ELSIF v_raw_type IN ('advanced90', 'avanzado90') THEN
    v_category := 'avanzado90';
    v_extra_roi := 0;
    v_days_remaining := 54;
    v_weight := 75.0;
  ELSIF v_raw_type IN ('plus', 'silver') THEN
    v_category := 'plus';
    v_extra_roi := 0.01;
  ELSIF v_raw_type IN ('dorado', 'gold') THEN
    v_category := 'dorado';
    v_extra_roi := 0.02;
  ELSIF v_raw_type = 'premium' THEN
    v_category := 'premium';
    v_extra_roi := 0.03;
  END IF;

  v_final_name := COALESCE(NULLIF(TRIM(p_custom_name), ''), v_mission.piggy_label, v_mission.title, 'Piggy Flash');
  v_end_date := NOW() + (v_days_remaining || ' days')::interval;
  v_new_piggy_id := gen_random_uuid();

  -- E. Insertar el débito en el libro contable
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    description,
    wallet_type,
    payment_method,
    simulation_status
  ) VALUES (
    v_user_id,
    -v_price,
    'purchase',
    'Compra de Oferta Flash: ' || v_final_name,
    'dinero',
    'SALDO_AGRO',
    'APPROVED'
  );

  -- F. Insertar el nuevo Piggy en la granja
  INSERT INTO public.piggies (
    id,
    user_id,
    name,
    full_name,
    investment_amount,
    status,
    extra_roi_bonus,
    category,
    current_weight,
    purchase_date,
    end_date
  ) VALUES (
    v_new_piggy_id,
    v_user_id,
    v_final_name,
    COALESCE(v_profile.full_name, ''),
    v_price,
    'engorde',
    v_extra_roi,
    v_category,
    v_weight,
    NOW(),
    v_end_date
  );

  -- G. Marcar la misión como comprada y desactivarla
  UPDATE public.user_flash_missions
  SET is_purchased = TRUE,
      is_active = FALSE,
      purchased_at = NOW(),
      purchased_piggy_id = v_new_piggy_id
  WHERE id = p_mission_id;

  -- H. Obtener el nuevo saldo actualizado
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
      'status', 'engorde'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_flash_mission_atomic(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_flash_mission_atomic(UUID, TEXT) TO service_role;

-- 5. RPC ATÓMICA DE COMPRA PARA MISIONES DE CICLO M10 (buy_cycle_mission_atomic)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- A. Bloquear y consultar el perfil del usuario
  SELECT id, wallet_balance, full_name INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  -- B. Consultar y bloquear la misión M10
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

  -- C. Validar fondos
  IF COALESCE(v_profile.wallet_balance, 0) < v_price THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Saldo insuficiente en tu Cuenta Agro', 
      'current_balance', COALESCE(v_profile.wallet_balance, 0),
      'required_price', v_price
    );
  END IF;

  v_final_name := COALESCE(NULLIF(TRIM(p_custom_name), ''), v_mission.piggy_label, 'Piggy Ciclo');
  v_new_piggy_id := gen_random_uuid();

  -- D. Insertar el débito en el libro contable
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    description,
    wallet_type,
    payment_method,
    simulation_status
  ) VALUES (
    v_user_id,
    -v_price,
    'purchase',
    'Compra de Oferta Exclusiva M10: ' || v_final_name,
    'dinero',
    'SALDO_AGRO',
    'APPROVED'
  );

  -- E. Insertar el nuevo Piggy con contrato
  INSERT INTO public.piggies (
    id,
    user_id,
    name,
    full_name,
    investment_amount,
    status,
    extra_roi_bonus,
    category,
    current_weight,
    purchase_date,
    end_date,
    contract_url,
    contract_code
  ) VALUES (
    v_new_piggy_id,
    v_user_id,
    v_final_name,
    COALESCE(v_profile.full_name, ''),
    v_price,
    'engorde',
    COALESCE(v_mission.extra_roi_bonus, 0),
    COALESCE(v_mission.piggy_type, 'plus'),
    15.0,
    NOW(),
    NOW() + interval '143 days',
    p_contract_url,
    p_contract_code
  );

  -- F. Marcar misión M10 como completada
  UPDATE public.cycle_completion_missions
  SET is_completed = TRUE,
      purchased_piggy_id = v_new_piggy_id,
      purchased_at = NOW()
  WHERE id = p_mission_id;

  -- G. Obtener el nuevo saldo actualizado
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
      'category', v_mission.piggy_type,
      'status', 'engorde'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_cycle_mission_atomic(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_cycle_mission_atomic(UUID, TEXT, TEXT, TEXT) TO service_role;

-- 6. RPC ATÓMICA PARA LIQUIDACIÓN DE CICLO COMPLETADO (liquidate_completed_piggy_atomic)
CREATE OR REPLACE FUNCTION public.liquidate_completed_piggy_atomic(
  p_piggy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_piggy RECORD;
  v_base_roi NUMERIC := 0.10; -- Margen base 10%
  v_extra_roi NUMERIC := 0;
  v_total_roi NUMERIC;
  v_payout NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_piggy
  FROM public.piggies
  WHERE id = p_piggy_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_piggy IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Piggy no encontrado');
  END IF;

  IF v_piggy.status = 'liquidado' OR v_piggy.status = 'completado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este Piggy ya fue liquidado');
  END IF;

  IF NOW() < v_piggy.end_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'El ciclo de engorde aún no ha finalizado');
  END IF;

  v_extra_roi := COALESCE(v_piggy.extra_roi_bonus, 0);
  v_total_roi := v_base_roi + v_extra_roi;
  v_payout := ROUND(v_piggy.investment_amount * (1 + v_total_roi));

  -- Insertar asiento contable de liquidación
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    description,
    wallet_type,
    payment_method,
    simulation_status
  ) VALUES (
    v_user_id,
    v_payout,
    'liquidation',
    'Liquidación de Ciclo: ' || v_piggy.name || ' (Capital + Rendimiento ' || (v_total_roi * 100)::text || '%)',
    'dinero',
    'SALDO_AGRO',
    'APPROVED'
  );

  -- Marcar piggy como liquidado
  UPDATE public.piggies
  SET status = 'liquidado'
  WHERE id = p_piggy_id;

  SELECT wallet_balance INTO v_new_balance
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout', v_payout,
    'new_balance', v_new_balance,
    'piggy_id', p_piggy_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.liquidate_completed_piggy_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liquidate_completed_piggy_atomic(UUID) TO service_role;

SELECT 'Blindaje contable, reconciliación global y funciones atómicas instaladas exitosamente.' AS resultado;
