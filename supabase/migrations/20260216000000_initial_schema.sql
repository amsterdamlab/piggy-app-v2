-- 1. TABLA DE PERFILES (Extensión de Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  whatsapp TEXT UNIQUE,
  terms_accepted BOOLEAN DEFAULT FALSE,
  habeas_data_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA DE PIGGIES (Activos de los usuarios)
CREATE TABLE IF NOT EXISTS public.piggies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'engorde' CHECK (status IN ('engorde', 'completado', 'liquidado')),
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '4 months 3 weeks'),
  investment_amount NUMERIC DEFAULT 1000000, -- $1.000.000 COP
  extra_roi_bonus NUMERIC DEFAULT 0, -- Para los aceleradores (+1%, +2%)
  current_weight NUMERIC DEFAULT 15.0, -- Peso inicial estimado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE MARKETPLACE (Aceleradores y cerdos especiales)
CREATE TABLE IF NOT EXISTS public.marketplace (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  extra_roi NUMERIC DEFAULT 0, -- Ejemplo: 0.01 para +1%
  stock INTEGER DEFAULT 10,
  image_url TEXT,
  category TEXT
);

-- 4. TABLA DE ALIADOS
CREATE TABLE IF NOT EXISTS public.allies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- Restaurante, Carnicería, Distribuidor
  location TEXT, -- Ciudad (Cali, etc.)
  logo_url TEXT,
  discount_info TEXT
);

-- 5. TABLA DE MISIONES (Gamificación)
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_name TEXT,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  type TEXT,
  icon TEXT
);

-- Seguridad y Privacidad (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piggies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios solo ven sus propios datos
CREATE POLICY "Users can see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can see own piggies" ON public.piggies FOR SELECT USING (auth.uid() = user_id);

-- Marketplace y Aliados son públicos para lectura
CREATE POLICY "Public marketplace read" ON public.marketplace FOR SELECT USING (true);
CREATE POLICY "Public allies read" ON public.allies FOR SELECT USING (true);

-- Misiones son privadas
CREATE POLICY "Users can see own missions" ON public.missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.missions FOR UPDATE USING (auth.uid() = user_id);
