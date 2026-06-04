-- ==============================================================================
-- PIGGY APP: VEEDURÍA ESTRICTA Y BLINDAJE DE SALDOS
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase
-- ==============================================================================

-- 1. ACTUALIZAR TRIGGER DE PROTECCIÓN
-- Reemplazamos la función para que evalúe un "token" interno en la transacción.
-- Si la modificación de saldo no tiene este token, la bloqueamos de inmediato.
CREATE OR REPLACE FUNCTION public.prevent_manual_balance_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificamos el token de sesión. Solo las funciones internas lo habilitan.
  IF current_setting('app.wallet_update_authorized', true) IS DISTINCT FROM 'true' THEN
    
    -- Si intentan cambiar el saldo de dinero
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
      RAISE EXCEPTION 'VEEDURIA INTERNA ACTIVA: 🔒 Acceso Denegado. Modificar el saldo directamente destruye la trazabilidad. Inserta un registro en "wallet_transactions" en su lugar.';
    END IF;

    -- Si intentan cambiar el saldo de consumo (referidos/bonos)
    IF NEW.referral_balance IS DISTINCT FROM OLD.referral_balance THEN
      RAISE EXCEPTION 'VEEDURIA INTERNA ACTIVA: 🔒 Acceso Denegado. Modificar el bono de consumo directamente destruye la trazabilidad. Inserta un registro en "wallet_transactions" (tipo consumo) en su lugar.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Aseguramos que el trigger sigue enganchado)
DROP TRIGGER IF EXISTS trg_prevent_manual_balance_update ON public.profiles;
CREATE TRIGGER trg_prevent_manual_balance_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_manual_balance_update();


-- 2. AUTORIZAR FUNCIÓN 1: TRANSACCIONES GENERALES (Dinero y Consumo)
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount > 0 AND auth.role() = 'authenticated' THEN
    RAISE EXCEPTION 'Operación no permitida: No puedes realizar recargas de saldo directas.';
  END IF;

  -- 🟢 Autorizamos la transacción internamente
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  IF NEW.wallet_type = 'consumo' THEN
    UPDATE public.profiles
    SET referral_balance = COALESCE(referral_balance, 0) + NEW.amount
    WHERE id = NEW.user_id;
  ELSE
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
    WHERE id = NEW.user_id;
  END IF;

  -- 🔴 Removemos la autorización
  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. AUTORIZAR FUNCIÓN 2: SOLICITUDES DE RETIRO / CONSUMO
CREATE OR REPLACE FUNCTION process_wallet_request()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'processed' THEN
    
    -- 🟢 Autorizamos la transacción internamente
    PERFORM set_config('app.wallet_update_authorized', 'true', true);

    UPDATE profiles
    SET referral_balance = COALESCE(referral_balance, 0) - NEW.amount
    WHERE id = NEW.user_id;

    -- 🔴 Removemos la autorización
    PERFORM set_config('app.wallet_update_authorized', '', true);

    NEW.processed_at = now();
    RAISE LOG 'Saldo de % descontado al usuario % exitosamente', NEW.amount, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. AUTORIZAR FUNCIÓN 3: SISTEMA DE REFERIDOS (Bono al Invitar)
CREATE OR REPLACE FUNCTION process_referral_on_purchase(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_completed_count INTEGER;
  v_commission INTEGER;
  v_tier VARCHAR(10);
  v_has_previous_purchase BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM piggies
    WHERE user_id = p_user_id
    AND id != (SELECT id FROM piggies WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1)
  ) INTO v_has_previous_purchase;

  IF v_has_previous_purchase THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'not_first_purchase');
  END IF;

  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'no_pending_referral');
  END IF;

  SELECT COUNT(*) INTO v_completed_count
  FROM referrals
  WHERE referrer_id = v_referral.referrer_id AND status = 'completed';

  IF v_completed_count < 5 THEN
    v_commission := 30000;
    v_tier := 'tier_1';
  ELSIF v_completed_count < 15 THEN
    v_commission := 50000;
    v_tier := 'tier_2';
  ELSE
    v_commission := 80000;
    v_tier := 'tier_3';
  END IF;

  UPDATE referrals
  SET status = 'completed',
      commission_amount = v_commission,
      commission_tier = v_tier,
      completed_at = now()
  WHERE id = v_referral.id;

  -- 🟢 Autorizamos la transacción internamente
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  UPDATE profiles
  SET referral_balance = COALESCE(referral_balance, 0) + v_commission
  WHERE id = v_referral.referrer_id;

  -- 🔴 Removemos la autorización
  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN jsonb_build_object(
    'triggered', true,
    'referrer_id', v_referral.referrer_id,
    'commission', v_commission,
    'tier', v_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;