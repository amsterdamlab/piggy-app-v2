-- ==============================================================================
-- PIGGY APP: DESCUENTO ATÓMICO DE STOCK EN MERCADO (RPC Y PERMISOS SEGUROS)
-- Ejecuta este script en el SQL Editor de Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ELIMINAR VERSIONES PREVIAS DE LA FUNCIÓN PARA EVITAR CONFLICTO DE PARÁMETROS
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure as proc_name
        FROM pg_proc 
        WHERE proname = 'decrement_marketplace_stock'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proc_name || ' CASCADE;';
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. FUNCIÓN RPC SEGURA PARA DESCONTAR STOCK DEL MARKETPLACE
-- Permite que las compras descuenten exactamente el stock sin trabas de RLS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_marketplace_stock(
  p_item_id text,
  p_qty integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock integer;
  v_new_stock integer;
BEGIN
  IF p_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_quantity');
  END IF;

  -- 1. Bloquear la fila del marketplace para evitar condiciones de carrera (Race Conditions)
  SELECT stock INTO v_current_stock
  FROM public.marketplace
  WHERE id::text = p_item_id
  FOR UPDATE;

  -- Si no se encontró por ID directo, retornar error controlado
  IF v_current_stock IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'item_not_found', 'item_id', p_item_id);
  END IF;

  -- Validar si hay suficiente stock disponible
  IF v_current_stock < p_qty THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'insufficient_stock', 
      'current_stock', v_current_stock,
      'requested_qty', p_qty
    );
  END IF;

  -- 2. Calcular nuevo stock (mínimo 0)
  v_new_stock := GREATEST(0, v_current_stock - p_qty);

  -- 3. Actualizar la tabla marketplace
  UPDATE public.marketplace
  SET stock = v_new_stock
  WHERE id::text = p_item_id;

  RETURN jsonb_build_object(
    'success', true, 
    'item_id', p_item_id, 
    'previous_stock', v_current_stock, 
    'new_stock', v_new_stock
  );
END;
$$;

-- Otorgar permisos de ejecución a los roles de Supabase
GRANT EXECUTE ON FUNCTION public.decrement_marketplace_stock(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_marketplace_stock(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_marketplace_stock(text, integer) TO service_role;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICA RLS PARA UPDATE EN MARKETPLACE (REDUNDANCIA DE SEGURIDAD)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  -- Eliminar política previa si existe
  DROP POLICY IF EXISTS "Authenticated users can update marketplace stock" ON public.marketplace;
  
  -- Crear política que permite a usuarios autenticados actualizar stock válidamente
  CREATE POLICY "Authenticated users can update marketplace stock" 
  ON public.marketplace 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (stock >= 0);
EXCEPTION WHEN OTHERS THEN null;
END $$;
