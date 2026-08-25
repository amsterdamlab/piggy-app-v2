-- ==============================================================================
-- PIGGY APP — Corrección RPC create_wallet_request (Balance Dinero vs Consumo)
-- Ejecuta este script en el SQL Editor de Supabase.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_wallet_request(
  p_user_id UUID,
  p_type VARCHAR,
  p_amount NUMERIC,
  p_bank TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_wallet_balance NUMERIC;
  v_referral_balance NUMERIC;
  v_request_id UUID;
  v_full_name TEXT;
  v_wallet_type VARCHAR(20);
BEGIN
  -- Obtener saldos y nombre del usuario
  SELECT 
    COALESCE(wallet_balance, 0), 
    COALESCE(referral_balance, 0), 
    full_name 
  INTO 
    v_wallet_balance, 
    v_referral_balance, 
    v_full_name
  FROM public.profiles
  WHERE id = p_user_id;

  -- 1. Validación según tipo de solicitud
  IF p_type = 'withdrawal' THEN
    -- Retiro bancario en efectivo: valida contra wallet_balance (dinero real)
    IF p_amount > v_wallet_balance THEN
      RETURN jsonb_build_object(
        'success', false, 
        'reason', 'insufficient_balance', 
        'message', 'Saldo disponible insuficiente para realizar este retiro'
      );
    END IF;
    v_wallet_type := 'dinero';

  ELSIF p_type = 'consumption' THEN
    -- Bonos de consumo: valida contra referral_balance o wallet_balance
    IF p_amount > (v_referral_balance + v_wallet_balance) THEN
      RETURN jsonb_build_object(
        'success', false, 
        'reason', 'insufficient_balance', 
        'message', 'Saldo insuficiente para canjear bonos de consumo'
      );
    END IF;
    v_wallet_type := 'bono_consumo';

  ELSE
    v_wallet_type := 'dinero';
  END IF;

  -- 2. Monto mínimo
  IF p_amount < 10000 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'below_minimum', 
      'message', 'El monto mínimo es de $10.000 COP'
    );
  END IF;

  -- 3. Insertar la solicitud en wallet_requests
  INSERT INTO public.wallet_requests (
    user_id,
    user_name,
    request_type,
    amount,
    bank_name,
    status,
    wallet_type
  )
  VALUES (
    p_user_id,
    COALESCE(v_full_name, 'Usuario'),
    p_type,
    p_amount,
    p_bank,
    'pending',
    v_wallet_type
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'user_name', COALESCE(v_full_name, 'Usuario'),
    'amount', p_amount,
    'type', p_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_wallet_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_wallet_request TO service_role;

SELECT 'RPC create_wallet_request corregida exitosamente.' AS status;
