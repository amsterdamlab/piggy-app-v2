-- =============================================
-- MIGRATION: Add current_month to marketplace
-- and update buy_piggy to calculate end_date
-- based on the piggy's current month.
-- Run this in Supabase SQL Editor.
-- =============================================

-- 1. Add current_month column to marketplace
--    Values: 1-5, representing which month of the fattening cycle the piggy is in.
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_month INTEGER DEFAULT 1;

-- 2. Add current_weight column if not exists (for display purposes)
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_weight NUMERIC DEFAULT 15.0;

-- 3. Update existing marketplace items with correct month values per category
UPDATE public.marketplace SET current_month = 1, current_weight = 15.0 WHERE category = 'standard';
UPDATE public.marketplace SET current_month = 2, current_weight = 38.0 WHERE category = 'premium' OR category = 'accelerator';
UPDATE public.marketplace SET current_month = 3, current_weight = 58.0 WHERE category = 'silver';
UPDATE public.marketplace SET current_month = 4, current_weight = 82.0 WHERE category = 'gold';

-- 4. Drop old function signatures and recreate with month-aware logic
DROP FUNCTION IF EXISTS buy_piggy(bigint, uuid, numeric, text, numeric, text);
DROP FUNCTION IF EXISTS buy_piggy(uuid, uuid, numeric, text, numeric, text);
DROP FUNCTION IF EXISTS buy_piggy(uuid, uuid, numeric, text, numeric, text, integer);

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
  v_days_elapsed int;
  v_days_remaining int;
  v_total_cycle_days int := 143; -- ~4 months 3 weeks
BEGIN
  -- Lock the marketplace row
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
  -- Month 1: 0 days elapsed, Month 2: 30 days, Month 3: 60 days, etc.
  v_days_elapsed := GREATEST(0, (p_current_month - 1) * 30);
  v_days_remaining := GREATEST(1, v_total_cycle_days - v_days_elapsed);

  -- Reduce stock
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- Create piggy with calculated end_date based on remaining days
  INSERT INTO piggies (
    user_id, name, investment_amount, status,
    extra_roi_bonus, category, current_weight,
    purchase_date, end_date
  )
  VALUES (
    p_user_id, p_item_name, p_price, 'engorde',
    p_extra_roi, p_category, 15.0,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval
  )
  RETURNING id INTO v_new_piggy_id;

  RETURN json_build_object(
    'success', true,
    'piggy_id', v_new_piggy_id,
    'days_remaining', v_days_remaining
  );
END;
$$;

GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;
