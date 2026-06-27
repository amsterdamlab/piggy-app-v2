-- ==============================================================================
-- PIGGY APP — Fix Wompi Simulation Trigger & Balance Duplication
-- Run this in Supabase SQL Editor to resolve balance calculation issues.
-- ==============================================================================

-- 1. Ensure traceability columns exist on wallet_transactions
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS simulation_status VARCHAR(20) DEFAULT NULL;

-- 2. Update update_wallet_balance_from_transaction to ONLY check security.
-- The actual balance sync is handled by trg_sync_wallet_balance_to_profile (which sums all transactions).
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

  -- We return NEW to allow the insert. We do NOT perform any profile UPDATE here
  -- because trg_sync_wallet_balance_to_profile runs AFTER INSERT and updates the balance.
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

-- 5. RECALCULATE AND CORRECT ALL USER BALANCES IN THE DATABASE (FIX CORRUPTED STATE)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 🟢 AUTHORIZE THE TRANSACTION IN SESSION TO PASS VEEDURÍA TRIGGER ON PROFILES
  PERFORM set_config('app.wallet_update_authorized', 'true', true);

  FOR r IN SELECT id FROM public.profiles LOOP
    UPDATE public.profiles 
    SET 
      wallet_balance = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.wallet_transactions 
        WHERE user_id = r.id AND (wallet_type = 'dinero' OR wallet_type IS NULL)
      ),
      referral_balance = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.wallet_transactions 
        WHERE user_id = r.id AND wallet_type = 'consumo'
      )
    WHERE id = r.id;
  END LOOP;

  -- 🔴 REMOVE AUTHORIZATION AFTER UPDATE
  PERFORM set_config('app.wallet_update_authorized', '', true);
END $$;

SELECT 'Wompi simulation trigger and balances corrected successfully' AS status;
