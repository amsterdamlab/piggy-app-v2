-- ==============================================================================
-- PIGGY APP — Migración: Reemplazar Número de Cuenta por Llave Bre-B
-- Ejecutar este script en el Supabase SQL Editor
-- ==============================================================================

-- 1. Eliminar columna bank_account_number de public.profiles si existe
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS bank_account_number;

-- 2. Asegurar que public.profiles tiene la columna bank_breve_key (Llave Bre-B)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_breve_key TEXT;

-- 3. Comentario explicativo en la columna
COMMENT ON COLUMN public.profiles.bank_breve_key IS 'Llave Bre-B del usuario (Celular, Cédula, Correo o Alías) para transferencias inmediatas de retiros.';
