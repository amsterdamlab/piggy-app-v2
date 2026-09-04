-- ==============================================================================
-- PIGGY APP: SCRIPT DE LIMPIEZA DE PIGGYS DUPLICADOS
-- Ejecuta este script en el SQL Editor de Supabase (Dashboard -> SQL Editor)
-- Identifica y elimina duplicados creados con pocos segundos de diferencia
-- ==============================================================================

DO $$
DECLARE
  v_dup_record RECORD;
  v_deleted_count INT := 0;
BEGIN
  -- 1. Buscar piggies duplicados creados para el mismo usuario con el mismo nombre
  -- conservando el más antiguo (el creado originalmente por el RPC o primer insert)
  FOR v_dup_record IN
    WITH ranked_piggies AS (
      SELECT 
        id, 
        user_id, 
        name, 
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, name, investment_amount, status
          ORDER BY created_at ASC
        ) as rank_num
      FROM public.piggies
      WHERE status = 'engorde'
    )
    SELECT id, user_id, name, created_at
    FROM ranked_piggies
    WHERE rank_num > 1
  LOOP
    -- Eliminar el registro duplicado sobrante
    DELETE FROM public.piggies WHERE id = v_dup_record.id;
    v_deleted_count := v_deleted_count + 1;
    RAISE NOTICE 'Piggy duplicado eliminado: ID %, Nombre "%", Usuario %', v_dup_record.id, v_dup_record.name, v_dup_record.user_id;
  END LOOP;

  RAISE NOTICE 'Total de piggies duplicados eliminados: %', v_deleted_count;
END $$;
