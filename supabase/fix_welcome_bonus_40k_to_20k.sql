-- ==============================================================================
-- PIGGY APP: CORRECCIÓN DEFINITIVA DE BONO DE BIENVENIDA ($20.000 COP)
-- Y SANEAMIENTO CONTABLE DE SALDOS DUPLICADOS ($40.000 -> $20.000)
-- 
-- Instrucciones:
-- 1. Ve al panel de Supabase > SQL Editor
-- 2. Copia y pega este script completo y haz clic en 'Run'
-- ==============================================================================

-- 1. Asegurar que las columnas de saldos en public.profiles inicien por defecto en 0
-- (El saldo real se deriva exclusivamente de las transacciones contables)
ALTER TABLE public.profiles ALTER COLUMN consumption_balance SET DEFAULT 0;
ALTER TABLE public.profiles ALTER COLUMN wallet_balance SET DEFAULT 0;
ALTER TABLE public.profiles ALTER COLUMN referral_balance SET DEFAULT 0;

-- 2. Actualizar el trigger de creación de perfil desde auth.users
-- Para que inserte con consumption_balance = 0 (el trigger give_welcome_bonus le acreditará los $20.000)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_whatsapp TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp'), '');

  BEGIN
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      whatsapp,
      terms_accepted,
      habeas_data_accepted,
      referral_balance,
      consumption_balance,
      wallet_balance,
      welcome_bonus_status
    )
    VALUES (
      NEW.id,
      v_name,
      NEW.email,
      v_whatsapp,
      true,
      true,
      0,
      0,
      0,
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      whatsapp = COALESCE(public.profiles.whatsapp, EXCLUDED.whatsapp);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'PiggyApp handle_new_user warning: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Trigger idempotente de Bono de Bienvenida en public.profiles
-- Evita cualquier duplicación si el perfil se reinserta o actualiza
CREATE OR REPLACE FUNCTION public.give_welcome_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo insertar bono si el usuario no tiene ya una transacción de bienvenida registrada
  IF NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions 
    WHERE user_id = NEW.id 
      AND (description ILIKE '%bienvenida%' OR description ILIKE '%welcome%')
  ) THEN
    INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type)
    VALUES (
      NEW.id, 
      20000, 
      'credit', 
      'Bono de Bienvenida (aplica condiciones)', 
      'consumo'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_welcome_bonus ON public.profiles;
CREATE TRIGGER trg_welcome_bonus
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.give_welcome_bonus();

-- 4. Asegurar el trigger canónico del libro contable en wallet_transactions
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

DROP TRIGGER IF EXISTS trg_canonical_wallet_ledger ON public.wallet_transactions;
CREATE TRIGGER trg_canonical_wallet_ledger
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_canonical_wallet_ledger();

-- 5. ASIGNAR BONO A USUARIOS ACTIVOS QUE NO LO TENGAN REGISTRADO
INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type)
SELECT 
  p.id, 
  20000, 
  'credit', 
  'Bono de Bienvenida (aplica condiciones)', 
  'consumo'
FROM public.profiles p
WHERE (p.welcome_bonus_status = 'active' OR p.welcome_bonus_status IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions wt
    WHERE wt.user_id = p.id
      AND (wt.description ILIKE '%bienvenida%' OR wt.description ILIKE '%welcome%')
  );

-- 6. RECONCILIACIÓN Y SANEAMIENTO CONTABLE DE TODOS LOS USUARIOS EXISTENTES
-- Se ajusta el saldo de cada usuario para que coincida 100% con la suma real de sus transacciones
DO $$
BEGIN
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  UPDATE public.profiles p
  SET consumption_balance = COALESCE((
    SELECT SUM(wt.amount)
    FROM public.wallet_transactions wt
    WHERE wt.user_id = p.id
      AND wt.wallet_type LIKE '%consumo%'
  ), 0);

  PERFORM set_config('app.wallet_update_authorized', '', true);
END $$;

-- 7. REPORTE DE VERIFICACIÓN
SELECT 
  p.id, 
  p.full_name, 
  p.email, 
  p.consumption_balance AS saldo_bonos_consumo,
  p.welcome_bonus_status,
  COALESCE((
    SELECT COUNT(*) 
    FROM public.wallet_transactions wt 
    WHERE wt.user_id = p.id AND wt.wallet_type LIKE '%consumo%'
  ), 0) AS total_txs_consumo
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 25;
