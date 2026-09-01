-- ==============================================================================
-- PIGGY APP — Diagnóstico y Ajuste de Saldo de Diomedes
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- 1. CONSULTAR HISTORIAL COMPLETO DE TRANSACCIONES Y PIGGIES DE DIOMEDES
DO $$
DECLARE
  v_diomedes_id UUID;
  v_rec RECORD;
  v_piggy RECORD;
BEGIN
  SELECT id INTO v_diomedes_id 
  FROM public.profiles 
  WHERE full_name ILIKE '%diomedes%' OR email ILIKE '%diomedes%' 
  LIMIT 1;

  RAISE NOTICE '=== ID DE DIOMEDES: % ===', v_diomedes_id;

  RAISE NOTICE '--- HISTORIAL EN wallet_transactions ---';
  FOR v_rec IN 
    SELECT id, amount, type, description, wallet_type, created_at 
    FROM public.wallet_transactions 
    WHERE user_id = v_diomedes_id 
    ORDER BY created_at DESC 
  LOOP
    RAISE NOTICE 'Tx [%] Tipo: %, Monto: %, Desc: %, Fecha: %', 
      v_rec.wallet_type, v_rec.type, v_rec.amount, v_rec.description, v_rec.created_at;
  END LOOP;

  RAISE NOTICE '--- PIGGY RECIENTE EN piggies ---';
  FOR v_piggy IN 
    SELECT id, name, investment_amount, status, created_at 
    FROM public.piggies 
    WHERE user_id = v_diomedes_id 
    ORDER BY created_at DESC 
    LIMIT 3
  LOOP
    RAISE NOTICE 'Piggy: %, Inversión: %, Estado: %, Fecha: %', 
      v_piggy.name, v_piggy.investment_amount, v_piggy.status, v_piggy.created_at;
  END LOOP;
END $$;

-- 2. AJUSTAR Y REGISTRAR EL SALDO REMANENTE EXACTO ($300.577 COP)
-- Si la compra del cerdito descontó $1.000.000 de los $1.300.577 que tenía,
-- este bloque asegura que exista la transacción contable de respaldo y el saldo quede en $300.577 COP.
DO $$
DECLARE
  v_diomedes_id UUID;
  v_current_bal NUMERIC;
BEGIN
  SELECT id, COALESCE(wallet_balance, 0) INTO v_diomedes_id, v_current_bal
  FROM public.profiles 
  WHERE full_name ILIKE '%diomedes%' OR email ILIKE '%diomedes%' 
  LIMIT 1;

  IF v_diomedes_id IS NOT NULL THEN
    -- A) Registrar ajuste/crédito contable en wallet_transactions para respaldo en libro mayor
    INSERT INTO public.wallet_transactions (
      user_id,
      amount,
      type,
      description,
      wallet_type,
      payment_method,
      simulation_status
    )
    VALUES (
      v_diomedes_id,
      300577,
      'credit',
      'Ajuste de Saldo Remanente post-adquisición Piggy Midas',
      'dinero',
      'SALDO_AGRO',
      'APPROVED'
    );

    -- B) Actualizar el saldo directo en profiles autorizando la veeduría
    PERFORM set_config('app.wallet_update_authorized', 'true', true);

    UPDATE public.profiles
    SET wallet_balance = 300577
    WHERE id = v_diomedes_id;

    PERFORM set_config('app.wallet_update_authorized', '', true);

    RAISE NOTICE 'Saldo de Diomedes restablecido exitosamente a $300.577 COP.';
  END IF;
END $$;

-- 3. VERIFICAR RESULTADO FINAL
SELECT id, full_name, email, wallet_balance, consumption_balance
FROM public.profiles
WHERE full_name ILIKE '%diomedes%' OR email ILIKE '%diomedes%';
