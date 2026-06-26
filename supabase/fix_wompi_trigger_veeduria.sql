-- ==============================================================================
-- PIGGY APP — Fix Wompi Simulation Trigger & Veeduría
-- Run this in Supabase SQL Editor to authorize Wompi balance updates.
-- ==============================================================================

-- 1. Ensure traceability columns exist on wallet_transactions
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS simulation_status VARCHAR(20) DEFAULT NULL;

-- 2. Update the trigger function to authorize Wompi balance updates via Veeduría token
CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY: Only allow positive transactions (credits/recharges) from:
  -- a) Service role (admin recargas reales)
  -- b) Authenticated users if type = 'simulation_recharge' (Wompi simulation)
  -- c) Server-side SECURITY DEFINER functions (cycle completions)
  IF NEW.amount > 0 AND auth.role() = 'authenticated' THEN
    -- Use ::text cast for robust enum comparison
    IF NEW.type::text != 'simulation_recharge' THEN
      RAISE EXCEPTION 'Operación no permitida: No puedes realizar recargas de saldo directas. Usa la pasarela de pagos.';
    END IF;
  END IF;

  -- Only update wallet balance if the transaction is approved (not rejected)
  -- simulation_rejected status should NOT affect the wallet balance
  IF NEW.simulation_status IS NULL OR NEW.simulation_status::text != 'simulated_rejected' THEN
    
    -- 🟢 AUTHORIZE THE TRANSACTION IN SESSION TO PASS VEEDURÍA TRIGGER ON PROFILES
    PERFORM set_config('app.wallet_update_authorized', 'true', true);

    IF NEW.wallet_type::text = 'consumo' THEN
      UPDATE public.profiles
      SET referral_balance = COALESCE(referral_balance, 0) + NEW.amount
      WHERE id = NEW.user_id;
    ELSE
      UPDATE public.profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
      WHERE id = NEW.user_id;
    END IF;

    -- 🔴 REMOVE AUTHORIZATION AFTER UPDATE
    PERFORM set_config('app.wallet_update_authorized', '', true);

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach the trigger
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER trg_update_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance_from_transaction();

-- 4. Update the RLS policy to ensure users can insert simulation_recharge transactions safely
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      amount < 0  -- always allow debits
      OR type::text = 'simulation_recharge'  -- allow simulation recharges (approved/rejected)
    )
  );

SELECT 'Wompi simulation trigger fixed successfully' AS status;
