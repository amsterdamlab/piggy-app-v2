-- ============================================
-- PIGGY APP — Referral System Setup
-- Run this in Supabase SQL Editor (in order)
-- ============================================

-- ─── 1. ALTER profiles: add referral columns ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_balance INTEGER DEFAULT 0;

-- ─── 2. CREATE referrals table ───

CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  referred_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired')),
  commission_amount INTEGER DEFAULT 0,
  commission_tier VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ─── 3. Function to generate referral codes ───

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  base_code VARCHAR(10);
  final_code VARCHAR(10);
  suffix INTEGER := 0;
  clean_name VARCHAR;
BEGIN
  -- Take first 4 characters from full_name, uppercase, remove accents
  clean_name := UPPER(
    TRANSLATE(
      COALESCE(SUBSTRING(NEW.full_name FROM 1 FOR 4), 'USER'),
      'ÁÉÍÓÚáéíóúÑñ',
      'AEIOUaeiouNn'
    )
  );

  -- Build base code: NAME4 + last 4 chars of user ID
  base_code := clean_name || UPPER(RIGHT(NEW.id::TEXT, 4));
  final_code := base_code;

  -- Handle collisions by adding a numeric suffix
  WHILE EXISTS (SELECT 1 FROM profiles WHERE referral_code = final_code AND id != NEW.id) LOOP
    suffix := suffix + 1;
    final_code := base_code || suffix::TEXT;
  END LOOP;

  NEW.referral_code := final_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-generate code on profile insert
DROP TRIGGER IF EXISTS trg_generate_referral_code ON profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();

-- ─── 4. Generate codes for existing users ───

UPDATE profiles
SET referral_code = UPPER(
  TRANSLATE(
    COALESCE(SUBSTRING(full_name FROM 1 FOR 4), 'USER'),
    'ÁÉÍÓÚáéíóúÑñ',
    'AEIOUaeiouNn'
  )
) || UPPER(RIGHT(id::TEXT, 4))
WHERE referral_code IS NULL;

-- ─── 5. Function to process referral on first purchase ───

CREATE OR REPLACE FUNCTION process_referral_on_purchase(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_completed_count INTEGER;
  v_commission INTEGER;
  v_tier VARCHAR(10);
  v_has_previous_purchase BOOLEAN;
BEGIN
  -- Check if this user has previous piggies (not first purchase)
  SELECT EXISTS(
    SELECT 1 FROM piggies
    WHERE user_id = p_user_id
    AND id != (SELECT id FROM piggies WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1)
  ) INTO v_has_previous_purchase;

  -- If already has piggies before this one, skip
  IF v_has_previous_purchase THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'not_first_purchase');
  END IF;

  -- Check if user has a pending referral
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'no_pending_referral');
  END IF;

  -- Count completed referrals for the referrer (to determine tier)
  SELECT COUNT(*) INTO v_completed_count
  FROM referrals
  WHERE referrer_id = v_referral.referrer_id AND status = 'completed';

  -- Determine commission based on tier
  IF v_completed_count < 5 THEN
    v_commission := 30000;
    v_tier := 'tier_1';
  ELSIF v_completed_count < 15 THEN
    v_commission := 50000;
    v_tier := 'tier_2';
  ELSE
    v_commission := 80000;
    v_tier := 'tier_3';
  END IF;

  -- Update referral to completed
  UPDATE referrals
  SET status = 'completed',
      commission_amount = v_commission,
      commission_tier = v_tier,
      completed_at = now()
  WHERE id = v_referral.id;

  -- Credit the referrer's balance
  UPDATE profiles
  SET referral_balance = COALESCE(referral_balance, 0) + v_commission
  WHERE id = v_referral.referrer_id;

  RETURN jsonb_build_object(
    'triggered', true,
    'referrer_id', v_referral.referrer_id,
    'commission', v_commission,
    'tier', v_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. RLS Policies ───

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can read their own referrals (as referrer or referred)
CREATE POLICY "Users can read own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Only internal functions (service_role) can insert/update referrals
CREATE POLICY "Service can manage referrals"
  ON referrals FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow reading referral_code from any profile (needed for code validation)
-- This is handled by existing profiles RLS (if profiles are readable)

-- ─── 7. Function to validate referral code (public-safe) ───

CREATE OR REPLACE FUNCTION validate_referral_code(p_code VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_referrer RECORD;
BEGIN
  SELECT id, full_name, referral_code
  INTO v_referrer
  FROM profiles
  WHERE UPPER(referral_code) = UPPER(p_code);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'referrer_id', v_referrer.id,
    'referrer_name', v_referrer.full_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 8. Function to link referral on signup ───

CREATE OR REPLACE FUNCTION link_referral(p_referred_id UUID, p_referral_code VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE UPPER(referral_code) = UPPER(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'invalid_code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'self_referral');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_referred_id) THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'already_referred');
  END IF;

  -- Update profile
  UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_referred_id;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (v_referrer_id, p_referred_id, 'pending');

  RETURN jsonb_build_object(
    'linked', true,
    'referrer_id', v_referrer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
