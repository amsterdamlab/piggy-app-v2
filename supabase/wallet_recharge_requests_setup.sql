-- ==============================================================================
-- PIGGY APP — Flujo Completo de Solicitudes de Recarga (Bre-B y QR)
-- Ejecuta este script en el SQL Editor de Supabase.
-- 
-- 1. Agrega la columna 'reference' y soporte para 'recharge' en wallet_requests.
-- 2. Configura permisos RLS para que los usuarios puedan registrar sus solicitudes.
-- 3. Crea la función RPC create_recharge_request para inserción segura.
-- 4. Crea el trigger que, al cambiar el estado a 'approved' o 'processed':
--    a) Inserta la transacción en wallet_transactions.
--    b) Acredita el saldo disponible en profiles.wallet_balance.
-- ==============================================================================

-- 1. Asegurar la existencia y estructura de la tabla wallet_requests
CREATE TABLE IF NOT EXISTS public.wallet_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status VARCHAR(30) DEFAULT 'pending',
  bank_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

-- 2. Eliminar restricciones antiguas que limitaban request_type o status
ALTER TABLE public.wallet_requests DROP CONSTRAINT IF EXISTS wallet_requests_request_type_check;
ALTER TABLE public.wallet_requests DROP CONSTRAINT IF EXISTS wallet_requests_status_check;
ALTER TABLE public.wallet_requests DROP CONSTRAINT IF EXISTS wallet_requests_type_check;

-- 3. Agregar columnas requeridas para recargas y trazabilidad
ALTER TABLE public.wallet_requests
ADD COLUMN IF NOT EXISTS reference TEXT;

ALTER TABLE public.wallet_requests
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.wallet_requests
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';

-- Si la columna status usa enum o varchar, aseguramos que admita 'approved'
DO $$ BEGIN
  ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'approved';
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 4. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_wallet_requests_user ON public.wallet_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_status ON public.wallet_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_reference ON public.wallet_requests(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_type ON public.wallet_requests(request_type);

-- 5. Asegurar estructura de wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  wallet_type VARCHAR(20) DEFAULT 'dinero',
  payment_method VARCHAR(50) DEFAULT NULL,
  simulation_status VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS simulation_status VARCHAR(20) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);

