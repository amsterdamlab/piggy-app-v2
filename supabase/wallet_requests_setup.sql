-- =============================================
-- WALLET REQUESTS TABLE
-- Run this in Supabase SQL Editor
-- Stores withdrawal and consumption requests
-- =============================================

-- 1. Create the wallet_requests table
CREATE TABLE IF NOT EXISTS public.wallet_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('withdrawal', 'consumption')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
  bank_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_wallet_requests_user ON wallet_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_status ON wallet_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_type ON wallet_requests(request_type);

-- 3. RLS
ALTER TABLE wallet_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
DROP POLICY IF EXISTS "Users can see own wallet requests" ON wallet_requests;
CREATE POLICY "Users can see own wallet requests"
  ON wallet_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all (for admin operations and RPC inserts)
DROP POLICY IF EXISTS "Service can manage wallet requests" ON wallet_requests;
CREATE POLICY "Service can manage wallet requests"
  ON wallet_requests FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Function to create a wallet request (called from frontend)
CREATE OR REPLACE FUNCTION create_wallet_request(
  p_user_id UUID,
  p_type VARCHAR,
  p_amount NUMERIC,
  p_bank TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_request_id UUID;
BEGIN
  -- Get current referral balance
  SELECT COALESCE(referral_balance, 0) INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  -- Validate sufficient balance
  IF p_amount > v_current_balance THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_balance');
  END IF;

  -- Validate minimum amount
  IF p_amount < 10000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'below_minimum');
  END IF;

  -- Insert the request
  INSERT INTO wallet_requests (user_id, request_type, amount, bank_name, status)
  VALUES (p_user_id, p_type, p_amount, p_bank, 'pending')
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'amount', p_amount,
    'type', p_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_wallet_request TO authenticated;
GRANT EXECUTE ON FUNCTION create_wallet_request TO service_role;

-- 5. Verification
SELECT 'wallet_requests table created' AS status;
