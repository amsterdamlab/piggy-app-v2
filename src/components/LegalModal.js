/* ============================================
   PIGGY APP — Legal Modal Component
   Persistent modal for Terms + Habeas Data
   Full scrollable legal text with acceptance
   ============================================ */

import { acceptTerms } from '../services/authService.js';
import { AppState } from '../state.js';

/** @type {Function|null} */
let pendingOnAccept = null;

/** @type {Function|null} */
let pendingOnReject = null;

/**
 * Full legal text for Terms, Conditions, and Data Treatment.
 */
const LEGAL_TEXT = `
<h3 style="text-align:center; margin-bottom: var(--space-md); color: var(--color-primary); font-size: var(--text-lg);">
  TÉRMINOS, CONDICIONES Y TRATAMIENTO DE DATOS — PIGGY
</h3>

<p>Al crear una cuenta en la aplicación <strong>PIGGY APP</strong>, usted (en adelante, el <strong>USUARIO</strong>) acepta de manera libre, expresa e informada los siguientes términos contractuales y la autorización de tratamiento de sus datos personales.</p>

<hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--space-lg) 0;" />

<h4 style="color: var(--color-primary); margin-bottom: var(--space-sm);">PARTE I: AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES (HABEAS DATA)</h4>

<p>En cumplimiento de la <strong>Ley 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong>, el USUARIO autoriza a <strong>PIGGY S.A.S.</strong> y a sus aliados operativos <strong>GRANJA VILLA MORALES</strong> para recolectar, almacenar, circular y utilizar sus datos personales (nombre completo, correo electrónico, número de teléfono móvil y ubicación) para las siguientes finalidades:</p>

<ol style="padding-left: var(--space-lg); margin: var(--space-md) 0;">
  <li style="margin-bottom: var(--space-sm);"><strong>Gestión de Cuenta:</strong> Creación, mantenimiento y administración del perfil del usuario en la plataforma.</li>
  <li style="margin-bottom: var(--space-sm);"><strong>Notificaciones Operativas:</strong> Envío de actualizaciones críticas sobre el estado de los activos (peso, salud, avisos de liquidación) a través de WhatsApp, SMS, correos electrónicos y notificaciones push.</li>
  <li style="margin-bottom: var(--space-sm);"><strong>Gestión Comercial y Financiera:</strong> Procesamiento de pagos de adopción, transferencias de utilidades y coordinación logística para la entrega de productos cárnicos.</li>
  <li style="margin-bottom: var(--space-sm);"><strong>Seguridad:</strong> Verificación de identidad y prevención de fraudes.</li>
</ol>

<p>El USUARIO declara conocer que tiene derecho a conocer, actualizar y rectificar sus datos personales, así como a revocar esta autorización en cualquier momento, siempre que no exista un vínculo contractual activo que lo impida.</p>

<hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--space-lg) 0;" />

<h4 style="color: var(--color-primary); margin-bottom: var(--space-sm);">PARTE II: CONTRATO DE ADHESIÓN — COMPRAVENTA DE ACTIVO PRODUCTIVO PORCINO</h4>

<h5 style="margin: var(--space-md) 0 var(--space-xs);">1. OBJETO</h5>
<p>El presente contrato regula la adquisición de una <strong>Unidad Productiva Porcina Estándar (UPPE)</strong> por parte del USUARIO. El activo representa un derecho económico sobre el resultado del engorde y comercialización de carne de cerdo procesada al finalizar un ciclo productivo real.</p>

<h5 style="margin: var(--space-md) 0 var(--space-xs);">2. PRECIO Y PAGO ÚNICO</h5>
<p>El valor de cada UPPE es de <strong>UN MILLÓN DE PESOS M/CTE ($1.000.000 COP)</strong>, pagaderos en una sola cuota mediante los canales de recaudo de la plataforma. El dinero es recibido directamente por la operación de la granja aliada para su puesta en marcha inmediata.</p>

<h5 style="margin: var(--space-md) 0 var(--space-xs);">3. CICLO PRODUCTIVO Y RENTABILIDAD</h5>
<ul style="padding-left: var(--space-lg); margin: var(--space-sm) 0;">
  <li style="margin-bottom: var(--space-xs);"><strong>Duración:</strong> El ciclo de engorde y comercialización es de cuatro (4) meses y tres (3) semanas.</li>
  <li style="margin-bottom: var(--space-xs);"><strong>Márgenes Comerciales:</strong> La rentabilidad se basa en el volumen de activos:
    <ul style="padding-left: var(--space-md); margin-top: var(--space-xs);">
      <li>1 Piggy: 8% de margen.</li>
      <li>2 Piggies: 9% de margen.</li>
      <li>3 o más Piggies: 10% de margen.</li>
    </ul>
  </li>
</ul>

<h5 style="margin: var(--space-md) 0 var(--space-xs);">4. OPCIONES DE SALIDA</h5>
<p>Al finalizar el ciclo, el USUARIO elegirá entre:</p>
<ul style="padding-left: var(--space-lg); margin: var(--space-sm) 0;">
  <li style="margin-bottom: var(--space-xs);"><strong>Comercialización:</strong> Recibir el capital inicial más el margen de rentabilidad en su billetera digital.</li>
  <li style="margin-bottom: var(--space-xs);"><strong>Consumo:</strong> Recibir el equivalente en cortes de carne premium (capital + rentabilidad) a precio de mayorista, con envío a domicilio (Cali y áreas aledañas, o nacional con cargo al usuario). El peso final de la carne dependerá del rendimiento biológico digital del ciclo.</li>
</ul>

<h5 style="margin: var(--space-md) 0 var(--space-xs);">5. NATURALEZA DEL CONTRATO</h5>
<p>Las partes acuerdan que esta es una operación de <strong>economía real</strong> (Compraventa de cosa futura con mandato de gestión). No constituye captación masiva de dinero ni una inversión financiera. El respaldo del capital es el inventario físico de cárnicos comercializable por parte de <strong>GRANJA VILLA MORALES</strong>.</p>

<h5 style="margin: var(--space-md) 0 var(--space-xs);">6. CANCELACIÓN ANTICIPADA</h5>
<p>El USUARIO puede vender su activo en el Marketplace interno. Si solicita el retiro del capital antes de finalizar el ciclo sin haber concretado una venta entre usuarios, se aplicará una penalidad del <strong>diez por ciento (10%)</strong> por ruptura de ciclo productivo.</p>

<h5 style="margin: var(--space-md) 0 var(--space-xs);">7. JURISDICCIÓN</h5>
<p>Para todos los efectos legales, el domicilio del contrato es la ciudad de <strong>Cali, Colombia</strong>.</p>
`;

