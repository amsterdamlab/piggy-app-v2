-- ==============================================================================
-- PIGGY APP: CANJE AUTOMÁTICO DE SALDO A BONOS DE CONSUMO & BLINDAJE DE WALLET
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase para eliminar
-- los triggers en conflicto, unificar el cálculo de saldos y sanear las cuentas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. ACTUALIZAR REGLA DE VEEDURÍA INTERNA (BLINDAJE DE PROFILES)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_manual_balance_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificamos si la operación cuenta con el token de autorización de sistema
  IF current_setting('app.wallet_update_authorized', true) IS DISTINCT FROM 'true' THEN
    
    -- Si intentan cambiar el saldo de dinero manualmente sin pasar por transacciones
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
      RAISE EXCEPTION 'VEEDURIA INTERNA ACTIVA: 🔒 Acceso Denegado. Modificar el saldo directamente destruye la trazabilidad. Inserta un registro en "wallet_transactions" en su lugar.';
    END IF;

    -- Si intentan cambiar el saldo de consumo manually sin pasar por transacciones
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
-- 1. LIMPIEZA DE TRIGGERS EN CONFLICTO (LA CAUSA DE SALDOS DUPLICADOS O RESTADOS)
-- ------------------------------------------------------------------------------
-- El error de que a veces sumaba el doble o restaba se debía a la existencia de DOS triggers
-- compitiendo al mismo tiempo: uno que sumaba montos relativos (+ NEW.amount) y otro que
-- recalculaba la suma absoluta (SELECT SUM...). Eliminamos el trigger obsoleto y sus funciones
-- para que exista UNA SOLA FUENTE DE VERDAD.
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
DROP TRIGGER IF EXISTS update_wallet_balance_from_transaction ON public.wallet_transactions;
DROP FUNCTION IF EXISTS public.update_wallet_balance_from_transaction() CASCADE;


-- ------------------------------------------------------------------------------
-- 2. UNIFICAR Y BLINDEJAR EL ÚNICO TRIGGER OFICIAL DE CÁLCULO DE SALDOS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_wallet_balance_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Bloquear recargas directas arbitrarias de DINERO desde el cliente no autorizadas
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

  -- Actualizamos el saldo calculando la suma total exacta (dinero y consumo separados)
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

DROP TRIGGER IF EXISTS trg_sync_wallet_balance_to_profile ON public.wallet_transactions;
CREATE TRIGGER trg_sync_wallet_balance_to_profile
AFTER INSERT OR UPDATE OR DELETE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_wallet_balance_to_profile();


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
-- 4. SANEAMIENTO Y EQUILIBRIO CONTABLE DEFINITIVO (AUTOCORRECCIÓN)
-- ------------------------------------------------------------------------------
-- Si en el pasado se asignaron Bonos de Bienvenida ($30.000) directamente en el perfil sin crear
-- transacciones, cualquier cálculo que use SELECT SUM() los restaba. Este bloque detecta cualquier
-- diferencia entre perfiles e historial, y genera las transacciones necesarias para que cuadre al 100%.
DO $$
DECLARE
  r RECORD;
  v_diff NUMERIC;
  v_count INTEGER := 0;
BEGIN
  -- 4.1. Sanear débitos huérfanos de canjes fallidos de pruebas anteriores
  FOR r IN 
    SELECT wt.user_id, ABS(wt.amount) AS monto, wt.created_at
    FROM public.wallet_transactions wt
    WHERE (wt.description LIKE '%Canje a Bonos de Consumo%' OR wt.description LIKE '%Canje%')
      AND wt.type = 'debit'
      AND (wt.wallet_type = 'dinero' OR wt.wallet_type IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions wt2
        WHERE wt2.user_id = wt.user_id
          AND wt2.wallet_type = 'consumo'
          AND wt2.created_at >= (wt.created_at - INTERVAL '5 minutes')
          AND wt2.created_at <= (wt.created_at + INTERVAL '5 minutes')
          AND ABS(wt2.amount) = ABS(wt.amount)
      )
  LOOP
    PERFORM set_config('app.wallet_update_authorized', 'true', true);
    INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type, created_at)
    VALUES (r.user_id, r.monto, 'credit', 'Bono de Consumo acreditado por canje (Saneamiento prueba anterior)', 'consumo', r.created_at + INTERVAL '1 second');
    
    v_count := v_count + 1;
    RAISE NOTICE 'Saneado canje huérfano para usuario % por monto %', r.user_id, r.monto;
  END LOOP;

  -- 4.2. Sanear discrepancias de Bonos de Bienvenida o referidos antiguos que no tenían transacción
  FOR r IN 
    SELECT p.id AS user_id, COALESCE(p.referral_balance, 0) AS saldo_perfil, COALESCE((
      SELECT SUM(wt.amount) FROM public.wallet_transactions wt 
      WHERE wt.user_id = p.id AND wt.wallet_type = 'consumo'
    ), 0) AS suma_tx
    FROM public.profiles p
    WHERE COALESCE(p.referral_balance, 0) > 0
  LOOP
    v_diff := r.saldo_perfil - r.suma_tx;
    IF v_diff > 0 THEN
      PERFORM set_config('app.wallet_update_authorized', 'true', true);
      INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type, created_at)
      VALUES (r.user_id, v_diff, 'credit', 'Bono de Bienvenida / Saldo inicial en bonos (Saneamiento contable)', 'consumo', now() - INTERVAL '15 days');
      
      v_count := v_count + 1;
      RAISE NOTICE 'Saneado saldo inicial de bonos para usuario % por diferencia de %', r.user_id, v_diff;
    END IF;
  END LOOP;

  -- 4.3. Sanear discrepancias de saldo de dinero
  FOR r IN 
    SELECT p.id AS user_id, COALESCE(p.wallet_balance, 0) AS saldo_perfil, COALESCE((
      SELECT SUM(wt.amount) FROM public.wallet_transactions wt 
      WHERE wt.user_id = p.id AND (wt.wallet_type = 'dinero' OR wt.wallet_type IS NULL)
    ), 0) AS suma_tx
    FROM public.profiles p
    WHERE COALESCE(p.wallet_balance, 0) > 0
  LOOP
    v_diff := r.saldo_perfil - r.suma_tx;
    IF v_diff > 0 THEN
      PERFORM set_config('app.wallet_update_authorized', 'true', true);
      INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type, created_at)
      VALUES (r.user_id, v_diff, 'recharge', 'Saldo inicial de dinero (Saneamiento contable)', 'dinero', now() - INTERVAL '15 days');
      
      v_count := v_count + 1;
      RAISE NOTICE 'Saneado saldo inicial de dinero para usuario % por diferencia de %', r.user_id, v_diff;
    END IF;
  END LOOP;

  -- 4.4. Resincronizar finalmente todos los perfiles utilizando la ÚNICA fuente de verdad (la suma exacta de transacciones)
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  UPDATE public.profiles p
  SET 
    wallet_balance = COALESCE((
      SELECT SUM(amount) FROM public.wallet_transactions wt 
      WHERE wt.user_id = p.id AND (wt.wallet_type = 'dinero' OR wt.wallet_type IS NULL)
    ), 0),
    referral_balance = COALESCE((
      SELECT SUM(amount) FROM public.wallet_transactions wt 
      WHERE wt.user_id = p.id AND wt.wallet_type = 'consumo'
    ), 0);

  PERFORM set_config('app.wallet_update_authorized', '', true);
  RAISE NOTICE 'Proceso de saneamiento y unificación contable finalizado exitosamente. Total de ajustes: %', v_count;
END $$;
