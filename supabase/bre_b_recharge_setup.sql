-- ==============================================================================
-- PIGGY APP — Bre-B Semi-Automatic Recharge Setup & Admin Approval Workflow
-- Run this in Supabase SQL Editor to enable automatic balance updates when an admin
-- changes a Bre-B transaction from 'PENDING' to 'APPROVED'.
-- ==============================================================================

-- 1. Ensure required columns exist on wallet_transactions
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'dinero';

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS simulation_status VARCHAR(20) DEFAULT NULL;

-- 2. Trigger Function: Automatically credit user wallet_balance when an admin
-- updates simulation_status to 'APPROVED' in Supabase Table Editor.
CREATE OR REPLACE FUNCTION public.process_approved_breb_recharge()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if admin updated the status from PENDING to APPROVED
  IF (OLD.simulation_status = 'PENDING' OR OLD.simulation_status = 'pending') 
     AND (NEW.simulation_status = 'APPROVED' OR NEW.simulation_status = 'approved' OR NEW.simulation_status = 'processed') THEN
     
     -- 🟢 Authorize the balance update internally to satisfy the Veeduría protection trigger
     PERFORM set_config('app.wallet_update_authorized', 'true', true);
     
     -- Update profiles.wallet_balance directly with the approved amount
     UPDATE public.profiles
     SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount
     WHERE id = NEW.user_id;
     
     -- 🔴 Remove authorization token
     PERFORM set_config('app.wallet_update_authorized', '', true);
     
     RAISE LOG 'Recarga Bre-B aprobada exitosamente: % acreditados a usuario %', NEW.amount, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to wallet_transactions
DROP TRIGGER IF EXISTS trg_process_approved_breb_recharge ON public.wallet_transactions;
CREATE TRIGGER trg_process_approved_breb_recharge
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_approved_breb_recharge();

SELECT 'Bre-B recharge admin approval workflow and triggers ready' AS status;
