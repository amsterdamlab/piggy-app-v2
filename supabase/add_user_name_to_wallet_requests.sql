-- ==============================================================================
-- PIGGY APP — Agregar Nombre del Usuario (user_name) en wallet_requests
-- Ejecuta este script en el SQL Editor de Supabase.
-- ==============================================================================

-- 1. Agregar la columna user_name a la tabla wallet_requests si no existe
ALTER TABLE public.wallet_requests
ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT NULL;

-- 2. Poblar retroactivamente los nombres de todos los usuarios existentes
UPDATE public.wallet_requests wr
SET user_name = p.full_name
FROM public.profiles p
WHERE wr.user_id = p.id
  AND (wr.user_name IS NULL OR wr.user_name = '');

-- 3. Crear función trigger para autocompletar user_name en cada nueva solicitud
CREATE OR REPLACE FUNCTION public.trg_populate_wallet_request_user_name()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- Si no se proporcionó user_name en el insert/update, buscarlo en profiles
  IF NEW.user_name IS NULL OR NEW.user_name = '' THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    NEW.user_name := COALESCE(v_name, 'Usuario');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enganchar el trigger a wallet_requests (BEFORE INSERT OR UPDATE)
DROP TRIGGER IF EXISTS trg_set_wallet_request_user_name ON public.wallet_requests;
CREATE TRIGGER trg_set_wallet_request_user_name
  BEFORE INSERT OR UPDATE ON public.wallet_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_populate_wallet_request_user_name();

-- 5. Actualizar la función RPC create_recharge_request para incluir user_name
CREATE OR REPLACE FUNCTION public.create_recharge_request(
  p_user_id UUID,
  p_amount NUMERIC,
  p_payment_method VARCHAR,
  p_reference TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_request_id UUID;
  v_full_name TEXT;
BEGIN
  -- Validaciones de seguridad
  IF p_amount IS NULL OR p_amount < 200000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount', 'message', 'El monto mínimo es de $200.000 COP');
  END IF;

  IF p_reference IS NULL OR length(trim(p_reference)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'missing_reference', 'message', 'La referencia de pago es obligatoria');
  END IF;

  -- Obtener nombre del usuario
  SELECT full_name INTO v_full_name FROM public.profiles WHERE id = p_user_id;

  -- Insertar la solicitud
  INSERT INTO public.wallet_requests (
    user_id,
    user_name,
    request_type,
    amount,
    status,
    payment_method,
    reference,
    wallet_type,
    bank_name,
    notes
  ) VALUES (
    p_user_id,
    COALESCE(v_full_name, 'Usuario'),
    'recharge',
    p_amount,
    'pending',
    p_payment_method,
    p_reference,
    'dinero',
    'Bancolombia',
    p_notes
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'reference', p_reference,
    'user_name', COALESCE(v_full_name, 'Usuario'),
    'amount', p_amount,
    'status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Actualizar la función RPC create_wallet_request para incluir user_name
CREATE OR REPLACE FUNCTION public.create_wallet_request(
  p_user_id UUID,
  p_type VARCHAR,
  p_amount NUMERIC,
  p_bank TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_request_id UUID;
  v_full_name TEXT;
BEGIN
  -- Validar balance
  SELECT COALESCE(referral_balance, 0), full_name INTO v_current_balance, v_full_name
  FROM public.profiles
  WHERE id = p_user_id;

  IF p_amount > v_current_balance THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_balance');
  END IF;

  IF p_amount < 10000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'below_minimum');
  END IF;

  -- Insertar solicitud
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
    'bono_consumo'
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

GRANT EXECUTE ON FUNCTION public.create_recharge_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_recharge_request TO service_role;
GRANT EXECUTE ON FUNCTION public.create_recharge_request TO anon;

GRANT EXECUTE ON FUNCTION public.create_wallet_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_wallet_request TO service_role;

SELECT 'Columna user_name agregada y sincronizada exitosamente en wallet_requests.' AS status;
