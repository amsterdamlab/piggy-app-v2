-- ==============================================================================
-- PIGGY APP: SISTEMA DE RETENCIÓN (ESCROW) Y REGLAS DE NEGOCIO INTELIGENTES
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase
-- ==============================================================================

-- 1. AÑADIR LA COLUMNA WALLET_TYPE A LAS SOLICITUDES
ALTER TABLE public.wallet_requests 
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';


-- 2. FUNCIÓN INTELIGENTE DE CREACIÓN DE SOLICITUD Y RETENCIÓN INMEDIATA
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


-- 3. GATILLO PARA REEMBOLSOS O APROBACIONES
CREATE OR REPLACE FUNCTION process_wallet_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Si aprueban: NO hacemos nada con el saldo, ¡porque ya se lo descontamos el día 1!
  IF OLD.status = 'pending' AND NEW.status = 'processed' THEN
    NEW.processed_at = now();
  END IF;

  -- Si rechazan: DEVOLVEMOS el dinero insertando un crédito automático
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    PERFORM set_config('app.wallet_update_authorized', 'true', true);
    
    INSERT INTO wallet_transactions (user_id, amount, type, description, wallet_type)
    VALUES (NEW.user_id, NEW.amount, 'credit', 'Reembolso por solicitud rechazada', NEW.wallet_type::public.wallet_type_enum);
    
    PERFORM set_config('app.wallet_update_authorized', '', true);

    NEW.processed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Garantizamos que el trigger está enganchado a BEFORE UPDATE)
DROP TRIGGER IF EXISTS tr_process_wallet_request ON public.wallet_requests;
CREATE TRIGGER tr_process_wallet_request
  BEFORE UPDATE ON public.wallet_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_wallet_request();