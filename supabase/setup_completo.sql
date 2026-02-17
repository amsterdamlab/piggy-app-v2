-- ============================================
-- PIGGY APP — Script Completo de Datos Iniciales
-- Copia TODO este contenido y pégalo en el SQL Editor de Supabase
-- ============================================

-- 1. VERIFICAR/AGREGAR COLUMNAS FALTANTES
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS extra_roi NUMERIC DEFAULT 0;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 10;
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.piggies ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS discount_info TEXT;
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. INSERTAR PRODUCTOS DEL MARKETPLACE
INSERT INTO public.marketplace (item_name, description, price, extra_roi, stock, category)
VALUES
  ('Piggy Estándar', 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.', 1000000, 0, 50, 'standard'),
  ('Piggy Premium', 'Cerdo de raza premium con alimentación especial. Bono de +1% adicional.', 1200000, 0.01, 20, 'accelerator'),
  ('Piggy Elite', 'Cerdo élite con genética superior y cuidado personalizado. Bono de +2% adicional.', 1500000, 0.02, 10, 'accelerator'),
  ('Acelerador Nutricional', 'Suplemento premium que mejora el crecimiento. +1% al cerdo seleccionado.', 150000, 0.01, 100, 'booster');

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
END $$;

-- 5. VERIFICACIÓN FINAL
SELECT 'marketplace' AS tabla, count(*) AS registros FROM public.marketplace
UNION ALL
SELECT 'allies', count(*) FROM public.allies
UNION ALL
SELECT 'profiles', count(*) FROM public.profiles;
