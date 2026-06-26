-- ============================================
-- PIGGY APP — Update Referral Code Trigger
-- Run this script in your Supabase SQL Editor
-- ============================================

-- ─── 1. Re-define the code generation function ───
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  cleaned_name TEXT;
  name_prefix VARCHAR(3);
  rand_num INTEGER;
  final_code VARCHAR(10);
  attempts INTEGER := 0;
BEGIN
  -- Normalize name (remove accents, convert to uppercase, keep only A-Z)
  cleaned_name := translate(upper(COALESCE(NEW.full_name, '')), 'ÁÉÍÓÚÜÑ', 'AEIOUUN');
  cleaned_name := regexp_replace(cleaned_name, '[^A-Z]', '', 'g');
  
  -- If name prefix is less than 3 chars, pad it with random letters
  IF length(cleaned_name) >= 3 THEN
    name_prefix := substr(cleaned_name, 1, 3);
  ELSE
    name_prefix := substr(cleaned_name || 'PIG', 1, 3);
  END IF;

  LOOP
    attempts := attempts + 1;
    
    IF attempts < 100 THEN
      -- Standard format: 3 letters + 3 digits (e.g., LAU591)
      rand_num := floor(random() * 900 + 100)::integer; -- 100 to 999
      final_code := name_prefix || rand_num::text;
    ELSE
      -- Fallback to avoid infinite loop on collision exhaustion (3 letters + 4 digits)
      rand_num := floor(random() * 9000 + 1000)::integer; -- 1000 to 9999
      final_code := name_prefix || rand_num::text;
    END IF;
    
    -- Handle collisions
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = final_code AND id != NEW.id) OR attempts > 200;
  END LOOP;

  NEW.referral_code := final_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Re-create the trigger on profiles table ───
DROP TRIGGER IF EXISTS trg_generate_referral_code ON profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();
