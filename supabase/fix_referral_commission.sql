-- =============================================
-- FIX: Referral Commission on First Purchase
-- Run this in Supabase SQL Editor
-- =============================================
-- Problem: process_referral_on_purchase may not exist or has flawed 
-- "first purchase" detection logic. This script recreates it properly.

-- ─── 1. Drop old version to avoid conflicts ───
DROP FUNCTION IF EXISTS process_referral_on_purchase(UUID);

-- ─── 2. Recreate with robust first-purchase logic ───
CREATE OR REPLACE FUNCTION process_referral_on_purchase(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_completed_count INTEGER;
  v_commission INTEGER;
  v_tier VARCHAR(10);
  v_piggy_count INTEGER;
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

  -- Credit the referrer's balance
  UPDATE profiles
  SET referral_balance = COALESCE(referral_balance, 0) + v_commission
  WHERE id = v_referral.referrer_id;

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

-- ─── 4. Also ensure validate_referral_code and link_referral have grants ───
GRANT EXECUTE ON FUNCTION validate_referral_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_code TO service_role;
GRANT EXECUTE ON FUNCTION link_referral TO authenticated;
GRANT EXECUTE ON FUNCTION link_referral TO service_role;

-- ─── 5. Verification: check pending referrals that should have been completed ───
-- This retroactively fixes any referrals that were missed
-- It finds users who have piggies AND a pending referral, meaning the 
-- commission was never triggered.
DO $$
DECLARE
  v_record RECORD;
  v_completed_count INTEGER;
  v_commission INTEGER;
  v_tier VARCHAR(10);
BEGIN
  FOR v_record IN 
    SELECT r.id AS referral_id, r.referrer_id, r.referred_id
    FROM referrals r
    WHERE r.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM piggies p WHERE p.user_id = r.referred_id
    )
  LOOP
    -- Determine commission tier for this referrer
    SELECT COUNT(*) INTO v_completed_count
    FROM referrals
    WHERE referrer_id = v_record.referrer_id AND status = 'completed';

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

    -- Complete the referral
    UPDATE referrals
    SET status = 'completed',
        commission_amount = v_commission,
        commission_tier = v_tier,
        completed_at = now()
    WHERE id = v_record.referral_id;

    -- Credit the referrer
    UPDATE profiles
    SET referral_balance = COALESCE(referral_balance, 0) + v_commission
    WHERE id = v_record.referrer_id;

    RAISE NOTICE 'Fixed referral % -> referrer % credited %', 
      v_record.referral_id, v_record.referrer_id, v_commission;
  END LOOP;
END $$;

-- ─── 6. Final verification query ───
SELECT 
  r.id,
  r.referrer_id,
  r.referred_id,
  r.status,
  r.commission_amount,
  r.commission_tier,
  p_referrer.full_name AS referrer_name,
  p_referred.full_name AS referred_name,
  p_referrer.referral_balance AS referrer_balance
FROM referrals r
LEFT JOIN profiles p_referrer ON r.referrer_id = p_referrer.id
LEFT JOIN profiles p_referred ON r.referred_id = p_referred.id
ORDER BY r.created_at DESC;
