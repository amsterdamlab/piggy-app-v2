-- =============================================
-- FIX: Referral Commission on First Purchase & Audit Log
-- Run this in Supabase SQL Editor
-- =============================================

-- ─── 1. Drop old version to avoid conflicts ───
DROP FUNCTION IF EXISTS process_referral_on_purchase(UUID);

-- ─── 2. Recreate with robust first-purchase and audit logging logic ───
CREATE OR REPLACE FUNCTION process_referral_on_purchase(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_completed_count INTEGER;
  v_commission INTEGER;
  v_tier VARCHAR(10);
  v_piggy_count INTEGER;
  v_referred_name VARCHAR(255);
BEGIN
  -- Count how many piggies the user has (including the one just inserted)
  SELECT COUNT(*) INTO v_piggy_count
  FROM piggies
  WHERE user_id = p_user_id;

  -- If user has more than 1 piggy, this is NOT their first purchase → skip
  IF v_piggy_count > 1 THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'not_first_purchase');
  END IF;

  -- Check if user has a pending referral record
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'no_pending_referral');
  END IF;

  -- Count how many referrals the REFERRER has already completed (for tier calc)
  SELECT COUNT(*) INTO v_completed_count
  FROM referrals
  WHERE referrer_id = v_referral.referrer_id AND status = 'completed';

  -- Determine commission based on tier
  IF v_completed_count < 5 THEN
    v_commission := 30000;
    v_tier := 'tier_1';
  ELSIF v_completed_count < 15 THEN
    v_commission := 50000;
    v_tier := 'tier_2';
  ELSE
    v_commission := 80000;
    v_tier := 'tier_3';
  END IF;

  -- Mark referral as completed with commission info
  UPDATE referrals
  SET status = 'completed',
      commission_amount = v_commission,
      commission_tier = v_tier,
      completed_at = now()
  WHERE id = v_referral.id;

  -- Get referred user's name
  SELECT COALESCE(full_name, 'Usuario Referido') INTO v_referred_name
  FROM profiles
  WHERE id = p_user_id;

  -- Credit the referrer's balance via wallet_transactions (trigger will update profiles.referral_balance automatically)
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type)
  VALUES (
    v_referral.referrer_id,
    v_commission,
    'credit',
    'Comisión de Referido: Primera compra de ' || v_referred_name,
    'consumo'
  );

  RETURN jsonb_build_object(
    'triggered', true,
    'referrer_id', v_referral.referrer_id,
    'commission', v_commission,
    'tier', v_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Grant execution permissions ───
GRANT EXECUTE ON FUNCTION process_referral_on_purchase TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_on_purchase TO service_role;

-- ─── 4. Retroactive Audit Log Fix for Completed Referrals without Transactions ───
-- This script runs a check across all completed referrals and creates any missing 
-- wallet_transactions logs for the referrers, temporarily disabling the trigger 
-- to prevent double-crediting of the referral_balance.
DO $$
DECLARE
  v_referrer RECORD;
  v_completed_referrals_count INTEGER;
  v_logged_transactions_count INTEGER;
  v_missing_transactions_count INTEGER;
  v_referred_user RECORD;
BEGIN
  -- Disable trigger to prevent double-crediting balance
  ALTER TABLE public.wallet_transactions DISABLE TRIGGER trg_update_wallet_balance;

  -- Loop through all referrers who have completed referrals
  FOR v_referrer IN 
    SELECT DISTINCT r.referrer_id 
    FROM public.referrals r
    WHERE r.status = 'completed'
  Loop
    -- Get count of completed referrals
    SELECT COUNT(*) INTO v_completed_referrals_count
    FROM public.referrals
    WHERE referrer_id = v_referrer.referrer_id AND status = 'completed';

    -- Get count of logged commission transactions
    SELECT COUNT(*) INTO v_logged_transactions_count
    FROM public.wallet_transactions
    WHERE user_id = v_referrer.referrer_id 
      AND wallet_type = 'consumo' 
      AND type = 'credit'
      AND (description LIKE 'Comisión de Referido%' OR description LIKE '%comisión%referido%');

    -- Calculate how many logs are missing
    v_missing_transactions_count := v_completed_referrals_count - v_logged_transactions_count;

    IF v_missing_transactions_count > 0 THEN
      RAISE NOTICE 'Referrer % has % completed referrals but only % logged transactions. Logging % missing transactions...',
        v_referrer.referrer_id, v_completed_referrals_count, v_logged_transactions_count, v_missing_transactions_count;

      -- Find the completed referrals and check name-based existence
      FOR v_referred_user IN 
        SELECT r.referred_id, r.commission_amount, p.full_name, r.completed_at
        FROM public.referrals r
        LEFT JOIN public.profiles p ON r.referred_id = p.id
        WHERE r.referrer_id = v_referrer.referrer_id AND r.status = 'completed'
        ORDER BY r.completed_at ASC
      LOOP
        IF NOT EXISTS (
          SELECT 1 
          FROM public.wallet_transactions 
          WHERE user_id = v_referrer.referrer_id 
            AND wallet_type = 'consumo'
            AND description LIKE '%' || COALESCE(v_referred_user.full_name, 'Usuario Referido') || '%'
        ) AND v_missing_transactions_count > 0 THEN
          -- Insert the missing transaction log
          INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type, created_at)
          VALUES (
            v_referrer.referrer_id,
            COALESCE(v_referred_user.commission_amount, 30000),
            'credit',
            'Comisión de Referido: Primera compra de ' || COALESCE(v_referred_user.full_name, 'Usuario Referido'),
            'consumo',
            COALESCE(v_referred_user.completed_at, now())
          );
          v_missing_transactions_count := v_missing_transactions_count - 1;
        END IF;
      END LOOP;

      -- If there are still missing transactions, insert generic ones
      WHILE v_missing_transactions_count > 0 LOOP
        INSERT INTO public.wallet_transactions (user_id, amount, type, description, wallet_type)
        VALUES (
          v_referrer.referrer_id,
          30000,
          'credit',
          'Comisión de Referido (Ajuste de Trazabilidad)',
          'consumo'
        );
        v_missing_transactions_count := v_missing_transactions_count - 1;
      END LOOP;

    END IF;
  END LOOP;

  -- Re-enable trigger
  ALTER TABLE public.wallet_transactions ENABLE TRIGGER trg_update_wallet_balance;
END $$;
