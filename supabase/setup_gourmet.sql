-- ============================================
-- PIGGY APP — Setup Gourmet Offers Table
-- Run this in your Supabase SQL Editor to initialize/configure the table.
-- ============================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.gourmet_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC,
    tag TEXT,
    emoji TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5. Ensure columns exist if the table was created previously without them
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS emoji TEXT;
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.gourmet_offers ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Enable RLS (Row Level Security)
ALTER TABLE public.gourmet_offers ENABLE ROW LEVEL SECURITY;

-- 3. Create public read policy (Safe to run repeatedly)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public gourmet_offers read') THEN
    CREATE POLICY "Public gourmet_offers read" ON public.gourmet_offers FOR SELECT USING (true);
  END IF;
END $$;

-- 4. Seed initial premium data (Clear table first to avoid duplicate seeds)
TRUNCATE public.gourmet_offers;

INSERT INTO public.gourmet_offers (name, description, price, original_price, tag, emoji, image_url, is_active, sort_order)
VALUES
(
  'Combos de Carne Fresca', 
  'Directo de Granja Villa Morales. Cerdo, pollo y res de la mejor calidad. Envío gratis en Cali.', 
  0, 
  NULL, 
  '🔥 Oferta de la Semana', 
  '🥩', 
  'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80', 
  TRUE, 
  0
),
(
  'Cerdo entero disponible', 
  'Compra cerdo en etapa final de engorde o en canal entero o despostado con precios exclusivos de granja por ser parte de Piggy App.', 
  950000, 
  NULL, 
  '✨ Exclusivo Granja', 
  '🐷', 
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', 
  TRUE, 
  1
),
(
  'Combo Parrillero Familiar', 
  '3kg Costilla de cerdo + 2kg Chorizo artesanal + 1kg Chicharrón', 
  149000, 
  185000, 
  '🔥 Más vendido', 
  '🥩', 
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80', 
  TRUE, 
  2
),
(
  'Combo Premium Mixto', 
  '2kg Lomo de cerdo + 2kg Pechuga de pollo + 1.5kg Carne de res molida', 
  178000, 
  210000, 
  '⭐ Premium', 
  '🍖', 
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', 
  TRUE, 
  3
),
(
  'Combo Semanal Hogar', 
  '2kg Pernil de cerdo + 2kg Muslo de pollo + 1kg Carne para guisar', 
  135000, 
  160000, 
  '💰 Ahorra más', 
  '🐔', 
  'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80', 
  TRUE, 
  4
);
