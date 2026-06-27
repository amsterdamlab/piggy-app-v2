-- ==============================================================================
-- PIGGY APP — Security Hardening & Impersonation Prevention
-- Run this script in the Supabase SQL Editor to secure the database backend.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Impersonation Prevention in create_wallet_request RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_wallet_request(
  p_user_id UUID,
  p_type VARCHAR,
  p_amount NUMERIC,
  p_bank TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_balance_dinero NUMERIC;
  v_balance_consumo NUMERIC;
  v_request_id UUID;
  v_wallet_type VARCHAR(20);
BEGIN
  -- 🔒 SECURITY CHECK: Prevent impersonation
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad detectada.';
  END IF;

  -- Obtener ambos saldos del usuario
  SELECT COALESCE(wallet_balance, 0), COALESCE(referral_balance, 0) 
  INTO v_balance_dinero, v_balance_consumo
  FROM profiles
  WHERE id = p_user_id;

  -- Reglas de Negocio
  IF p_type = 'withdrawal' THEN
    -- Regla: Los retiros bancarios solo pueden salir de "dinero"
    IF p_amount > v_balance_dinero THEN
      RETURN jsonb_build_object('success', false, 'reason', 'Saldo de dinero insuficiente para retiro');
    END IF;
    v_wallet_type := 'dinero';

  ELSIF p_type = 'consumption' THEN
    -- Regla: Consumo prioriza el "consumo" (bonos), pero puede usar "dinero" si no alcanza
    IF p_amount <= v_balance_consumo THEN
      v_wallet_type := 'consumo';
    ELSIF p_amount <= v_balance_dinero THEN
      v_wallet_type := 'dinero';
    ELSE
      RETURN jsonb_build_object('success', false, 'reason', 'Saldo insuficiente en ambas cuentas para consumo');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'reason', 'Tipo de solicitud inválido');
  END IF;

  -- Regla: Monto mínimo (ejemplo: 10,000)
  IF p_amount < 10000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Monto por debajo del mínimo permitido');
  END IF;

  -- Crear la Solicitud
  INSERT INTO wallet_requests (user_id, request_type, amount, bank_name, status, wallet_type)
  VALUES (p_user_id, p_type, p_amount, p_bank, 'pending', v_wallet_type)
  RETURNING id INTO v_request_id;

  -- 🟢 ESCROW: Deducción inmediata del saldo insertando transacción (debit automático)
  PERFORM set_config('app.wallet_update_authorized', 'true', true);
  
  INSERT INTO wallet_transactions (user_id, amount, type, description, wallet_type)
  VALUES (p_user_id, p_amount, 'debit', 'Retención por solicitud en proceso (' || p_type || ')', v_wallet_type::public.wallet_type_enum);
  
  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'amount', p_amount,
    'type', p_type,
    'wallet_type_used', v_wallet_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_wallet_request TO authenticated;
GRANT EXECUTE ON FUNCTION create_wallet_request TO service_role;


-- ------------------------------------------------------------------------------
-- 2. Impersonation Prevention in buy_piggy RPC
-- ------------------------------------------------------------------------------
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
  v_current_stock int;
  v_referral_result jsonb;
  v_days_elapsed int;
  v_days_remaining int;
  v_total_cycle_days int := 143; -- ~4 months 3 weeks
  v_full_name text;
