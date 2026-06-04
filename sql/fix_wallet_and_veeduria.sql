-- ==============================================================================
-- PIGGY APP: VEEDURÍA INTERNA Y SANEAMIENTO DE WALLET
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase
-- ==============================================================================

-- 1. SANEAMIENTO DEL USUARIO AFECTADO
-- Recalcula el saldo estricto basándose en el historial inmutable de transacciones.
UPDATE public.profiles p
SET 
  wallet_balance = COALESCE((
    SELECT SUM(amount) 
    FROM public.wallet_transactions wt 
    WHERE wt.user_id = p.id AND wt.wallet_type = 'dinero'
  ), 0),
  referral_balance = COALESCE((
    SELECT SUM(amount) 
    FROM public.wallet_transactions wt 
    WHERE wt.user_id = p.id AND wt.wallet_type = 'consumo'
  ), 0)
WHERE id = 'e1547aad-1773-41b0-affb-a089b6a84997';


-- 2. REGLA DE VEEDURÍA INTERNA (BLOQUEO DE EDICIÓN MANUAL)
-- Crea la función que evalúa si el cambio viene directo de una edición humana
CREATE OR REPLACE FUNCTION public.prevent_manual_balance_update()
RETURNS TRIGGER AS $$
BEGIN
  -- pg_trigger_depth() = 0 significa que la instrucción proviene directamente
  -- de un usuario, API externa o el editor de tabla de Supabase (no de otro trigger).
  IF pg_trigger_depth() = 0 THEN
    
    -- Si intentan cambiar el saldo de dinero
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
      RAISE EXCEPTION 'VEEDURIA INTERNA: No puedes editar el saldo de dinero (wallet_balance) directamente en el perfil. Para mantener la trazabilidad financiera, debes insertar un registro en la tabla "wallet_transactions" (wallet_type = dinero).';
    END IF;

    -- Si intentan cambiar el saldo de consumo (referidos/bonos)
    IF NEW.referral_balance IS DISTINCT FROM OLD.referral_balance THEN
      RAISE EXCEPTION 'VEEDURIA INTERNA: No puedes editar el saldo de consumo (referral_balance) directamente en el perfil. Para mantener la trazabilidad financiera, debes insertar un registro en la tabla "wallet_transactions" (wallet_type = consumo).';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. ENGANCHE DE LA REGLA A LA TABLA PROFILES
DROP TRIGGER IF EXISTS trg_prevent_manual_balance_update ON public.profiles;

CREATE TRIGGER trg_prevent_manual_balance_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_manual_balance_update();

-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================
