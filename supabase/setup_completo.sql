-- ============================================
-- PIGGY APP — Script Completo de Datos Iniciales
-- Copia TODO este contenido y pégalo en el SQL Editor de Supabase
-- ============================================

-- 1. VERIFICAR/AGREGAR COLUMNAS FALTANTES
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS extra_roi NUMERIC DEFAULT 0;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 10;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_month INTEGER DEFAULT 1;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS current_weight NUMERIC DEFAULT 15.0;

ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS discount_info TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. INSERTAR PRODUCTOS DEL MARKETPLACE
INSERT INTO public.marketplace (item_name, description, price, extra_roi, stock, category, current_month, current_weight)
VALUES
  ('Piggy Estándar', 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.', 1000000, 0.00, 25, 'standard', 1, 15.0),
  ('Piggy Advanced (Mes 2)', 'Cerdo en etapa de engorde avanzada. Compra al mismo precio de siempre pero ahorra tiempo.', 1000000, 0.00, 15, 'advanced', 2, 45.0),
  ('Piggy Advanced (Mes 3)', 'Cerdo con máximo periodo de avance en su ciclo de engorde (3 meses).', 1000000, 0.00, 10, 'advanced', 3, 65.0),
  ('Piggy Silver', 'Comercializado en un mercado plus con un +1% de margen comercial adicional.', 1000000, 0.01, 20, 'silver', 1, 15.0),
  ('Piggy Gold', 'Comercializado en un mercado plus premium con un +2% de margen comercial adicional.', 1000000, 0.02, 12, 'gold', 1, 15.0),
  ('Piggy Premium', 'Comercializado en un mercado plus exclusivo con un +3% de margen comercial adicional.', 1000000, 0.03, 8, 'premium', 1, 15.0);

-- 3. INSERTAR ALIADOS
INSERT INTO public.allies (name, category, location, discount_info)
VALUES
  ('Carnes Don Julio', 'Carnicería', 'Cali, Valle del Cauca', '15% de descuento en cortes premium'),
  ('Restaurante El Fogón', 'Restaurante', 'Bogotá, Cundinamarca', '10% en platos con cerdo'),
  ('SuperCarnes Express', 'Distribuidor', 'Medellín, Antioquia', 'Entrega gratuita en Medellín'),
  ('La Parrilla de Pepe', 'Restaurante', 'Cali, Valle del Cauca', '2x1 los jueves en platos de cerdo');

-- 4. HABILITAR RLS Y POLÍTICAS DE SEGURIDAD
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piggies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuarios ven solo SUS datos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see own profile') THEN
    CREATE POLICY "Users can see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see own piggies') THEN
    CREATE POLICY "Users can see own piggies" ON public.piggies FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public marketplace read') THEN
    CREATE POLICY "Public marketplace read" ON public.marketplace FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public allies read') THEN
    CREATE POLICY "Public allies read" ON public.allies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see own missions') THEN
    CREATE POLICY "Users can see own missions" ON public.missions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own missions') THEN
    CREATE POLICY "Users can insert own missions" ON public.missions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own missions') THEN
    CREATE POLICY "Users can update own missions" ON public.missions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. VERIFICACIÓN FINAL
SELECT 'marketplace' AS tabla, count(*) AS registros FROM public.marketplace
UNION ALL
SELECT 'allies', count(*) FROM public.allies
UNION ALL
SELECT 'profiles', count(*) FROM public.profiles;
