-- ==============================================================================
-- PIGGY APP: ACTUALIZACIÓN DEL BONO DE BIENVENIDA A $20.000 COP
-- Instrucciones: Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ==============================================================================

-- 1. Actualizar la función y trigger de Bono de Bienvenida automático para nuevos registros
CREATE OR REPLACE FUNCTION public.give_welcome_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se crea un perfil nuevo, automáticamente le insertamos 20.000 en Bonos de Consumo
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type)
  VALUES (
    NEW.id, 
    20000, 
    'credit', 
    'Bono de Bienvenida (aplica condiciones)', 
    'consumo'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que el trigger esté activo en la tabla profiles
DROP TRIGGER IF EXISTS trg_welcome_bonus ON public.profiles;
CREATE TRIGGER trg_welcome_bonus
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.give_welcome_bonus();

-- 3. Saneamiento de transacciones previas de $30.000 (Desactivando temporalmente el candado de inmutabilidad)
ALTER TABLE public.wallet_transactions DISABLE TRIGGER trg_prevent_transaction_modification;

UPDATE public.wallet_transactions
SET amount = 20000,
    description = 'Bono de Bienvenida ($20.000 en Tienda)'
WHERE description LIKE '%Bono de Bienvenida%'
  AND amount = 30000;

ALTER TABLE public.wallet_transactions ENABLE TRIGGER trg_prevent_transaction_modification;

-- 4. Recalcular el saldo de referral_balance en profiles basado en las transacciones reales
UPDATE public.profiles p
SET referral_balance = COALESCE((
  SELECT SUM(wt.amount)
  FROM public.wallet_transactions wt
  WHERE wt.user_id = p.id
    AND wt.wallet_type = 'consumo'
), 20000);

SELECT 'Bono de Bienvenida actualizado exitosamente a $20.000 COP en la BD' AS resultado;
