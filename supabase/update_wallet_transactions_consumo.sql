-- ========================================================
-- PIGGY APP: GENERALIZACIÓN DE BONOS Y BONO DE BIENVENIDA
-- Instrucciones: Ejecuta este código en el SQL Editor de Supabase
-- ========================================================

-- 1. Añadimos la columna wallet_type para saber si afecta 'dinero' o 'consumo'
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';

-- 2. Modificamos el Trigger que actualiza los saldos para que respete el tipo de billetera
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- SEGURIDAD: Evitar que usuarios normales se recarguen saldo de dinero a sí mismos
  -- Solo permitimos que el sistema o roles administrativos hagan inserts positivos.
  IF NEW.amount > 0 AND auth.role() = 'authenticated' THEN
    RAISE EXCEPTION 'Operación no permitida: No puedes realizar recargas de saldo directas.';
  END IF;

  -- Dependiendo del tipo de billetera, actualizamos una columna u otra en el perfil
  IF NEW.wallet_type = 'consumo' THEN
    -- Actualiza el saldo de Bonos de Consumo (usando la columna referral_balance como contenedor genérico)
    UPDATE public.profiles
    SET referral_balance = COALESCE(referral_balance, 0) + NEW.amount
    WHERE id = NEW.user_id;
  ELSE
    -- Comportamiento por defecto: Actualiza el Dinero en Cuenta
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Opcional, asegurar que el trigger principal de wallet siga estando enganchado)
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER trg_update_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance_from_transaction();


-- 3. Crear función y Trigger para dar BONO DE BIENVENIDA AUTOMÁTICO
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

-- Enganchar el Bono de Bienvenida a la creación de un Perfil
DROP TRIGGER IF EXISTS trg_welcome_bonus ON public.profiles;
CREATE TRIGGER trg_welcome_bonus
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.give_welcome_bonus();

-- Verificación visual en la consola de Supabase
SELECT 'Configuración de Bonos y Bienvenida completada exitosamente' AS status;
