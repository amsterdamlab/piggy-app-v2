-- ============================================
-- PIGGY APP — Add Email Column to Profiles
-- Run this in your Supabase SQL Editor.
-- ============================================

-- 1. Add email column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill existing records from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 3. Verify the columns and check some data
SELECT id, full_name, email, whatsapp, created_at FROM public.profiles LIMIT 10;
