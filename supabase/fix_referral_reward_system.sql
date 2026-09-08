-- ==============================================================================
-- PIGGY APP — BLINDAJE CANÓNICO DEL SISTEMA DE RECOMPENSAS POR REFERIDOS
-- Escala Oficial:
--   - 0 a 5 referidos completados:  $20.000 COP (Nivel Bronce)
--   - 6 a 10 referidos completados: $30.000 COP (Nivel Plata)
--   - 11+ referidos completados:    $50.000 COP (Nivel Oro)
--
-- Recompensa permanente en Wallet de Bonos de Consumo (sin fecha de vencimiento)
-- Ejecutar este script en el SQL Editor de Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- ─── 1. FUNCIÓN PRINCIPAL DE PROCESAMIENTO DE REFERIDO EN PRIMERA COMPRA ───
CREATE OR REPLACE FUNCTION public.process_referral_on_purchase(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_completed_count INTEGER;
  v_commission INTEGER;
  v_tier VARCHAR(10);
  v_referred_name VARCHAR(255);
BEGIN
  -- 1. Consultar y bloquear el registro de referido si está en estado 'pending'
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = p_user_id AND status = 'pending'
  FOR UPDATE;

  -- Si no tiene referido pendiente (nunca fue referido o ya fue completado previamente), retornar
  IF NOT FOUND THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'no_pending_referral');
  END IF;

  -- 2. Contar cuántos referidos completados tiene ya el referente para definir el nivel
  SELECT COUNT(*) INTO v_completed_count
  FROM public.referrals
  WHERE referrer_id = v_referral.referrer_id AND status = 'completed';

  -- 3. Asignar comisión según la escala oficial acordada:
  --    - 0 a 5 completados:  $20.000 COP (Bronce)
  --    - 6 a 10 completados: $30.000 COP (Plata)
  --    - 11+ completados:    $50.000 COP (Oro)
  IF v_completed_count <= 5 THEN
    v_commission := 20000;
    v_tier := 'tier_1';
  ELSIF v_completed_count <= 10 THEN
    v_commission := 30000;
    v_tier := 'tier_2';
  ELSE
    v_commission := 50000;
    v_tier := 'tier_3';
  END IF;

  -- 4. Marcar el registro de referido como COMPLETADO
  UPDATE public.referrals
  SET status = 'completed',
      commission_amount = v_commission,
      commission_tier = v_tier,
      completed_at = NOW()
  WHERE id = v_referral.id;

  -- 5. Obtener el nombre del usuario referido para el concepto contable
  SELECT COALESCE(full_name, 'Usuario Referido') INTO v_referred_name
  FROM public.profiles
  WHERE id = p_user_id;

  -- 6. Acreditar la comisión en el libro contable de wallet_transactions
  --    (El trigger canónico trg_canonical_wallet_ledger acreditará profiles.consumption_balance)
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    description,
    wallet_type,
    payment_method,
    simulation_status
  ) VALUES (
    v_referral.referrer_id,
    v_commission,
    'credit',
    'Comisión de Referido: Primera compra de ' || v_referred_name,
    'consumo',
    'BONO',
    'APPROVED'
  );

  -- Sincronizar también profiles.referral_balance por compatibilidad legacy
  UPDATE public.profiles
  SET referral_balance = COALESCE(referral_balance, 0) + v_commission
  WHERE id = v_referral.referrer_id;

  RETURN jsonb_build_object(
    'triggered', true,
    'referrer_id', v_referral.referrer_id,
    'commission', v_commission,
    'tier', v_tier,
    'referred_name', v_referred_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_referral_on_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_on_purchase(UUID) TO service_role;

-- ─── 2. TRIGGER AUTOMÁTICO EN LA TABLA PIGGIES (AFTER INSERT) ───
-- Garantiza que CUALQUIER inserción de un Piggy (mercado, flash missions, ciclo, directos)
-- evalúe y procese de inmediato la comisión si el usuario tenía un referido pendiente.
CREATE OR REPLACE FUNCTION public.handle_piggy_insert_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.process_referral_on_purchase(NEW.user_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Asegurar que un fallo no bloquee la compra del cerdo, pero quede registrado
  RAISE WARNING 'Error en handle_piggy_insert_referral para usuario %: %', NEW.user_id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_piggy_insert_referral ON public.piggies;
CREATE TRIGGER trg_handle_piggy_insert_referral
AFTER INSERT ON public.piggies
FOR EACH ROW
EXECUTE FUNCTION public.handle_piggy_insert_referral();

GRANT EXECUTE ON FUNCTION public.handle_piggy_insert_referral() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_piggy_insert_referral() TO service_role;

-- ─── 3. RECONCILIACIÓN RETROACTIVA AUTOMÁTICA ───
-- Busca todos los referidos en estado 'pending' que ya tengan al menos 1 Piggy comprado
-- y procesa automáticamente la aprobación y liquidación de su recompensa.
DO $$
DECLARE
  v_pending RECORD;
  v_res JSONB;
  v_reconciled_count INTEGER := 0;
BEGIN
  FOR v_pending IN
    SELECT r.id, r.referred_id, r.referrer_id, p.full_name
    FROM public.referrals r
    JOIN public.profiles p ON p.id = r.referred_id
    WHERE r.status = 'pending'
      AND EXISTS (SELECT 1 FROM public.piggies WHERE user_id = r.referred_id)
  LOOP
    v_res := public.process_referral_on_purchase(v_pending.referred_id);
    IF (v_res->>'triggered')::boolean = true THEN
      v_reconciled_count := v_reconciled_count + 1;
      RAISE NOTICE 'Referido [%] de % procesado exitosamente: Comisión $%', 
        v_pending.referred_id, v_pending.full_name, v_res->>'commission';
    END IF;
  END LOOP;

  RAISE NOTICE '=== TOTAL DE REFERIDOS RECONCILIADOS Y APROBADOS: % ===', v_reconciled_count;
END $$;
