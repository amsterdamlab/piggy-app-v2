-- ==============================================================================
-- PIGGY APP — Sincronización Automática de Perfiles y Corrección de Huérfanos
-- Ejecuta todo este script en el SQL Editor del panel de Supabase
-- ==============================================================================

-- 1. FUNCIÓN DE SINCRONIZACIÓN AUTOMÁTICA (SECURITY DEFINER)
-- Se ejecuta en el servidor de base de datos de forma privilegiada saltándose RLS.
-- Garantiza que cada vez que alguien se registre en auth.users, se cree su perfil al instante.
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
  -- Extraer los metadatos enviados desde el frontend al registrarse
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_whatsapp := NEW.raw_user_meta_data->>'whatsapp';

  -- Insertar o actualizar en public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    whatsapp,
    terms_accepted,
    habeas_data_accepted,
    referral_balance
  )
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_whatsapp,
    true,
    true,
    30000
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  RETURN NEW;
END;
$$;

-- 2. RECREAR EL TRIGGER EN LA TABLA DEL SISTEMA auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. SINCRONIZACIÓN RETROACTIVA (BACKFILL) DE USUARIOS HUÉRFANOS
-- Esto resolverá inmediatamente el caso de correos como forbesotero@gmail.com
-- que existan en auth.users pero no aparezcan en public.profiles
-- ==============================================================================
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  whatsapp,
  terms_accepted, 
  habeas_data_accepted, 
  referral_balance
)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', u.email), 
  u.raw_user_meta_data->>'whatsapp',
  true, 
  true, 
  30000
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 4. VERIFICACIÓN: Comprobar que todos los usuarios de auth ahora estén en profiles
SELECT 
  u.email AS correo_en_auth,
  p.full_name AS nombre_en_profiles,
  p.referral_balance AS bono_consumo,
  CASE WHEN p.id IS NOT NULL THEN '✅ SINCRONIZADO' ELSE '❌ HUÉRFANO' END AS estado
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
