-- =============================================
-- ADD USER INFO TO PIGGIES AND UPDATE REFERRAL CODE LOGIC
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. ADD COLUMNS TO PIGGIES TABLE
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

-- Note: In PostgreSQL, to move a column before another (like 'name' before 'user_id'),
-- you must use the Supabase Dashboard Table Editor to reorder them visually,
-- as SQL does not support inserting columns in specific positions without dropping the table.

-- 2. BACKFILL EXISTING PIGGIES WITH USER INFO
UPDATE public.piggies p
SET full_name = pr.full_name,
    whatsapp = pr.whatsapp
FROM public.profiles pr
WHERE p.user_id = pr.id;

-- 3. UPDATE REFERRAL CODE LOGIC TO 6 ALPHANUMERIC DIGITS
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
  final_code VARCHAR(6);
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    final_code := result;
    
    -- Handle collisions
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = final_code AND id != NEW.id);
  END LOOP;

  NEW.referral_code := final_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. BACKFILL EXISTING USERS TO 6 CHARACTERS
-- We update users who either have no referral code or a long one.
-- The upper(substr(md5(...))) generates exactly 6 uppercase alphanumeric chars.
UPDATE public.profiles
SET referral_code = UPPER(substr(md5(random()::text), 1, 6))
WHERE referral_code IS NULL OR length(referral_code) > 6;