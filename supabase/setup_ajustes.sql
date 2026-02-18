-- =============================================
-- ADJUSTMENTS FOR PIGGY APP v2
-- Run this in Supabase SQL Editor to support Marketplace features
-- =============================================

-- 1. Add extra columns to 'piggies' table
-- Tracks the extra ROI bonus from special marketplace items
ALTER TABLE piggies 
ADD COLUMN IF NOT EXISTS extra_roi_bonus numeric DEFAULT 0;

-- Tracks the category (Standard, Premium, Silver, Gold)
ALTER TABLE piggies 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'standard';

-- 2. Ensure RLS policies allow reading/writing these columns
-- (Existing policies on 'piggies' should cover all columns, but good to verify)

-- 3. Verify 'marketplace' table structure matches code expectations
-- (Already handled in previous setup, but for reference)
-- ALTER TABLE marketplace ADD COLUMN IF NOT EXISTS extra_roi numeric DEFAULT 0;
-- ALTER TABLE marketplace ADD COLUMN IF NOT EXISTS category text DEFAULT 'standard';
-- ALTER TABLE marketplace ADD COLUMN IF NOT EXISTS current_weight numeric DEFAULT 15.0;
