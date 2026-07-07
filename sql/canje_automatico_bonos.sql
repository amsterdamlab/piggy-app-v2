-- ==============================================================================
-- PIGGY APP: CANJE AUTOMÁTICO DE SALDO A BONOS DE CONSUMO & BLINDAJE DE WALLET
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase
-- ==============================================================================

-- 1. ACTUALIZAR TRIGGER DE SEGURIDAD EN WALLET_TRANSACTIONS
-- Modificamos la validación para permitir transacciones que cuenten con la autorización interna de la app.
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloquear recargas directas arbitrarias desde el cliente, EXCEPTO cuando es una operación autorizada por una función interna/RPC
  IF NEW.amount > 0 AND auth.role() = 'authenticated' AND current_setting('app.wallet_update_authorized', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Operación no permitida: No puedes realizar recargas de saldo directas. Usa la pasarela de pagos.';
  END IF;

  -- 🟢 Autorizamos la transacción internamente para modificar profiles sin ser bloqueados por la Veeduría
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


-- 2. ACTUALIZAR TRIGGER UNIFICADO (POR SI ESTÁ ACTIVO EN SUPABASE)
CREATE OR REPLACE FUNCTION public.sync_wallet_balance_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Bloquear recargas directas arbitrarias desde el cliente
  IF TG_OP = 'INSERT' AND NEW.amount > 0 AND auth.role() = 'authenticated' AND current_setting('app.wallet_update_authorized', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Operación no permitida: No puedes realizar recargas de saldo directas. Usa la pasarela de pagos.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  -- 🟢 Autorizamos la actualización internamente para que la Veeduría no la bloquee
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  -- Actualizamos el saldo calculando la suma total (dinero y consumo separados)
  UPDATE public.profiles 
  SET 
    wallet_balance = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.wallet_transactions 
      WHERE user_id = target_user_id AND (wallet_type = 'dinero' OR wallet_type IS NULL)
    ),
    referral_balance = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.wallet_transactions 
      WHERE user_id = target_user_id AND wallet_type = 'consumo'
    )
  WHERE id = target_user_id;

  -- 🔴 Removemos la autorización por seguridad
  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. CREAR PROCEDIMIENTO RPC ATÓMICO PARA EL CANJE DE BONOS DE CONSUMO
CREATE OR REPLACE FUNCTION public.convert_balance_to_consumption_bonus(p_amount NUMERIC)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- 1. Obtener usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'No autenticado en Supabase.');
  END IF;

  -- 2. Validar monto
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'El monto a canjear debe ser mayor a cero.');
  END IF;

  -- 3. Verificar saldo de dinero actual y bloquear fila para evitar condiciones de carrera (race conditions)
  SELECT COALESCE(wallet_balance, 0) INTO v_current_balance
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Saldo disponible insuficiente para realizar el canje.');
  END IF;

  -- 4. 🟢 Autorizar operación interna para superar la Veeduría y los Triggers de Saldo
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  -- 5. Insertar transacción de débito en saldo de dinero (-)
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type)
  VALUES (v_user_id, -p_amount, 'debit', 'Canje a Bonos de Consumo (Débito saldo)', 'dinero');

  -- 6. Insertar transacción de crédito en bonos de consumo (+)
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type)
  VALUES (v_user_id, p_amount, 'credit', 'Bono de Consumo acreditado por canje de saldo', 'consumo');

  -- 7. 🔴 Retirar autorización interna
  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  -- En caso de cualquier error, retirar autorización y retornar la causa
  PERFORM set_config('app.wallet_update_authorized', '', true);
  RETURN jsonb_build_object('success', false, 'reason', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
