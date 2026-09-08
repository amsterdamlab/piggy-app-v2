-- ==============================================================================
-- PIGGY APP: CORRECCIÓN DE LLAVES FORÁNEAS (CASCADE)
-- Y ELIMINACIÓN DEFINITIVA DEL USUARIO DE PRUEBA
-- ==============================================================================

-- 1. Configurar ON DELETE CASCADE en todas las tablas para permitir borrado limpio desde Supabase

-- A. Referidos en profiles (referred_by)
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_referred_by_fkey 
    FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- B. Tabla referrals
DO $$
BEGIN
  ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
  ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey;
  
  ALTER TABLE public.referrals 
    ADD CONSTRAINT referrals_referrer_id_fkey 
    FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

  ALTER TABLE public.referrals 
    ADD CONSTRAINT referrals_referred_id_fkey 
    FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- C. Tabla wallet_transactions
DO $$
BEGIN
  ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_user_id_fkey;
  ALTER TABLE public.wallet_transactions 
    ADD CONSTRAINT wallet_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- D. Tabla wallet_requests
DO $$
BEGIN
  ALTER TABLE public.wallet_requests DROP CONSTRAINT IF EXISTS wallet_requests_user_id_fkey;
  ALTER TABLE public.wallet_requests 
    ADD CONSTRAINT wallet_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- E. Tabla piggies
DO $$
BEGIN
  ALTER TABLE public.piggies DROP CONSTRAINT IF EXISTS piggies_user_id_fkey;
  ALTER TABLE public.piggies 
    ADD CONSTRAINT piggies_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- F. Tabla missions
DO $$
BEGIN
  ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_user_id_fkey;
  ALTER TABLE public.missions 
    ADD CONSTRAINT missions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- G. Tablas de misiones flash y bonos de marketing
DO $$
BEGIN
  ALTER TABLE public.user_flash_missions DROP CONSTRAINT IF EXISTS user_flash_missions_user_id_fkey;
  ALTER TABLE public.user_flash_missions 
    ADD CONSTRAINT user_flash_missions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.cycle_completion_missions DROP CONSTRAINT IF EXISTS cycle_completion_missions_user_id_fkey;
  ALTER TABLE public.cycle_completion_missions 
    ADD CONSTRAINT cycle_completion_missions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_marketing_bonuses DROP CONSTRAINT IF EXISTS user_marketing_bonuses_user_id_fkey;
  ALTER TABLE public.user_marketing_bonuses 
    ADD CONSTRAINT user_marketing_bonuses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. ELIMINAR AHORA EL USUARIO DE PRUEBA (dianitaforbes@hotmail.com)
DO $$
DECLARE
  v_email TEXT := 'dianitaforbes@hotmail.com';
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    PERFORM set_config('app.wallet_update_authorized', 'true', true);

    DELETE FROM public.wallet_transactions WHERE user_id = v_user_id;
    DELETE FROM public.wallet_requests WHERE user_id = v_user_id;
    DELETE FROM public.piggies WHERE user_id = v_user_id;
    DELETE FROM public.missions WHERE user_id = v_user_id;
    DELETE FROM public.user_marketing_bonuses WHERE user_id = v_user_id;
    DELETE FROM public.user_flash_missions WHERE user_id = v_user_id;
    DELETE FROM public.cycle_completion_missions WHERE user_id = v_user_id;
    DELETE FROM public.referrals WHERE referrer_id = v_user_id OR referred_id = v_user_id;
    UPDATE public.profiles SET referred_by = NULL WHERE referred_by = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;

    RAISE NOTICE '✅ Usuario % eliminado exitosamente.', v_email;
  ELSE
    RAISE NOTICE 'No se encontró el usuario %', v_email;
  END IF;
END $$;

SELECT 'Configuración CASCADE completada y usuario eliminado exitosamente' AS resultado;
