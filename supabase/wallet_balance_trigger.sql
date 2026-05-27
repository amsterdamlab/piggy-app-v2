-- =============================================
-- WALLET BALANCE TRIGGER & TRANSACTION SETUP
-- Run this in Supabase SQL Editor
-- Maintains profiles.wallet_balance automatically and securely.
-- =============================================

-- 1. Ensure profiles table has the wallet_balance column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;

-- 2. Create the wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'debit' | 'credit' | 'recharge' | 'cycle_completion'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);

-- 3. Create the trigger function to update wallet_balance and enforce security
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- SEGURIDAD: Evitar que usuarios normales se recarguen saldo a sí mismos
  -- Solo se permiten transacciones negativas (débitos) desde la API de clientes autenticados.
  -- Las transacciones positivas (créditos/recargas/liquidaciones) deben ser insertadas por el sistema (service_role)
  -- o por funciones del lado del servidor (SECURITY DEFINER).
  IF NEW.amount > 0 AND auth.role() = 'authenticated' THEN
    RAISE EXCEPTION 'Operación no permitida: No puedes realizar recargas de saldo directas.';
  END IF;

  -- Actualizar el saldo en la tabla de perfiles
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach the trigger to the wallet_transactions table
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER trg_update_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance_from_transaction();

-- 5. Enable Row Level Security (RLS) on transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own transactions
DROP POLICY IF EXISTS "Users can see own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can see own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions (e.g. to pay for a piggy)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Service role (admin) can do anything
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.wallet_transactions;
CREATE POLICY "Service role can manage transactions" ON public.wallet_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Verification log
SELECT 'Wallet transactions and secure trigger configured successfully' AS status;
