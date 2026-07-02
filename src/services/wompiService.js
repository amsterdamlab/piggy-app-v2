/* ==========================================================================
   PIGGY APP — Wompi Service Wrapper (Frontend)
   Agnóstico y aislado: gestiona la carga del script WidgetCheckout de Wompi,
   la obtención de firmas criptográficas desde el servidor y la apertura
   del modal de recarga en entornos Sandbox y Producción.
   ========================================================================== */

// URL oficial del script del Widget JS de Wompi Colombia
const WOMPI_SCRIPT_URL = 'https://checkout.wompi.co/widget.js';

/**
 * Devuelve el entorno activo configurado en las variables de Vite.
 * @returns {'sandbox' | 'production'}
 */
export function getWompiEnvironment() {
  const env = import.meta.env.VITE_WOMPI_ENV || 'sandbox';
  return env.toLowerCase() === 'production' ? 'production' : 'sandbox';
}

/**
 * Devuelve la llave pública de Wompi según el entorno activo.
 * @returns {string}
 */
export function getWompiPublicKey() {
  const env = getWompiEnvironment();
  if (env === 'production') {
    return import.meta.env.VITE_WOMPI_PUB_KEY_PROD || 'pub_prod_OPvpEQEiVOBRszfS3isZNLi673cNrhFK';
  }
  return import.meta.env.VITE_WOMPI_PUB_KEY_TEST || 'pub_test_3btcuuRNe23fLB9ld2Vwq6EG0ys1LJtd';
}

/**
 * Carga dinámicamente el script de Wompi en el DOM si no está cargado.
 * @returns {Promise<boolean>}
 */
export function loadWompiScript() {
  return new Promise((resolve, reject) => {
    if (window.WidgetCheckout) {
      return resolve(true);
    }

    const existingScript = document.querySelector(`script[src="${WOMPI_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => reject(new Error('Error al cargar el script de Wompi.')));
      return;
    }

    const script = document.createElement('script');
    script.src = WOMPI_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      console.log('[Wompi Service] Script WidgetCheckout cargado exitosamente.');
      resolve(true);
    };
    script.onerror = () => {
      console.error('[Wompi Service] Error cargando script de Wompi desde', WOMPI_SCRIPT_URL);
      reject(new Error('No se pudo cargar la pasarela de pagos Wompi. Verifica tu conexión a internet.'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Solicita al servidor (/api/wompi-signature) la firma criptográfica SHA256.
 * En modo desarrollo local (Vite dev server), incluye un fallback seguro local.
 *
 * @param {string} reference - Referencia única del pago
 * @param {number} amountInCents - Monto en centavos
 * @param {string} currency - Moneda ('COP')
 * @returns {Promise<string>} Firma hex SHA256
 */
export async function fetchWompiSignature(reference, amountInCents, currency = 'COP') {
  const env = getWompiEnvironment();

  try {
    const response = await fetch('/api/wompi-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, amountInCents, currency, environment: env })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.signature) {
        return data.signature;
      }
    }
  } catch (error) {
    console.warn('[Wompi Service] No se pudo conectar con /api/wompi-signature.', error);
  }

  // Fallback para desarrollo local si /api de Vercel no está disponible localmente
  console.info('[Wompi Service] Usando generador de firma local para desarrollo (Vite Fallback)...');
  const integritySecret = env === 'production'
    ? (import.meta.env.WOMPI_INTEGRITY_SECRET_PROD || 'prod_integrity_ARUDYDydareP2WiFQ7uxk9oodL9RZiFM')
    : (import.meta.env.WOMPI_INTEGRITY_SECRET_TEST || 'test_integrity_1vZFBfPoesEb6thA7pYsFGPbh13tKcg3');

  const textToHash = `${reference}${amountInCents}${currency}${integritySecret}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(textToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Abre el Widget de Wompi para realizar una recarga en la aplicación.
 *
 * @param {Object} options
 * @param {number} options.amountInCOP - Monto en pesos colombianos (ej: 50000)
 * @param {string} options.userId - ID del usuario actual de Supabase
 * @param {Object} [options.customerData] - Datos opcionales del cliente (email, fullName, phone)
 * @returns {Promise<{ success: boolean, transaction?: Object, reason?: string }>}
 */
export async function openWompiWidget({ amountInCOP, userId, customerData = {} }) {
  if (!amountInCOP || amountInCOP <= 0) {
    return { success: false, reason: 'Monto inválido para recarga.' };
  }

  // Asegurar que el script de Wompi esté cargado
  try {
    await loadWompiScript();
  } catch (error) {
    return { success: false, reason: error.message };
  }

  if (!window.WidgetCheckout) {
    return { success: false, reason: 'El componente WidgetCheckout de Wompi no está disponible en el navegador.' };
  }

  const amountInCents = Math.round(amountInCOP * 100);
  const currency = 'COP';
  // Referencia limpia formateada para fácil extracción de userId en el webhook
  const reference = `REC_${userId || 'anon'}_${Date.now()}`;
  const publicKey = getWompiPublicKey();

  // Obtener firma de integridad
  const signatureHex = await fetchWompiSignature(reference, amountInCents, currency);
  if (!signatureHex) {
    return { success: false, reason: 'No se pudo generar la firma de seguridad criptográfica para la transacción.' };
  }

  // Configuración del objeto para instanciar el Widget
  const widgetConfig = {
    currency,
    amountInCents,
    reference,
    publicKey,
    signature: {
      integrity: signatureHex
    }
  };

  // Agregar datos del cliente si existen para mejorar UX (pre-llenado)
  if (customerData.email || customerData.fullName || customerData.phone) {
    widgetConfig.customerData = {};
    if (customerData.email) widgetConfig.customerData.email = customerData.email;
    if (customerData.fullName) widgetConfig.customerData.fullName = customerData.fullName;
    if (customerData.phone) {
      widgetConfig.customerData.phoneNumber = customerData.phone;
      widgetConfig.customerData.phoneNumberPrefix = '+57';
    }
  }

  console.log('[Wompi Service] Abriendo Widget de recarga con referencia:', reference, 'en entorno:', getWompiEnvironment());

  // Instanciar y abrir el Widget envolviéndolo en una Promesa
  return new Promise((resolve) => {
    try {
      const checkout = new window.WidgetCheckout(widgetConfig);
      
      checkout.open(function (result) {
        const tx = result && result.transaction;
        console.log('[Wompi Service] Resultado del Widget cerrado:', tx);

        if (!tx) {
          return resolve({
            success: false,
            reason: 'El proceso de pago fue cerrado o cancelado por el usuario.',
            status: 'CANCELLED'
          });
        }

        if (tx.status === 'APPROVED') {
          return resolve({
            success: true,
            transaction: tx,
            transactionId: tx.id,
            reference: tx.reference,
            amountInCOP
          });
        }

        return resolve({
          success: false,
          transaction: tx,
          transactionId: tx.id,
          reference: tx.reference,
          reason: tx.status_message || `El pago finalizó con estado: ${tx.status}`,
          status: tx.status
        });
      });
    } catch (err) {
      console.error('[Wompi Service] Excepción al ejecutar checkout.open:', err);
      resolve({ success: false, reason: 'Error inesperado al inicializar la ventana de Wompi.' });
    }
  });
}
