-- ==============================================================================
-- PIGGY APP: PERMITIR ELIMINACIÓN DE USUARIOS EN SUPABASE
-- Y ELIMINAR EL USUARIO DE PRUEBA
-- ==============================================================================

-- 1. Actualizar la función de inmutabilidad de transacciones para que NO bloquee
-- cuando un administrador o el Dashboard de Supabase elimine una cuenta
CREATE OR REPLACE FUNCTION public.prevent_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir eliminación si proviene del panel de Supabase (service_role, postgres o superuser)
  IF auth.role() = 'service_role' OR auth.role() IS NULL OR current_setting('app.allow_user_deletion', true) = 'true' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Operación no permitida: Las transacciones del historial son inmutables y no pueden ser modificadas o eliminadas.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar el usuario de prueba dianitaforbes@hotmail.com de inmediato
DO $$
DECLARE
  v_email TEXT := 'dianitaforbes@hotmail.com';
  v_user_id UUID;
BEGIN
  PERFORM set_config('app.allow_user_deletion', 'true', true);

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    ALTER TABLE public.wallet_transactions DISABLE TRIGGER trg_prevent_transaction_modification;

    DELETE FROM public.wallet_transactions WHERE user_id = v_user_id;
    DELETE FROM public.wallet_requests WHERE user_id = v_user_id;
    DELETE FROM public.piggies WHERE user_id = v_user_id;
    DELETE FROM public.missions WHERE user_id = v_user_id;
    DELETE FROM public.user_marketing_bonuses WHERE user_id = v_user_id;
    DELETE FROM public.referrals WHERE referrer_id = v_user_id OR referred_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;

    ALTER TABLE public.wallet_transactions ENABLE TRIGGER trg_prevent_transaction_modification;

    RAISE NOTICE '✅ Usuario % eliminado exitosamente.', v_email;
  ELSE
    RAISE NOTICE 'No se encontró el usuario %', v_email;
  END IF;
END $$;
