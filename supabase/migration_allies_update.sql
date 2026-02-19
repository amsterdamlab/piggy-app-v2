-- ============================================
-- PIGGY APP — Migration: Add new columns to allies table
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add new columns
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS benefit TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Update existing allies with new data
UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
  description = 'Cortes selectos madurados y frescos para tus asados de fin de semana.',
  specialty = 'Cortes Premium',
  benefit = '15% de descuento en Punta de Anca',
  phone = '310 123 4567',
  address = 'Av. Pasoancho # 50-20'
WHERE name = 'Carnes Don Julio';

UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  description = 'Sabor tradicional con ingredientes del campo directo a tu mesa.',
  specialty = 'Comida Típica',
  benefit = '10% en platos con cerdo',
  phone = '312 456 7890',
  address = 'San Antonio Cra 4 # 2-10'
WHERE name = 'Restaurante El Fogón';

UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1615937651188-4b92cd38052e?auto=format&fit=crop&w=800&q=80',
  description = 'Abastecemos tu negocio con la mejor carne de cerdo de la región.',
  specialty = 'Venta al Por Mayor',
  benefit = 'Envío gratis en pedidos mayoristas',
  phone = '300 555 1234',
  address = 'Centro, Calle 50 # 40-20'
WHERE name = 'SuperCarnes Express';

UPDATE public.allies
SET
  image_url = 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
  description = 'Expertos en cocción lenta al barril. Chicharrón ahumado inigualable.',
  specialty = 'Parrilla & Barril',
  benefit = '2x1 los jueves en platos de cerdo',
  phone = '315 987 6543',
  address = 'Granada Calle 9 # 12-45'
WHERE name = 'La Parrilla de Pepe';

-- 3. Insert new allies (Petshop & Barbería)
INSERT INTO public.allies (name, category, location, discount_info, image_url, description, specialty, benefit, phone, address)
VALUES
('Huellitas Felices', 'Petshop', 'Bogotá, Cundinamarca', '10% en Baño y Peluquería', 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80', 'Todo para consentir a tu peludo. Baño, peluquería y juguetes.', 'Alimentos y Spa', '10% en Baño y Peluquería', '312 456 7890', 'Av. Principal # 45-12'),
('El Barbero', 'Barbería', 'Cali, Valle del Cauca', '2x1 en corte de cabello y barba', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', 'Estilo y tradición. Afeitado con toalla caliente y los mejores cortes.', 'Cortes Clásicos', '2x1 en corte de cabello y barba', '315 789 1234', 'Calle 10 # 20-30');

-- 4. Verify the update
SELECT name, category, specialty, description, benefit, image_url, phone, address FROM public.allies;
