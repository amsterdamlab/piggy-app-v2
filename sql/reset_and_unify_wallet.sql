-- ==============================================================================
-- PIGGY APP: UNIFICACIÓN DE BILLETERA, TIPO FUNCIONAL Y RESETEO
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LIMPIEZA DE TRIGGERS CONFLICTIVOS EN WALLET_TRANSACTIONS
-- ------------------------------------------------------------------------------
-- Eliminamos todos los gatillos que estaban peleando entre sí
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
DROP TRIGGER IF EXISTS sync_wallet_balance_to_profile ON public.wallet_transactions; -- Por si tenía ese nombre de trigger
DROP FUNCTION IF EXISTS public.update_wallet_balance_from_transaction() CASCADE;


-- ------------------------------------------------------------------------------
-- 2. AUTOMATIZACIÓN DEL CAMPO 'TYPE' (CRÉDITO vs DÉBITO)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.format_transaction_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el tipo contiene palabras clave de resta, forzamos a que el monto sea negativo
  IF LOWER(NEW.type::text) LIKE '%debit%' OR LOWER(NEW.type::text) LIKE '%retiro%' OR LOWER(NEW.type::text) LIKE '%canje%' THEN
    NEW.amount := -ABS(NEW.amount);
  ELSE
    -- Por defecto (credit, recarga, bono), forzamos a que sea positivo
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
-- 3. UNIFICACIÓN DEL CÁLCULO DE SALDO (LA ÚNICA FUENTE DE VERDAD)
-- ------------------------------------------------------------------------------
-- Recreamos la función de sincronización, pero separando claramente ambos saldos
CREATE OR REPLACE FUNCTION public.sync_wallet_balance_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Identificar de quién es la transacción
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  -- 🟢 Autorización para la Veeduría
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  -- Recalcular Dinero (wallet_balance) y Consumo (referral_balance) aisladamente
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

  -- 🔴 Remover autorización
  PERFORM set_config('app.wallet_update_authorized', '', true);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enganchamos el trigger unificado para que corra DESPUÉS de cualquier cambio
DROP TRIGGER IF EXISTS trg_sync_wallet_balance_to_profile ON public.wallet_transactions;
CREATE TRIGGER trg_sync_wallet_balance_to_profile
AFTER INSERT OR UPDATE OR DELETE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_wallet_balance_to_profile();


-- ------------------------------------------------------------------------------
-- 4. RESETEO (CLEAN SLATE) DEL USUARIO DE PRUEBAS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  test_user UUID := 'e1547aad-1773-41b0-affb-a089b6a84997';
BEGIN
  -- Borrar todo el historial basura de este usuario específico
  DELETE FROM public.wallet_transactions WHERE user_id = test_user;

  -- Autorizar el cambio directo para saltar la Veeduría por esta única vez
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  -- Poner sus cuentas en cero absoluto
  UPDATE public.profiles 
  SET wallet_balance = 0, referral_balance = 0 
  WHERE id = test_user;

  -- Cerrar autorización
  PERFORM set_config('app.wallet_update_authorized', '', true);
END $$;