-- 6. Configurar Políticas de Seguridad RLS en wallet_requests
ALTER TABLE public.wallet_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own wallet requests" ON public.wallet_requests;
CREATE POLICY "Users can see own wallet requests" ON public.wallet_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallet requests" ON public.wallet_requests;
CREATE POLICY "Users can insert own wallet requests" ON public.wallet_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage wallet requests" ON public.wallet_requests;
CREATE POLICY "Service can manage wallet requests" ON public.wallet_requests
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Función RPC para registrar solicitudes de recarga desde el cliente de forma segura
CREATE OR REPLACE FUNCTION public.create_recharge_request(
  p_amount NUMERIC,
  p_payment_method VARCHAR,
  p_reference TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_request_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
  END IF;

  INSERT INTO public.wallet_requests (
    user_id,
    request_type,
    payment_method,
    reference,
    amount,
    status,
    wallet_type,
    bank_name,
    notes,
    created_at
  ) VALUES (
    v_user_id,
    'recharge',
    p_payment_method,
    p_reference,
    p_amount,
    'pending',
    'dinero',
    'Bancolombia',
    p_notes,
    now()
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'reference', p_reference,
    'amount', p_amount,
    'status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_recharge_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_recharge_request TO service_role;

-- 8. Trigger Function: Procesar solicitudes en wallet_requests (Aprobación y Rechazo)
CREATE OR REPLACE FUNCTION public.process_wallet_request()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_desc TEXT;
  v_method_label TEXT;
BEGIN
  -- Detectar cambio de estado de 'pending' a 'approved' o 'processed'
  IF (OLD.status = 'pending' OR OLD.status = 'PENDING') 
     AND (NEW.status = 'approved' OR NEW.status = 'APPROVED' OR NEW.status = 'processed' OR NEW.status = 'PROCESSED') THEN
    
    -- 🟢 CASO 1: RECARGA DE SALDO (Bre-B, QR, etc.)
    IF NEW.request_type = 'recharge' OR NEW.request_type = 'recharge_breb' OR NEW.request_type = 'recharge_qr' THEN
      v_method_label := CASE 
        WHEN NEW.payment_method = 'BRE_B' THEN 'Bre-B'
        WHEN NEW.payment_method = 'QR_CODE' THEN 'Código QR'
        ELSE COALESCE(NEW.payment_method, 'Transferencia')
      END;

      v_tx_desc := 'Recarga ' || v_method_label || ' [Ref: ' || COALESCE(NEW.reference, '') || ']';
      
      -- Autorizar sesión para actualizar saldo evitando bloqueos de seguridad
      PERFORM set_config('app.wallet_update_authorized', 'true', true);
      
      -- 1. Insertar el movimiento oficial en wallet_transactions
      INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        type,
        description,
        wallet_type,
        payment_method,
        simulation_status,
        created_at
      ) VALUES (
        NEW.user_id,
        NEW.amount,
        'recharge',
        v_tx_desc,
        'dinero',
        NEW.payment_method,
        'APPROVED',
        now()
      );
      
      -- 2. Acreditar el saldo en profiles.wallet_balance
      UPDATE public.profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
      WHERE id = NEW.user_id;
      
      PERFORM set_config('app.wallet_update_authorized', '', true);
      
      NEW.processed_at := now();
      RAISE LOG 'Recarga % aprobada: % acreditados a usuario % [Ref: %]', NEW.payment_method, NEW.amount, NEW.user_id, NEW.reference;
    
    -- 🟢 CASO 2: RETIRO O CONSUMO PROCESADO
    ELSIF NEW.request_type IN ('withdrawal', 'consumption') THEN
      NEW.processed_at := now();
    END IF;

  -- 🔴 CASO 3: SOLICITUD RECHAZADA
  ELSIF (OLD.status = 'pending' OR OLD.status = 'PENDING') 
        AND (NEW.status = 'rejected' OR NEW.status = 'REJECTED') THEN
    NEW.processed_at := now();
    
    -- Si era un retiro de dinero que ya se había retenido, devolver saldo
    IF NEW.request_type = 'withdrawal' THEN
      PERFORM set_config('app.wallet_update_authorized', 'true', true);
      
      UPDATE public.profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
      WHERE id = NEW.user_id;
      
      INSERT INTO public.wallet_transactions (
        user_id, amount, type, description, wallet_type, created_at
      ) VALUES (
        NEW.user_id, NEW.amount, 'credit', 'Devolución por retiro bancario no procesado', 'dinero', now()
      );
      
      PERFORM set_config('app.wallet_update_authorized', '', true);
    
    -- Si era un canje de consumo que ya se había retenido, devolver saldo
    ELSIF NEW.request_type = 'consumption' THEN
      PERFORM set_config('app.wallet_update_authorized', 'true', true);
      
      IF NEW.wallet_type = 'consumo' THEN
        UPDATE public.profiles
        SET referral_balance = COALESCE(referral_balance, 0) + NEW.amount
        WHERE id = NEW.user_id;
      ELSE
        UPDATE public.profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
        WHERE id = NEW.user_id;
      END IF;
      
      INSERT INTO public.wallet_transactions (
        user_id, amount, type, description, wallet_type, created_at
      ) VALUES (
        NEW.user_id, NEW.amount, 'credit', 'Devolución por canje de consumo no procesado', COALESCE(NEW.wallet_type, 'consumo'), now()
      );
      
      PERFORM set_config('app.wallet_update_authorized', '', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enganchar el trigger a wallet_requests
DROP TRIGGER IF EXISTS trg_process_wallet_request ON public.wallet_requests;
DROP TRIGGER IF EXISTS tr_process_wallet_request ON public.wallet_requests;
CREATE TRIGGER trg_process_wallet_request
  BEFORE UPDATE ON public.wallet_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.process_wallet_request();

-- 10. Verificación final
SELECT 'Setup de wallet_requests, reference, RLS y trigger de aprobación completado exitosamente.' AS status;
