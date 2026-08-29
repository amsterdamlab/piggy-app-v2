-- ============================================================================
-- PIGGY APP — Actualización de Textos Personalizables para Misiones Flash (M8)
-- Permite al Administrador definir título de beneficio, descripción de beneficio,
-- nombre comercial y duración en días para campañas Flash (30d, 45d, 60d, etc.).
-- ============================================================================

-- 1. Agregar columnas para textos personalizados a user_flash_missions
ALTER TABLE public.user_flash_missions
    ADD COLUMN IF NOT EXISTS benefit_title TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS benefit_description TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS piggy_name TEXT DEFAULT NULL;

-- 2. Función RPC para que el Administrador asigne una Misión Flash con textos personalizables
CREATE OR REPLACE FUNCTION public.admin_assign_flash_mission(
    p_user_id UUID,
    p_piggy_type TEXT,
    p_price NUMERIC DEFAULT 1000000,
    p_extra_roi NUMERIC DEFAULT 0,
    p_cycle_days INT DEFAULT 30,
    p_benefit_title TEXT DEFAULT NULL,
    p_benefit_description TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_piggy_name TEXT DEFAULT NULL,
    p_hours_duration INT DEFAULT 72
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mission_id BIGINT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_expires_at := NOW() + (p_hours_duration || ' hours')::INTERVAL;

    -- Desactivar misiones flash previas activas del mismo tipo para este usuario
    UPDATE public.user_flash_missions
    SET is_active = FALSE
    WHERE user_id = p_user_id 
      AND piggy_type = p_piggy_type 
      AND is_active = TRUE;

    -- Insertar la nueva misión flash con todos sus textos y atributos
    INSERT INTO public.user_flash_missions (
        user_id,
        piggy_type,
        price,
        extra_roi_bonus,
        cycle_duration_days,
        benefit_title,
        benefit_description,
        description,
        piggy_name,
        is_active,
        is_completed,
        created_at,
        activated_at,
        expires_at
    ) VALUES (
        p_user_id,
        p_piggy_type,
        p_price,
        p_extra_roi,
        p_cycle_days,
        p_benefit_title,
        p_benefit_description,
        p_description,
        p_piggy_name,
        TRUE,
        FALSE,
        NOW(),
        NOW(),
        v_expires_at
    )
    RETURNING id INTO v_mission_id;

    RETURN jsonb_build_object(
        'success', true,
        'mission_id', v_mission_id,
        'user_id', p_user_id,
        'piggy_type', p_piggy_type,
        'expires_at', v_expires_at
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 3. Otorgar permisos de ejecución para la función de asignación
GRANT EXECUTE ON FUNCTION public.admin_assign_flash_mission(
    UUID, TEXT, NUMERIC, NUMERIC, INT, TEXT, TEXT, TEXT, TEXT, INT
) TO authenticated, service_role;

-- 4. Actualizar misiones activas existentes para garantizar consistencia
UPDATE public.user_flash_missions
SET 
    benefit_title = COALESCE(benefit_title, 'Retorno en Solo ' || cycle_duration_days || ' Días'),
    benefit_description = COALESCE(benefit_description, 'Ciclo acelerado de ' || cycle_duration_days || ' días con el mismo 11.5% de retorno.'),
    description = COALESCE(description, 'Un ciclo intensivo de ' || cycle_duration_days || ' días que maximiza tu tiempo de producción.'),
    piggy_name = COALESCE(piggy_name, 'Piggy Avanzado (' || cycle_duration_days || ' Días)')
WHERE is_active = TRUE 
  AND benefit_title IS NULL;

-- Notificación de éxito
COMMENT ON TABLE public.user_flash_missions IS 'Almacena misiones flash personalizadas asignadas a usuarios con soporte de textos y duraciones dinámicas.';
