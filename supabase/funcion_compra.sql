-- =============================================
-- TRANSACTIONAL PURCHASE FUNCTION
-- Run this in Supabase SQL Editor to enable real purchases with stock management
-- =============================================

-- Drop existing function first to avoid signature conflicts
DROP FUNCTION IF EXISTS buy_piggy(bigint, uuid, numeric, text, numeric, text);

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
SECURITY DEFINER
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

  -- 3. Create User's Piggy (purchase_date uses DB default)
  INSERT INTO piggies (
    user_id, 
    name, 
    investment_amount, 
    status, 
    extra_roi_bonus, 
    category, 
    current_weight
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

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;
