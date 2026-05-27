-- =============================================
-- TRANSACTIONAL PURCHASE FUNCTION
-- Run this in Supabase SQL Editor
-- Includes referral commission AND current_month logic
-- =============================================

-- Cleanup: Borrar todas las versiones antiguas de buy_piggy para evitar conflictos de firmas
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure as proc_name
        FROM pg_proc 
        WHERE proname = 'buy_piggy'
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.proc_name;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION buy_piggy(
  p_item_id uuid,
  p_user_id uuid,
  p_price numeric,
  p_item_name text,
  p_extra_roi numeric,
  p_category text,
  p_current_month integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_piggy_id uuid;
  v_current_stock int;
  v_referral_result jsonb;
  v_days_elapsed int;
  v_days_remaining int;
  v_total_cycle_days int := 143; -- ~4 months 3 weeks
  v_full_name text;
BEGIN
  -- 1. Lock and check stock
  SELECT stock INTO v_current_stock
  FROM marketplace
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Item not found in marketplace';
  END IF;

  IF v_current_stock <= 0 THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  -- Calculate days remaining based on current_month
  v_days_elapsed := GREATEST(0, (p_current_month - 1) * 30);
  v_days_remaining := GREATEST(1, v_total_cycle_days - v_days_elapsed);

  -- 2. Deduct stock
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- Fetch user full_name from profiles to store in piggies table for easy identification
  SELECT full_name INTO v_full_name
  FROM profiles
  WHERE id = p_user_id;

  -- 3. Create the piggy with calculated end_date based on remaining days
  INSERT INTO piggies (
    user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, current_weight,
    purchase_date, end_date
  )
  VALUES (
    p_user_id, p_item_name, v_full_name, p_price, 'engorde',
    p_extra_roi, p_category, 15.0,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval
  )
  RETURNING id INTO v_new_piggy_id;

  -- 4. Process referral commission (only triggers on first purchase)
  --    This function checks internally if it's the user's first piggy
  --    and if they have a pending referral.
  BEGIN
    v_referral_result := process_referral_on_purchase(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    -- Non-blocking: if referral processing fails, the purchase still succeeds
    v_referral_result := jsonb_build_object('triggered', false, 'reason', 'error');
  END;

  RETURN json_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'days_remaining', v_days_remaining,
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;
