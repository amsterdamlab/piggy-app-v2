-- Script de migración SQL para estandarizar el Marketplace de Piggies.
-- Ejecutar en Supabase SQL Editor.

-- 1. Asegurar que las columnas existan por si acaso
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_month INTEGER DEFAULT 1;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_weight NUMERIC DEFAULT 15.0;

-- 2. Limpiar ítems previos del marketplace
DELETE FROM public.marketplace;

-- 3. Insertar nuevo catálogo estandarizado
INSERT INTO public.marketplace (item_name, description, price, extra_roi, stock, category, current_month, current_weight)
VALUES
  ('Piggy Estándar', 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.', 1000000, 0.00, 25, 'standard', 1, 15.0),
  ('Piggy Advanced (Mes 2)', 'Cerdo en etapa de engorde avanzada. Compra al mismo precio de siempre pero ahorra tiempo.', 1000000, 0.00, 15, 'advanced', 2, 45.0),
  ('Piggy Advanced (Mes 3)', 'Cerdo con máximo periodo de avance en su ciclo de engorde (3 meses).', 1000000, 0.00, 10, 'advanced', 3, 65.0),
  ('Piggy Silver', 'Comercializado en un mercado plus con un +1% de margen comercial adicional.', 1000000, 0.01, 20, 'silver', 1, 15.0),
  ('Piggy Gold', 'Comercializado en un mercado plus premium con un +2% de margen comercial adicional.', 1000000, 0.02, 12, 'gold', 1, 15.0),
  ('Piggy Premium', 'Comercializado en un mercado plus exclusivo con un +3% de margen comercial adicional.', 1000000, 0.03, 8, 'premium', 1, 15.0);
