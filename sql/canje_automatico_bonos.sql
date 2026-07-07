-- ==============================================================================
-- PIGGY APP: CANJE AUTOMÁTICO DE SALDO A BONOS DE CONSUMO & BLINDAJE DE WALLET
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase para arreglar
-- el bloqueo de seguridad y sanear el saldo de las pruebas anteriores.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. ACTUALIZAR REGLA DE VEEDURÍA INTERNA (BLINDAJE DE PROFILES)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_manual_balance_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificamos si la operación cuenta con el token de autorización de sistema
  IF current_setting('app.wallet_update_authorized', true) IS DISTINCT FROM 'true' THEN
    
    -- Si intentan cambiar el saldo de dinero manualmente
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
      RAISE EXCEPTION 'VEEDURIA INTERNA ACTIVA: 🔒 Acceso Denegado. Modificar el saldo directamente destruye la trazabilidad. Inserta un registro en "wallet_transactions" en su lugar.';
    END IF;

    -- Si intentan cambiar el saldo de consumo (referidos/bonos) manually
    IF NEW.referral_balance IS DISTINCT FROM OLD.referral_balance THEN
      RAISE EXCEPTION 'VEEDURIA INTERNA ACTIVA: 🔒 Acceso Denegado. Modificar el bono de consumo directamente destruye la trazabilidad. Inserta un registro en "wallet_transactions" (tipo consumo) en su lugar.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_manual_balance_update ON public.profiles;
CREATE TRIGGER trg_prevent_manual_balance_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_manual_balance_update();


-- ------------------------------------------------------------------------------
-- 1. ACTUALIZAR TRIGGER DE SEGURIDAD EN WALLET_TRANSACTIONS
-- ------------------------------------------------------------------------------
-- El error ocurría porque el blindaje bloqueaba CUALQUIER crédito positivo (> 0).
-- Modificamos la validación para que el bloqueo SOLO aplique a recargas directas de DINERO,
-- permitiendo que las acreditaciones a BONOS DE CONSUMO (wallet_type = 'consumo') fluyan sin problema.
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloquear recargas directas arbitrarias de DINERO desde el cliente, EXCEPTO cuando es una operación autorizada por una función interna/RPC o es un crédito a consumo
  IF NEW.amount > 0 AND auth.role() = 'authenticated' 
     AND (NEW.wallet_type = 'dinero' OR NEW.wallet_type IS NULL) 
     AND NEW.type NOT IN ('simulation_recharge') 
     AND current_setting('app.wallet_update_authorized', true) IS DISTINCT FROM 'true' THEN
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


-- ------------------------------------------------------------------------------
-- 2. ACTUALIZAR TRIGGER UNIFICADO (POR SI ESTÁ ACTIVO EN SUPABASE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_wallet_balance_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Bloquear recargas directas arbitrarias de DINERO desde el cliente
  IF TG_OP = 'INSERT' AND NEW.amount > 0 AND auth.role() = 'authenticated' 
     AND (NEW.wallet_type = 'dinero' OR NEW.wallet_type IS NULL) 
     AND NEW.type NOT IN ('simulation_recharge') 
     AND current_setting('app.wallet_update_authorized', true) IS DISTINCT FROM 'true' THEN
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


-- ------------------------------------------------------------------------------
-- 3. CREAR PROCEDIMIENTO RPC ATÓMICO PARA EL CANJE DE BONOS DE CONSUMO
-- ------------------------------------------------------------------------------
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


-- ------------------------------------------------------------------------------
-- 4. SANEAMIENTO AUTOMÁTICO DE PRUEBAS ANTERIORES (AUTOCORRECCIÓN)
-- ------------------------------------------------------------------------------
-- Si en tus pruebas anteriores se descontó el saldo de dinero pero falló el crédito en consumo,
-- este bloque detecta esos débitos huérfanos y les crea automáticamente su respectivo crédito
-- en bonos de consumo, devolviendo el equilibrio contable a tu cuenta.
DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN 
    SELECT wt.user_id, ABS(wt.amount) AS monto, wt.created_at
    FROM public.wallet_transactions wt
    WHERE (wt.description LIKE '%Canje a Bonos de Consumo%' OR wt.description LIKE '%Canje%')
      AND wt.type = 'debit'
      AND wt.wallet_type = 'dinero'
      AND NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions wt2
        WHERE wt2.user_id = wt.user_id
          AND wt2.wallet_type = 'consumo'
          AND wt2.created_at >= (wt.created_at - INTERVAL '2 minutes')
          AND wt2.created_at <= (wt.created_at + INTERVAL '2 minutes')
          AND ABS(wt2.amount) = ABS(wt.amount)
      )
  LOOP
    -- Reautorizar antes del insert porque los triggers anidados limpian el config de sesión al terminar
    PERFORM set_config('app.wallet_update_authorized', 'true', true);
    INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type, created_at)
    VALUES (r.user_id, r.monto, 'credit', 'Bono de Consumo acreditado por canje (Saneamiento prueba anterior)', 'consumo', r.created_at + INTERVAL '1 second');
    
    v_count := v_count + 1;
    RAISE NOTICE 'Saneado canje huérfano para usuario % por monto %', r.user_id, r.monto;
  END LOOP;

  -- Re-autorizar explícitamente justo antes del UPDATE en profiles por si un trigger anterior limpió el token
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  -- Forzar la resincronización de los saldos en profiles para todos los usuarios afectados
  UPDATE public.profiles p
  SET 
    wallet_balance = COALESCE((
      SELECT SUM(amount) FROM public.wallet_transactions wt 
      WHERE wt.user_id = p.id AND (wt.wallet_type = 'dinero' OR wt.wallet_type IS NULL)
    ), 0),
    referral_balance = COALESCE((
      SELECT SUM(amount) FROM public.wallet_transactions wt 
      WHERE wt.user_id = p.id AND wt.wallet_type = 'consumo'
    ), 0)
  WHERE EXISTS (
    SELECT 1 FROM public.wallet_transactions wt3 WHERE wt3.user_id = p.id AND wt3.description LIKE '%Canje%'
  );

  PERFORM set_config('app.wallet_update_authorized', '', true);
  RAISE NOTICE 'Proceso de saneamiento finalizado. Total de transacciones restauradas: %', v_count;
END $$;
