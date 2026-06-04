-- ==============================================================================
-- PIGGY APP: AUTORIZACIÓN DE TRIGGER DE SINCRONIZACIÓN (SANEAMIENTO)
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase
-- ==============================================================================

-- La base de datos tiene este trigger ("sync_wallet_balance_to_profile") que se dispara 
-- cuando insertas en wallet_transactions. Vamos a inyectarle el token de autorización
-- para que la Veeduría le permita pasar.

CREATE OR REPLACE FUNCTION public.sync_wallet_balance_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Determinar a qué usuario le pertenece la transacción
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

  -- Es un AFTER trigger, retornar NULL es lo correcto
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;