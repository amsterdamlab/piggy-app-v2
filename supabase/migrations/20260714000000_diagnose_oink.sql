-- Diagnosis: check what is wrong with the piggy "Oink"
-- This migration will query the database and insert a diagnostic log in the marketplace table
-- so we can read it using the anon key.

DO $$
DECLARE
  r RECORD;
  v_details TEXT := '';
  v_trigger_exists BOOLEAN;
  v_piggies_count INT;
BEGIN
  -- 1. Check if the handle_piggy_completion trigger exists in pg_trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_piggy_completion' OR tgname = 'handle_piggy_completion'
  ) INTO v_trigger_exists;

  v_details := v_details || 'Trigger handle_piggy_completion exists: ' || v_trigger_exists::text || E'\n';

  -- 2. Find piggies matching 'Oink'
  SELECT COUNT(*) INTO v_piggies_count FROM public.piggies WHERE name ILIKE '%Oink%';
  v_details := v_details || 'Piggies matching Oink count: ' || v_piggies_count::text || E'\n';

  FOR r IN 
    SELECT p.id, p.user_id, p.status, p.purchase_date, p.end_date, p.investment_amount, p.extra_roi_bonus,
           pr.full_name, pr.wallet_balance, pr.referral_balance
    FROM public.piggies p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.name ILIKE '%Oink%'
  LOOP
    v_details := v_details || E'\n--- PIGGY FOUND ---\n';
    v_details := v_details || 'Piggy ID: ' || r.id::text || E'\n';
    v_details := v_details || 'User ID: ' || r.user_id::text || E'\n';
    v_details := v_details || 'User Name: ' || COALESCE(r.full_name, 'N/A') || E'\n';
    v_details := v_details || 'Status: ' || r.status || E'\n';
    v_details := v_details || 'End Date: ' || r.end_date::text || E'\n';
    v_details := v_details || 'Investment: ' || r.investment_amount::text || E'\n';
    v_details := v_details || 'Extra ROI: ' || r.extra_roi_bonus::text || E'\n';
    v_details := v_details || 'User Wallet Balance: ' || r.wallet_balance::text || E'\n';
    v_details := v_details || 'User Referral Balance: ' || r.referral_balance::text || E'\n';

    -- Find transactions for this user
    DECLARE
      t RECORD;
      tx_details TEXT := '';
    BEGIN
      FOR t IN 
        SELECT amount, type, description, wallet_type, created_at
        FROM public.wallet_transactions
        WHERE user_id = r.user_id
        ORDER BY created_at DESC
        LIMIT 10
      LOOP
        tx_details := tx_details || E'  - [' || t.created_at::text || '] Amount: ' || t.amount::text || ', Type: ' || t.type || ', Desc: ' || COALESCE(t.description, 'N/A') || ', Wallet: ' || COALESCE(t.wallet_type::text, 'N/A') || E'\n';
      END LOOP;
      v_details := v_details || 'Transactions (last 10):' || E'\n' || tx_details;
    END;
  END LOOP;

  -- Delete previous diagnostic if exists
  DELETE FROM public.marketplace WHERE item_name = 'DIAGNOSTICO_OINK';

  -- Insert the diagnosis into public.marketplace
  INSERT INTO public.marketplace (item_name, description, price, stock, category)
  VALUES (
    'DIAGNOSTICO_OINK',
    v_details,
    0,
    1,
    'diagnostic'
  );
END $$;