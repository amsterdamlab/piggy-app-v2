-- =============================================
-- UPDATE: Profiles SELECT RLS Policy for Referrals
-- Run this in Supabase SQL Editor
-- =============================================
-- Problem: Referrers could not view the real full_name of their referred users
-- due to a restrictive profiles SELECT policy (auth.uid() = id).
-- Solution: Drop the old restrictive policy and replace it with one that
-- allows a user to see their own profile or profiles where they are the referrer.

DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;

CREATE POLICY "Users can see own profile or referred profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR 
    auth.uid() = referred_by
  );
