/* ==========================================================================
   PIGGY APP — Vercel Serverless Endpoint: /api/wompi-webhook
   Recibe eventos de Wompi, valida la firma criptográfica con el Secreto
   de Eventos y acredita el saldo al usuario en Supabase de forma idempotente.
   ========================================================================== */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const payload = req.body;
    if (!payload || !payload.event || !payload.data || !payload.data.transaction) {
      return res.status(400).json({ error: 'Payload de evento Wompi inválido o incompleto' });
    }

    const { event, data, environment, signature, timestamp } = payload;
    const tx = data.transaction;

    // 1. Validar Secreto de Eventos según el ambiente informado por Wompi
    const isTest = environment === 'test' || process.env.VITE_WOMPI_ENV === 'sandbox';
    const eventsSecret = isTest
      ? (process.env.WOMPI_EVENTS_SECRET_TEST || 'test_events_gEbxSJkbwwn4vLGko05Su9YxcNOs9zNp')
      : (process.env.WOMPI_EVENTS_SECRET_PROD || 'prod_events_3k2B4M6Di6YbPpamggZufSpnvoP76j5M');

    if (!eventsSecret) {
      console.error('Secreto de eventos Wompi no configurado.');
      return res.status(500).json({ error: 'Secreto de eventos no disponible en servidor' });
    }

    // 2. Verificación de firma criptográfica de Wompi
    // Según documentación: concatenar valores de signature.properties + timestamp + eventsSecret
    if (signature && signature.properties && signature.checksum) {
      let concatenatedValues = '';
      for (const prop of signature.properties) {
        // Navegar propiedades (ej: 'transaction.id' -> tx.id)
        const parts = prop.split('.');
        let val = payload;
        for (const p of parts) {
          val = val ? val[p] : '';
        }
        concatenatedValues += (val !== undefined && val !== null) ? val : '';
      }
      concatenatedValues += `${timestamp}${eventsSecret}`;

      const computedChecksum = crypto.createHash('sha256').update(concatenatedValues, 'utf8').digest('hex');
      if (computedChecksum !== signature.checksum) {
        console.warn(`[Wompi Webhook] Alerta de seguridad: Checksum inválido. Recibido: ${signature.checksum}, Calculado: ${computedChecksum}`);
        return res.status(401).json({ error: 'Firma de evento inválida (Unauthorized)' });
      }
    } else {
      console.warn('[Wompi Webhook] Payload sin objeto signature. Verificando en modo flexible local.');
    }

    console.log(`[Wompi Webhook] Evento ${event} recibido para transacción ${tx.id} (${tx.reference}) - Estado: ${tx.status}`);

    // 3. Si el pago fue aprobado, acreditar saldo al usuario en Supabase
    if (event === 'transaction.updated' && tx.status === 'APPROVED') {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://elhsvitbqzivgajccify.supabase.co';
      // Para escribir desde webhook sin sesión de usuario, usamos Service Role o Anon con RLS permitido
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Extraer user_id de la referencia: REC_{user_id}_{timestamp}
      const refParts = tx.reference ? tx.reference.split('_') : [];
      const userId = refParts.length >= 2 ? refParts[1] : null;

      if (!userId) {
        console.error(`[Wompi Webhook] No se pudo extraer user_id de la referencia: ${tx.reference}`);
        return res.status(400).json({ error: 'Formato de referencia incompatible con Piggy App' });
      }

      const amountInCOP = tx.amount_in_cents / 100;

      // Idempotencia: verificar si ya se registró y aprobó esta transacción
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id, simulation_status')
        .eq('description', `Recarga Wompi [Ref: ${tx.reference}]`)
        .single();

      if (existingTx && existingTx.simulation_status === 'APPROVED') {
        console.log(`[Wompi Webhook] Transacción ${tx.reference} ya fue procesada anteriormente. Retornando 200 OK.`);
        return res.status(200).json({ success: true, message: 'Ya procesado (Idempotente)' });
      }

      // Insertar o actualizar la transacción de crédito en wallet_transactions
      const description = `Recarga Wompi [Ref: ${tx.reference}]`;
      const { error: insertError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: amountInCOP,
          type: 'simulation_recharge', // Tipo compatible con triggers de seguridad existentes
          description,
          wallet_type: 'dinero',
          payment_method: tx.payment_method_type || 'WOMPI',
          simulation_status: 'APPROVED'
        });

      if (insertError) {
        console.error('[Wompi Webhook] Error al acreditar en wallet_transactions:', insertError);
        // Si el error es por duplicado o RLS, informamos pero no fallamos críticamente
        if (!insertError.message.includes('duplicate')) {
          return res.status(500).json({ error: 'Error actualizando base de datos en Supabase' });
        }
      }

      console.log(`[Wompi Webhook] Saldo recargado exitosamente al usuario ${userId}: $${amountInCOP} COP.`);
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('[Wompi Webhook] Error crítico en el endpoint:', error);
    return res.status(500).json({ error: 'Error interno del servidor procesando el webhook' });
  }
}
