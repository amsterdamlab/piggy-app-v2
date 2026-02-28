-- 1. Crear el tipo de dato ENUM (Esto crea la lista desplegable en el Table Editor)
DO $$ BEGIN
    CREATE TYPE request_status_enum AS ENUM ('pending', 'processed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Actualizar la tabla para usar el nuevo tipo ENUM
-- Primero quitamos las restricciones viejas
ALTER TABLE public.wallet_requests DROP CONSTRAINT IF EXISTS wallet_requests_status_check;

-- Luego convertimos la columna al nuevo tipo de lista
ALTER TABLE public.wallet_requests 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE request_status_enum USING status::request_status_enum,
  ALTER COLUMN status SET DEFAULT 'pending'::request_status_enum;

-- 3. Crear la función automática que descuenta el dinero
CREATE OR REPLACE FUNCTION process_wallet_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificamos si el administrador cambió el estado de 'pending' a 'processed'
  IF OLD.status = 'pending' AND NEW.status = 'processed' THEN
    
    -- Le descontamos el saldo de la wallet al usuario
    UPDATE profiles
    SET referral_balance = referral_balance - NEW.amount
    WHERE id = NEW.user_id;

    -- Dejamos registro automático de cuándo se procesó
    NEW.processed_at = now();
    
    -- Mostrar mensaje silencioso de éxito interno
    RAISE LOG 'Saldo de % descontado al usuario % exitosamente', NEW.amount, NEW.user_id;
  END IF;

  RETURN NEW; -- Retorna la fila actualizada para guardarla
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enganchar la función a la tabla (El Trigger)
DROP TRIGGER IF EXISTS tr_process_wallet_request ON public.wallet_requests;
CREATE TRIGGER tr_process_wallet_request
  BEFORE UPDATE ON public.wallet_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_wallet_request();