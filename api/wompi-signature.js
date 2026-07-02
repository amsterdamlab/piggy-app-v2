/* ==========================================================================
   PIGGY APP — Vercel Serverless Endpoint: /api/wompi-signature
   Genera el hash criptográfico SHA256 para el atributo signature:integrity
   según la documentación oficial de Wompi Colombia.
   ========================================================================== */

import crypto from 'crypto';

export default async function handler(req, res) {
  // Cabeceras CORS para permitir llamadas desde el frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { reference, amountInCents, currency = 'COP', environment = 'sandbox' } = req.method === 'POST' ? req.body : req.query;

    if (!reference || !amountInCents) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios: reference, amountInCents' });
    }

    // Determinar el secreto de integridad según el entorno activo
    const isTest = environment === 'sandbox' || process.env.VITE_WOMPI_ENV === 'sandbox';
    const integritySecret = isTest 
      ? (process.env.WOMPI_INTEGRITY_SECRET_TEST || 'test_integrity_1vZFBfPoesEb6thA7pYsFGPbh13tKcg3')
      : (process.env.WOMPI_INTEGRITY_SECRET_PROD || 'prod_integrity_ARUDYDydareP2WiFQ7uxk9oodL9RZiFM');

    if (!integritySecret) {
      return res.status(500).json({ error: 'Secreto de integridad no configurado en el servidor' });
    }

    // Concatenación estricta según documentación Wompi: "<Referencia><Monto><Moneda><SecretoIntegridad>"
    const concatenated = `${reference}${amountInCents}${currency}${integritySecret}`;
    const signature = crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');

    return res.status(200).json({
      success: true,
      signature,
      reference,
      amountInCents,
      currency,
      environment: isTest ? 'sandbox' : 'production'
    });
  } catch (error) {
    console.error('Error generando firma Wompi:', error);
    return res.status(500).json({ error: 'Error interno al generar la firma criptográfica' });
  }
}
