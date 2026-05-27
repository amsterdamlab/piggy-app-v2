-- ============================================
-- PIGGY APP — Flash Missions Setup (M8, M9, M10)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ──────────────────────────────────────────────────────────
-- 1. TABLA: user_flash_missions (M8 y M9)
--    Una fila = una asignación de oferta flash a un usuario.
--    El admin inserta filas desde Supabase Studio.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_flash_missions (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mission_key        TEXT NOT NULL,              -- 'm8' | 'm9'
  title              TEXT NOT NULL,
  description        TEXT,
  icon               TEXT DEFAULT '⚡',
  piggy_type         TEXT NOT NULL,              -- 'advanced' | 'gold'
  piggy_label        TEXT NOT NULL,              -- 'Piggy Advanced' | 'Piggy Gold'
  extra_roi_bonus    NUMERIC DEFAULT 0,          -- 0.01 = +1%  |  0.02 = +2%
  price              NUMERIC DEFAULT 1000000,    -- $1.000.000 COP
  duration_hours     INTEGER DEFAULT 72,
  is_active          BOOLEAN DEFAULT FALSE,      -- FALSE = preparada | TRUE = activa y contando
  activated_at       TIMESTAMP WITH TIME ZONE,   -- auto-set por trigger
  is_purchased       BOOLEAN DEFAULT FALSE,
  purchased_at       TIMESTAMP WITH TIME ZONE,
  purchased_piggy_id UUID REFERENCES public.piggies(id),
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 2. TABLA: exclusive_piggy_config (Config global M10)
--    Solo existe 1 fila. Admin edita piggy_type para cambiar
--    qué tipo de piggy exclusivo se ofrece en M10.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exclusive_piggy_config (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  piggy_type       TEXT NOT NULL DEFAULT 'silver',     -- 'silver' | 'gold' | 'premium'
  piggy_label      TEXT NOT NULL DEFAULT 'Piggy Silver',
  extra_roi_bonus  NUMERIC NOT NULL DEFAULT 0.01,      -- 0.01 | 0.02 | 0.03
  price            NUMERIC DEFAULT 1000000,
  duration_hours   INTEGER DEFAULT 48,
  min_piggies      INTEGER DEFAULT 3,                  -- min piggies que debe tener el usuario
  is_enabled       BOOLEAN DEFAULT TRUE,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fila inicial con Piggy Silver (+1%)
INSERT INTO public.exclusive_piggy_config (piggy_type, piggy_label, extra_roi_bonus, price, duration_hours, min_piggies)
VALUES ('silver', 'Piggy Silver', 0.01, 1000000, 48, 3)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 3. TABLA: cycle_completion_missions (Instancias M10)
--    Una fila por cada piggy completado que activa M10.
--    UNIQUE(piggy_id) garantiza exactamente 1 M10 por piggy.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_completion_missions (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  piggy_id           UUID REFERENCES public.piggies(id) ON DELETE CASCADE NOT NULL,
  piggy_type         TEXT NOT NULL,              -- snapshot de config en el momento de creación
  piggy_label        TEXT NOT NULL,
  extra_roi_bonus    NUMERIC NOT NULL,
  price              NUMERIC NOT NULL,
  expires_at         TIMESTAMP WITH TIME ZONE NOT NULL,
  is_completed       BOOLEAN DEFAULT FALSE,
  purchased_piggy_id UUID REFERENCES public.piggies(id),
  purchased_at       TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(piggy_id)   -- garantía BD: un piggy solo genera 1 misión M10 en toda su vida
);

-- ──────────────────────────────────────────────────────────
-- 4. TRIGGER: auto-registrar activated_at al activar M8/M9
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_flash_mission_activated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Al activar: registra el timestamp de activación
  IF NEW.is_active = TRUE AND (OLD.is_active = FALSE OR OLD.activated_at IS NULL) THEN
    NEW.activated_at = NOW();
  END IF;
  -- Al desactivar manualmente: limpia el timestamp para un relanzamiento limpio
  IF NEW.is_active = FALSE THEN
    NEW.activated_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_flash_mission_activated ON public.user_flash_missions;
CREATE TRIGGER trg_user_flash_mission_activated
BEFORE UPDATE ON public.user_flash_missions
FOR EACH ROW EXECUTE FUNCTION public.set_flash_mission_activated_at();

-- ──────────────────────────────────────────────────────────
-- 5. RLS — Seguridad a nivel de filas
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.user_flash_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusive_piggy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_completion_missions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN

  -- user_flash_missions: usuario ve/actualiza solo SUS filas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users see own flash missions') THEN
    CREATE POLICY "Users see own flash missions"
      ON public.user_flash_missions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own flash missions') THEN
    CREATE POLICY "Users update own flash missions"
      ON public.user_flash_missions FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- exclusive_piggy_config: lectura para todos los autenticados
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read exclusive config') THEN
    CREATE POLICY "Authenticated read exclusive config"
      ON public.exclusive_piggy_config FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- cycle_completion_missions: usuario ve/inserta/actualiza solo SUS filas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users see own cycle missions') THEN
    CREATE POLICY "Users see own cycle missions"
      ON public.cycle_completion_missions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own cycle missions') THEN
    CREATE POLICY "Users insert own cycle missions"
      ON public.cycle_completion_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own cycle missions') THEN
    CREATE POLICY "Users update own cycle missions"
      ON public.cycle_completion_missions FOR UPDATE USING (auth.uid() = user_id);
  END IF;

END $$;

-- ──────────────────────────────────────────────────────────
-- 6. VERIFICACIÓN FINAL
-- ──────────────────────────────────────────────────────────
SELECT 'user_flash_missions'     AS tabla, count(*) FROM public.user_flash_missions
UNION ALL
SELECT 'exclusive_piggy_config', count(*) FROM public.exclusive_piggy_config
UNION ALL
SELECT 'cycle_completion_missions', count(*) FROM public.cycle_completion_missions;

-- ──────────────────────────────────────────────────────────
-- GUÍA RÁPIDA PARA EL ADMIN
-- ──────────────────────────────────────────────────────────
-- Para activar M8 (Oferta Flash Advanced) para un usuario:
--
--   INSERT INTO user_flash_missions
--     (user_id, mission_key, title, description, icon, piggy_type, piggy_label, extra_roi_bonus, is_active)
--   VALUES
--     ('<UUID_USUARIO>', 'm8', 'Oferta Flash Advanced', 'Compra 1 Piggy Advanced por 72h', '⚡', 'advanced', 'Piggy Advanced', 0.01, TRUE);
--
-- Para activar M9 (Oferta Flash Gold):
--
--   INSERT INTO user_flash_missions
--     (user_id, mission_key, title, description, icon, piggy_type, piggy_label, extra_roi_bonus, is_active)
--   VALUES
--     ('<UUID_USUARIO>', 'm9', 'Oferta Flash Gold', 'Compra 1 Piggy Gold por 72h', '🥇', 'gold', 'Piggy Gold', 0.02, TRUE);
--
-- Para desactivar una misión activa:
--   UPDATE user_flash_missions SET is_active = FALSE WHERE id = '<MISSION_ID>';
--
-- Para cambiar el piggy exclusivo de M10:
--   UPDATE exclusive_piggy_config
--   SET piggy_type = 'gold', piggy_label = 'Piggy Gold', extra_roi_bonus = 0.02;
--   (opciones: silver/0.01 | gold/0.02 | premium/0.03)
