-- ============================================
-- PIGGY APP — Migration: Add display_order to allies table
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add display_order column (nullable integer)
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT NULL;

-- 2. Optional: Set initial positions for featured allies
-- UPDATE public.allies SET display_order = 1 WHERE name = 'Carnes Don Julio';
-- UPDATE public.allies SET display_order = 2 WHERE name = 'La Parrilla de Pepe';
-- UPDATE public.allies SET display_order = 3 WHERE name = 'El Fogón de la Abuela';

-- 3. Verify ordering query
SELECT name, category, display_order, benefit 
FROM public.allies 
ORDER BY display_order ASC NULLS LAST, name ASC;
