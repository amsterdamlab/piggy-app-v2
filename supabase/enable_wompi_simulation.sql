-- =============================================
-- PIGGY APP — Enable Wompi Simulation Recharge
-- Run this in Supabase SQL Editor BEFORE testing the simulation
-- =============================================

-- 1. Add wallet_type column to wallet_transactions if not exists
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';

-- 2. Add payment_method column to track how the recharge was made
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;

-- 3. Add simulation_status column to track simulated vs real transactions
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS simulation_status VARCHAR(20) DEFAULT NULL;
-- Values: NULL (real transaction), 'simulated_approved', 'simulated_rejected'

-- 4. Update the trigger function to allow simulation_recharge from authenticated users
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY: Only allow positive transactions (credits/recharges) from:
  -- a) Service role (admin recargas reales)
  -- b) Authenticated users if type = 'simulation_recharge' (Wompi simulation)
  -- c) Server-side SECURITY DEFINER functions (cycle completions)
  IF NEW.amount > 0 AND auth.role() = 'authenticated' THEN
    -- Allow simulation_recharge type for Wompi simulation
    IF NEW.type != 'simulation_recharge' THEN
      RAISE EXCEPTION 'Operación no permitida: No puedes realizar recargas de saldo directas. Usa la pasarela de pagos.';
    END IF;
  END IF;

  -- Only update wallet balance if the transaction is approved (not rejected)
  -- simulation_rejected status should NOT affect the wallet balance
  IF NEW.simulation_status IS NULL OR NEW.simulation_status != 'simulated_rejected' THEN
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-attach the trigger (in case the function was replaced)
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER trg_update_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance_from_transaction();

-- 6. Allow authenticated users to insert simulation_recharge type transactions
-- We update the existing RLS policy or create a new one for this type
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      amount < 0  -- always allow debits
      OR type = 'simulation_recharge'  -- allow simulation recharges
    )
  );

SELECT 'Wompi simulation enabled successfully' AS status;