BEGIN
  -- 🔒 SECURITY CHECK: Prevent impersonation
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad detectada.';
  END IF;

  -- 1. Lock and check stock
  SELECT stock INTO v_current_stock
  FROM marketplace
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Item not found in marketplace';
  END IF;

  IF v_current_stock <= 0 THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  -- Calculate days remaining based on current_month
  v_days_elapsed := GREATEST(0, (p_current_month - 1) * 30);
  v_days_remaining := GREATEST(1, v_total_cycle_days - v_days_elapsed);

  -- 2. Deduct stock
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- Fetch user profile data to store in piggies table
  SELECT full_name INTO v_full_name
  FROM profiles
  WHERE id = p_user_id;

  -- 3. Create the piggy with calculated end_date based on remaining days
  INSERT INTO piggies (
    user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, current_weight,
    purchase_date, end_date
  )
  VALUES (
    p_user_id, p_item_name, v_full_name, p_price, 'engorde',
    p_extra_roi, p_category, 15.0,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval
  )
  RETURNING id INTO v_new_piggy_id;

  -- 4. Process referral commission (only triggers on first purchase)
  BEGIN
    v_referral_result := process_referral_on_purchase(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_referral_result := jsonb_build_object('triggered', false, 'reason', 'error');
  END;

  RETURN json_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'days_remaining', v_days_remaining,
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;


-- ------------------------------------------------------------------------------
-- 3. Impersonation Prevention in link_referral RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION link_referral(p_referred_id UUID, p_referral_code VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- 🔒 SECURITY CHECK: Prevent impersonation
  IF auth.role() = 'authenticated' AND auth.uid() != p_referred_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad detectada.';
  END IF;

  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE UPPER(referral_code) = UPPER(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'invalid_code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'self_referral');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_referred_id) THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'already_referred');
  END IF;

  -- Update profile
  UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_referred_id;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (v_referrer_id, p_referred_id, 'pending');

  RETURN jsonb_build_object(
    'linked', true,
    'referrer_id', v_referrer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION link_referral TO authenticated;
GRANT EXECUTE ON FUNCTION link_referral TO service_role;


-- ------------------------------------------------------------------------------
-- 4. Impersonation Prevention in sync_piggy_weights RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_piggy_weights(p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_total_days numeric := 143.0;
  v_min_weight numeric := 15.0;
  v_max_weight numeric := 110.0;
  v_weight_range numeric := 95.0; -- 110 - 15
BEGIN
  -- 🔒 SECURITY CHECK: Prevent impersonation
  IF p_user_id IS NOT NULL AND auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad';
  END IF;

  IF p_user_id IS NOT NULL THEN
    -- Actualizar solo los piggys del usuario
    UPDATE piggies
    SET current_weight = ROUND(
      (v_min_weight + (v_weight_range * 
        LEAST(1.0, GREATEST(0.0, (v_total_days - GREATEST(0.0, EXTRACT(DAY FROM (end_date - now())))) / v_total_days))
      ))::numeric, 2)
    WHERE status = 'engorde' AND user_id = p_user_id;
  ELSE
    -- Actualizar TODOS los piggys
    UPDATE piggies
    SET current_weight = ROUND(
      (v_min_weight + (v_weight_range * 
        LEAST(1.0, GREATEST(0.0, (v_total_days - GREATEST(0.0, EXTRACT(DAY FROM (end_date - now())))) / v_total_days))
      ))::numeric, 2)
    WHERE status = 'engorde';
  END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION sync_piggy_weights TO authenticated;
GRANT EXECUTE ON FUNCTION sync_piggy_weights TO service_role;


-- ------------------------------------------------------------------------------
-- 5. Wallet Transactions Ledger Immutability
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Operación no permitida: Las transacciones del historial son inmutables y no pueden ser modificadas o eliminadas.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_transaction_modification ON public.wallet_transactions;
CREATE TRIGGER trg_prevent_transaction_modification
  BEFORE UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_transaction_modification();


-- ------------------------------------------------------------------------------
-- 6. Lock Status Updates on Wallet Requests (Admin Only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_wallet_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Si aprueban: NO hacemos nada con el saldo, ¡porque ya se lo descontamos el día 1!
  IF OLD.status = 'pending' AND NEW.status = 'processed' THEN
    -- 🔒 SECURITY CHECK: Only admin/service_role can change status to processed
    IF auth.role() = 'authenticated' THEN
      RAISE EXCEPTION 'Operación no permitida: No tienes permisos para modificar el estado de esta solicitud.';
    END IF;
    NEW.processed_at = now();
    RAISE LOG 'Solicitud % procesada exitosamente (saldo ya estaba descontado)', NEW.id;
  END IF;

  -- Si rechazan: DEVOLVEMOS el dinero insertando un crédito
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    -- 🔒 SECURITY CHECK: Only admin/service_role can change status to rejected
    IF auth.role() = 'authenticated' THEN
      RAISE EXCEPTION 'Operación no permitida: No tienes permisos para modificar el estado de esta solicitud.';
    END IF;
    
    PERFORM set_config('app.wallet_update_authorized', 'true', true);
    
    INSERT INTO wallet_transactions (user_id, amount, type, description, wallet_type)
    VALUES (NEW.user_id, NEW.amount, 'credit', 'Reembolso por solicitud rechazada', NEW.wallet_type::public.wallet_type_enum);
    
    PERFORM set_config('app.wallet_update_authorized', '', true);

    NEW.processed_at = now();
    RAISE LOG 'Solicitud % rechazada. Se ha emitido un reembolso.', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_process_wallet_request ON public.wallet_requests;
CREATE TRIGGER tr_process_wallet_request
  BEFORE UPDATE ON public.wallet_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_wallet_request();

SELECT 'Security hardening functions and triggers deployed successfully' AS status;
