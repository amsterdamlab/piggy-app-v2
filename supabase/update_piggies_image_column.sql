-- ============================================================
-- SQL MIGRATION: ADD IMAGE_URL TO PIGGIES & BACKFILL RECORDS
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. ADD COLUMN TO PIGGIES TABLE IF NOT EXISTS
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. BACKFILL ALL EXISTING PIGGIES WITH CORRECT STAGE IMAGES
DO $$
DECLARE
    r RECORD;
    v_days_elapsed INT;
    v_stage INT;
    v_photo_num INT;
    v_image_url TEXT;
BEGIN
    FOR r IN SELECT id, purchase_date, end_date, status FROM public.piggies LOOP
        -- Calculate days elapsed since purchase
        v_days_elapsed := COALESCE(EXTRACT(day FROM (NOW() - r.purchase_date))::int, 0);
        
        -- Determine growth stage
        IF r.status = 'completado' OR v_days_elapsed > 90 THEN
            v_stage := 3;
        ELSIF v_days_elapsed > 30 THEN
            v_stage := 2;
        ELSE
            v_stage := 1;
        END IF;
        
        -- Generate random photo number between 1 and 5
        v_photo_num := floor(random() * 5 + 1)::int;
        v_image_url := 'assets/piggies/stage' || v_stage || '/et' || v_stage || '-' || v_photo_num || '.jpg';
        
        -- Update the record
        UPDATE public.piggies 
        SET image_url = v_image_url 
        WHERE id = r.id;
    END LOOP;
END $$;

-- 3. UPDATE TRANSACTIONAL PURCHASE FUNCTION (buy_piggy)
-- This ensures newly purchased piggies also get their stage image URL stored directly in the DB
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
  v_stage int;
  v_photo_num int;
  v_image_url text;
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

  -- Determine stage of purchase
  IF v_days_elapsed > 90 THEN
    v_stage := 3;
  ELSIF v_days_elapsed > 30 THEN
    v_stage := 2;
  ELSE
    v_stage := 1;
  END IF;

  -- Generate stable random photo number 1-5 and build path
  v_photo_num := floor(random() * 5 + 1)::int;
  v_image_url := 'assets/piggies/stage' || v_stage || '/et' || v_stage || '-' || v_photo_num || '.jpg';

  -- 2. Deduct stock
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id;

  -- Fetch user profile data to store in piggies table
  SELECT full_name INTO v_full_name
  FROM profiles
  WHERE id = p_user_id;

  -- 3. Create the piggy with calculated end_date and image_url stored directly
  INSERT INTO piggies (
    user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, current_weight,
    purchase_date, end_date, image_url
  )
  VALUES (
    p_user_id, p_item_name, v_full_name, p_price, 'engorde',
    p_extra_roi, p_category, 15.0,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval,
    v_image_url
  )
  RETURNING id INTO v_new_piggy_id;

  -- 4. Process referral commission (only triggers on first purchase)
  BEGIN
    v_referral_result := process_referral_on_purchase(p_user_id);
  EXCEPTION WHEN OTHERS THEN
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
