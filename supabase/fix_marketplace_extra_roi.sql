-- ============================================================
-- PIGGY APP — Fix Marketplace Extra ROI & Category Mismatch
-- Run this in your Supabase SQL Editor to correct values.
-- ============================================================

-- 1. Correct the extra_roi values in the marketplace table
-- Premium (e.g. Rosita) -> +3% (0.03)
-- Gold (e.g. Manchas)    -> +2% (0.02)
-- Silver (e.g. Mc Queen) -> +1% (0.01)

UPDATE public.marketplace
SET extra_roi = 0.03
WHERE category = 'premium';

UPDATE public.marketplace
SET extra_roi = 0.02
WHERE category = 'gold';

UPDATE public.marketplace
SET extra_roi = 0.01
WHERE category = 'silver';

-- Ensure standard and advanced items have 0 extra ROI
UPDATE public.marketplace
SET extra_roi = 0.00
WHERE category IN ('standard', 'advanced');

-- 2. Retroactively fix existing purchased piggies in the database
-- This ensures that users who bought piggies under the old wrong rates
-- receive their correct promised commission rates immediately.

UPDATE public.piggies
SET extra_roi_bonus = 0.03
WHERE category = 'premium' AND extra_roi_bonus != 0.03;

UPDATE public.piggies
SET extra_roi_bonus = 0.02
WHERE category = 'gold' AND extra_roi_bonus != 0.02;

UPDATE public.piggies
SET extra_roi_bonus = 0.01
WHERE category = 'silver' AND extra_roi_bonus != 0.01;

UPDATE public.piggies
SET extra_roi_bonus = 0.00
WHERE category IN ('standard', 'advanced') AND extra_roi_bonus != 0.00;

-- 3. Verification Query
SELECT item_name, category, extra_roi, stock FROM public.marketplace;
