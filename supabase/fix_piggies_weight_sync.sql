-- ==============================================================================
-- PIGGY APP — Alineación y Sincronización Definitiva de Pesos en piggies
-- Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Poblar final_weight en los cerditos que lo tengan NULL según su categoría/bono
UPDATE public.piggies
SET final_weight = CASE
  WHEN category ILIKE '%premium%' OR extra_roi_bonus >= 0.03 THEN 115.0
  WHEN category ILIKE '%dorado%' OR category ILIKE '%gold%' OR extra_roi_bonus >= 0.02 THEN 105.0
  WHEN category ILIKE '%plus%' OR category ILIKE '%silver%' OR extra_roi_bonus >= 0.01 THEN 95.0
  ELSE 85.0
END
WHERE final_weight IS NULL OR final_weight <= 0;

-- 2. Recalcular current_weight actual para corregir cerditos desfasados
UPDATE public.piggies
SET current_weight = CASE
  WHEN status = 'completado' OR end_date <= NOW() THEN COALESCE(final_weight, 85.0)
  ELSE ROUND((6.0 + (COALESCE(final_weight, 85.0) - 6.0) * 
    LEAST(1.0, GREATEST(0.0, (144.0 - GREATEST(0.0, EXTRACT(EPOCH FROM (end_date - NOW())) / 86400.0)) / 144.0))
  )::numeric, 1)
END;

-- 3. Actualizar la función RPC sync_piggy_weights con la fórmula biológica alineada al frontend
CREATE OR REPLACE FUNCTION public.sync_piggy_weights(p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_total_cycle_days numeric := 144.0;
  v_min_weight numeric := 6.0;
BEGIN
  -- 🔒 Verificación de seguridad: Prevenir suplantación
  IF p_user_id IS NOT NULL AND auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Operación no permitida: Suplantación de identidad';
  END IF;

  IF p_user_id IS NOT NULL THEN
    -- Actualizar cerditos en engorde del usuario
    UPDATE public.piggies
    SET current_weight = CASE
      WHEN status = 'completado' OR end_date <= NOW() THEN COALESCE(final_weight, 85.0)
      ELSE ROUND((v_min_weight + (COALESCE(final_weight, 85.0) - v_min_weight) * 
        LEAST(1.0, GREATEST(0.0, (v_total_cycle_days - GREATEST(0.0, EXTRACT(EPOCH FROM (end_date - NOW())) / 86400.0)) / v_total_cycle_days))
      )::numeric, 1)
    END
    WHERE status = 'engorde' AND user_id = p_user_id;
  ELSE
    -- Actualizar todos los cerditos (para pg_cron o mantenimiento)
    UPDATE public.piggies
    SET current_weight = CASE
      WHEN status = 'completado' OR end_date <= NOW() THEN COALESCE(final_weight, 85.0)
      ELSE ROUND((v_min_weight + (COALESCE(final_weight, 85.0) - v_min_weight) * 
        LEAST(1.0, GREATEST(0.0, (v_total_cycle_days - GREATEST(0.0, EXTRACT(EPOCH FROM (end_date - NOW())) / 86400.0)) / v_total_cycle_days))
      )::numeric, 1)
    END
    WHERE status = 'engorde';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_piggy_weights TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_piggy_weights TO service_role;
