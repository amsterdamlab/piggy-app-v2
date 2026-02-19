-- ============================================
-- PIGGY APP — Migration: Add new columns to allies table
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add new columns
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS benefit TEXT;

-- 2. Update existing allies with new data
UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
  description = 'Cortes selectos madurados y frescos para tus asados de fin de semana.',
  specialty = 'Cortes Premium',
  benefit = '15% de descuento en Punta de Anca'
WHERE name = 'Carnes Don Julio';

UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  description = 'Sabor tradicional con ingredientes del campo directo a tu mesa.',
  specialty = 'Comida Típica',
  benefit = '10% en platos con cerdo'
WHERE name = 'Restaurante El Fogón';

UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1558030006-d35974213323?auto=format&fit=crop&w=800&q=80',
  description = 'Abastecemos tu negocio con la mejor carne de cerdo de la región.',
  specialty = 'Venta al Por Mayor',
  benefit = 'Envío gratis en pedidos mayoristas'
WHERE name = 'SuperCarnes Express';

UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
  description = 'Expertos en cocción lenta al barril. Chicharrón ahumado inigualable.',
  specialty = 'Parrilla & Barril',
  benefit = '2x1 los jueves en platos de cerdo'
WHERE name = 'La Parrilla de Pepe';

-- 3. Verify the update
SELECT name, category, specialty, description, benefit, image_url FROM public.allies;