/**
 * Render the legal modal (Terms + Habeas Data).
 * Full scrollable legal text with checkboxes at the bottom.
 *
 * @param {Object} [options]
 * @param {Function} [options.onAccept] - Called when user accepts (callback mode / pre-signup).
 * @param {Function} [options.onReject] - Called when user cancels (callback mode only).
 */
export function renderLegalModal(options = {}) {
    pendingOnAccept = options.onAccept || null;
    pendingOnReject = options.onReject || null;

    // Remove existing modal if any
    const existing = document.getElementById('legal-modal');
    if (existing) existing.remove();

    const isCallbackMode = !!pendingOnAccept;

    const modal = document.createElement('div');
    modal.id = 'legal-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal legal-modal">
      <div class="modal__handle"></div>

      <!-- Header -->
      <div class="legal-modal__header">
        <span style="font-size: 28px;">🐷</span>
        <span class="legal-modal__title">Términos y Condiciones</span>
      </div>

      <!-- Scrollable Legal Text -->
      <div class="legal-modal__scroll" id="legal-scroll-area">
        ${LEGAL_TEXT}
      </div>

      <!-- Acceptance Section (fixed at bottom) -->
      <div class="legal-modal__footer">
        <div class="legal-checkbox-group">
          <label class="checkbox" for="check-terms">
            <input type="checkbox" class="checkbox__input" id="check-terms" />
            <span class="checkbox__label">
              He leído y acepto los <strong class="text-primary">Términos y Condiciones</strong> de Piggy App.
            </span>
          </label>

          <label class="checkbox" for="check-habeas">
            <input type="checkbox" class="checkbox__input" id="check-habeas" />
            <span class="checkbox__label">
              Autorizo el <strong class="text-primary">Tratamiento de Datos Personales</strong> (Habeas Data).
            </span>
          </label>
        </div>

        <button
          class="btn btn--primary btn--block"
          id="btn-accept-terms"
          disabled
        >
          Aceptar y Continuar
        </button>

        ${isCallbackMode ? `
          <button class="btn btn--secondary btn--block mt-sm" id="btn-reject-terms">
            Cancelar
          </button>
        ` : ''}
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    // Checkbox logic
    const checkTerms = document.getElementById('check-terms');
    const checkHabeas = document.getElementById('check-habeas');
    const btnAccept = document.getElementById('btn-accept-terms');

    function updateButtonState() {
        const allChecked = checkTerms.checked && checkHabeas.checked;
        btnAccept.disabled = !allChecked;
    }

    checkTerms.addEventListener('change', updateButtonState);
    checkHabeas.addEventListener('change', updateButtonState);

    // Accept terms
    btnAccept.addEventListener('click', async () => {
        btnAccept.disabled = true;
        btnAccept.innerHTML = '<span class="spinner" style="width:24px;height:24px;border-width:2px;"></span>';

        if (pendingOnAccept) {
            // Callback mode: let the caller handle what happens next
            await pendingOnAccept();
            modal.remove();
            pendingOnAccept = null;
            pendingOnReject = null;
        } else {
            // State mode: update profile in Supabase
            const { error } = await acceptTerms();
            if (error) {
                btnAccept.disabled = false;
                btnAccept.textContent = 'Aceptar y Continuar';
                alert('Error al aceptar términos: ' + error);
                return;
            }
            modal.remove();
        }
    });

    // Reject/Cancel (callback mode only)
    const btnReject = document.getElementById('btn-reject-terms');
    if (btnReject) {
        btnReject.addEventListener('click', () => {
            modal.remove();
            if (pendingOnReject) {
                pendingOnReject();
                pendingOnReject = null;
                pendingOnAccept = null;
            }
        });
    }
}

/**
 * Remove the legal modal.
 */
export function removeLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (modal) modal.remove();
    pendingOnAccept = null;
    pendingOnReject = null;
}
