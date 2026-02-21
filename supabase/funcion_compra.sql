-- =============================================
-- TRANSACTIONAL PURCHASE FUNCTION
-- Run this in Supabase SQL Editor
-- Now includes referral commission processing
-- =============================================

-- Drop old version
DROP FUNCTION IF EXISTS buy_piggy(bigint, uuid, numeric, text, numeric, text);
DROP FUNCTION IF EXISTS buy_piggy(uuid, uuid, numeric, text, numeric, text);

CREATE OR REPLACE FUNCTION buy_piggy(
  p_item_id uuid,
  p_user_id uuid,
  p_price numeric,
  p_item_name text,
  p_extra_roi numeric,
  p_category text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_piggy_id uuid;
  v_current_stock int;
  v_referral_result jsonb;
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

  -- 2. Deduct stock
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- 3. Create the piggy
  INSERT INTO piggies (
    user_id, name, investment_amount, status,
    extra_roi_bonus, category, current_weight
  )
  VALUES (
    p_user_id, p_item_name, p_price, 'engorde',
    p_extra_roi, p_category, 15.0
  )
  RETURNING id INTO v_new_piggy_id;

  -- 4. Process referral commission (only triggers on first purchase)
  --    This function checks internally if it's the user's first piggy
  --    and if they have a pending referral. If both conditions are met,
  --    it credits the referrer's wallet automatically.
  BEGIN
    v_referral_result := process_referral_on_purchase(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    -- Non-blocking: if referral processing fails, the purchase still succeeds
    v_referral_result := jsonb_build_object('triggered', false, 'reason', 'error');
  END;

  RETURN json_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;
