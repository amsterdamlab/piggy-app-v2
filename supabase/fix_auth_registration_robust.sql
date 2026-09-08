-- ==============================================================================
-- PIGGY APP — Corrección Definitiva y Resiliencia de Registro de Usuarios
-- Ejecuta este script en el SQL Editor del panel de Supabase
-- ==============================================================================

-- 1. ELIMINAR CUALQUIER RESTRICCIÓN DE UNICIDAD EN WHATSAPP
-- El campo WhatsApp ahora es opcional y no debe bloquear el registro si está vacío o duplicado
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_whatsapp_key;
DROP INDEX IF EXISTS profiles_whatsapp_key;
DROP INDEX IF EXISTS idx_profiles_whatsapp;

-- 2. ASEGURAR COLUMNAS NECESARIAS EN public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS habeas_data_accepted BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_balance NUMERIC DEFAULT 30000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consumption_balance NUMERIC DEFAULT 20000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_bonus_status TEXT DEFAULT 'active';

-- 3. POLÍTICA RLS PARA PERMITIR INSERT AL PROPIO USUARIO
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" 
      ON public.profiles 
      FOR INSERT 
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 4. FUNCIÓN TRIGGER ULTRA-RESILIENTE (SECURITY DEFINER CON MANEJO DE EXCEPCIONES)
-- Si por cualquier razón la inserción en profiles falla, la captura para NO abortar la creación en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_whatsapp TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp'), '');

  BEGIN
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      whatsapp,
      terms_accepted,
      habeas_data_accepted,
      referral_balance,
      consumption_balance,
      welcome_bonus_status
    )
    VALUES (
      NEW.id,
      v_name,
      NEW.email,
      v_whatsapp,
      true,
      true,
      30000,
      20000,
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      whatsapp = COALESCE(public.profiles.whatsapp, EXCLUDED.whatsapp);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'PiggyApp handle_new_user warning: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 5. REASIGNAR EL TRIGGER EN auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. SINCRONIZAR USUARIOS QUE HAYAN QUEDADO SIN PERFIL
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  whatsapp,
  terms_accepted, 
  habeas_data_accepted, 
  referral_balance,
  consumption_balance,
  welcome_bonus_status
)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', u.email), 
  NULLIF(TRIM(u.raw_user_meta_data->>'whatsapp'), ''),
  true, 
  true, 
  30000,
  20000,
  'active'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 7. REPORTE DE SINCRONIZACIÓN
SELECT 
  u.id,
  u.email AS correo_auth,
  p.full_name AS nombre_perfil,
  p.whatsapp AS telefono_whatsapp,
  CASE WHEN p.id IS NOT NULL THEN '✅ SINCRONIZADO' ELSE '⚠️ PENDIENTE' END AS estado
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 20;
