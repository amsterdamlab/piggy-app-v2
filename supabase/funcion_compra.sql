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
  p_current_month integer DEFAULT 1,
  p_contract_url text DEFAULT NULL,
  p_contract_code text DEFAULT NULL
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
  v_image_url text;
  v_final_contract_code text;
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

  -- 2. Deduct stock and retrieve item image_url
  UPDATE marketplace
  SET stock = stock - 1
  WHERE id = p_item_id
  RETURNING image_url INTO v_image_url;

  IF v_image_url IS NULL OR v_image_url = '' THEN
    v_image_url := 'assets/piggies/stage' || v_stage || '/et' || v_stage || '-1.jpg';
  END IF;

  -- Fetch user profile data to store in piggies table
  SELECT full_name INTO v_full_name
  FROM profiles
  WHERE id = p_user_id;

  -- Generate new UUID for piggy
  v_new_piggy_id := gen_random_uuid();

  -- Determine final contract code
  IF p_contract_code IS NOT NULL AND p_contract_code <> '' THEN
    v_final_contract_code := p_contract_code;
  ELSIF p_contract_url IS NOT NULL AND p_contract_url <> '' THEN
    -- Extract code from contract_url if present
    v_final_contract_code := substring(p_contract_url from 'PGY-TX-[A-Za-z0-9]+-([A-Za-z0-9]+)');
    IF v_final_contract_code IS NOT NULL THEN
      v_final_contract_code := 'PGY-TX-' || upper(v_final_contract_code);
    ELSE
      v_final_contract_code := '#' || upper(substring(replace(v_new_piggy_id::text, '-', '') from 27 for 6));
    END IF;
  ELSE
    -- Fallback for piggies without contract: # + last 6 characters of ID
    v_final_contract_code := '#' || upper(substring(replace(v_new_piggy_id::text, '-', '') from 27 for 6));
  END IF;

  -- 3. Create the piggy with calculated end_date, image_url, contract_url, and contract_code stored directly
  INSERT INTO piggies (
    id, user_id, name, full_name, investment_amount, status,
    extra_roi_bonus, category, current_weight,
    purchase_date, end_date, image_url, contract_url, contract_code
  )
  VALUES (
    v_new_piggy_id, p_user_id, p_item_name, v_full_name, p_price, 'engorde',
    p_extra_roi, p_category, 15.0,
    NOW(),
    NOW() + (v_days_remaining || ' days')::interval,
    v_image_url,
    p_contract_url,
    v_final_contract_code
  );

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
    'contract_code', v_final_contract_code,
    'referral', v_referral_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION buy_piggy TO authenticated;
GRANT EXECUTE ON FUNCTION buy_piggy TO service_role;
