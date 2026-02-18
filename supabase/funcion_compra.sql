-- =============================================
-- TRANSACTIONAL PURCHASE FUNCTION
-- Run this in Supabase SQL Editor to enable real purchases with stock management
-- =============================================

-- This function handles the purchase atomically:
-- 1. Checks stock
-- 2. Decrements stock
-- 3. Creates the piggy
-- 4. Bypasses RLS for the stock update (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION buy_piggy(
  p_item_id bigint,
  p_user_id uuid,
  p_price numeric,
  p_item_name text,
  p_extra_roi numeric,
  p_category text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to update stock
AS $$
DECLARE
  v_new_piggy_id uuid;
  v_current_stock int;
BEGIN
  -- 1. Lock and Check Stock
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

  -- 2. Decrement Stock
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- 3. Create User's Piggy
  INSERT INTO piggies (
    user_id, 
    name, 
    investment_amount, 
    status, 
    extra_roi_bonus, 
    category, 
    current_weight,
    purchase_date -- Let DB handle default now()
  )
  VALUES (
    p_user_id, 
    p_item_name, 
    p_price, 
    'engorde', 
    p_extra_roi, 
    p_category, 
    15.0
  )
  RETURNING id INTO v_new_piggy_id;

  -- 4. Return Success
  RETURN json_build_object('success', true, 'piggy_id', v_new_piggy_id);
END;
$$;

-- IMPORTANT: Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;
