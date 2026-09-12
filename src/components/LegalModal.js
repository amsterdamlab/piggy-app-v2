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
<h3 style="text-align:center; margin-bottom: var(--space-md); color: var(--color-primary); font-size: var(--text-lg); font-weight: 800;">
  TÉRMINOS Y CONDICIONES DE USO — PIGGY APP
</h3>

<p style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: justify; margin-bottom: var(--space-sm);">
  Los presentes Términos y Condiciones regulan el acceso, registro y uso de la plataforma digital <strong>PIGGY APP</strong>, administrada por <strong>VALLE PIGGY S.A.S.</strong> (NIT: 902.097.746-4) en alianza operativa con <strong>GRANJA VILLA MORALES DEL VALLE S.A.S.</strong> (NIT: 900.860.384-7).
</p>

<hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--space-md) 0;" />

<h4 style="color: var(--color-primary); margin-bottom: var(--space-xs); font-size: 0.95rem;">1. NATURALEZA DE LA PLATAFORMA</h4>
<p style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: justify;">
  PIGGY APP es una plataforma digital orientada a la gestión, seguimiento, trazabilidad y administración operativa de actividades agroproductivas vinculadas a procesos de crianza, custodia, engorde y comercialización de porcinos respaldados en activos agropecuarios reales. <strong>No constituye:</strong> actividad financiera, captación de recursos del público, producto financiero, inversión colectiva, oferta pública de valores ni esquema de rentabilidad garantizada.
</p>

<h4 style="color: var(--color-primary); margin-bottom: var(--space-xs); font-size: 0.95rem;">2. RESULTADO ECONÓMICO Y RIESGOS</h4>
<p style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: justify;">
  El usuario reconoce expresamente que el Resultado Económico derivado de la operación es variable, depende del comportamiento real del proceso agroproductivo y condiciones de mercado. <strong>No existe rentabilidad fija, retornos garantizados ni utilidad mínima asegurada.</strong> Toda referencia visible en la plataforma tiene carácter informativo.
</p>

<h4 style="color: var(--color-primary); margin-bottom: var(--space-xs); font-size: 0.95rem;">3. REGISTRO, CUMPLIMIENTO Y PREVENCIÓN DE FRAUDE</h4>
<p style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: justify;">
  El usuario se compromete a suministrar información veraz y actualizada, mantener reserva sobre sus credenciales y abstenerse de usos indebidos o ilícitos. LA PLATAFORMA podrá realizar validaciones de identidad, monitoreo transaccional y consultas en listas restrictivas conforme a sus políticas de cumplimiento.
</p>

<h4 style="color: var(--color-primary); margin-bottom: var(--space-xs); font-size: 0.95rem;">4. AUTORIZACIÓN DE TRATAMIENTO DE DATOS PERSONALES (HABEAS DATA)</h4>
<p style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: justify;">
  En cumplimiento de la <strong>Ley 1581 de 2012</strong>, el usuario autoriza de manera previa, expresa e informada a <strong>VALLE PIGGY S.A.S.</strong> y <strong>GRANJA VILLA MORALES DEL VALLE S.A.S.</strong> para recolectar, almacenar y tratar sus datos personales con fines de validación de identidad, administración de la relación contractual, cumplimiento regulatorio, notificaciones operativas y funcionamiento general de la plataforma.
</p>

<h4 style="color: var(--color-primary); margin-bottom: var(--space-xs); font-size: 0.95rem;">5. BONOS DE CONSUMO Y REFERIDOS DIRECTOS</h4>
<p style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: justify;">
  Los Bonos de Consumo son beneficios promocionales no monetarios aplicables exclusivamente como descuento en la Tienda de productos físicos de Piggy App. No constituyen dinero en efectivo ni son transferibles. El Programa de Referidos se rige por las reglas de Referido Directo Calificado y causación única sin jerarquías ni redes comerciales multinivel.
</p>

<p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: var(--space-md); text-align: center; font-style: italic;">
  Puedes consultar el texto legal extendido en cualquier momento en <a href="terminos-y-condiciones.html" target="_blank" style="color: var(--color-primary); font-weight: 700; text-decoration: underline;">Términos y Condiciones</a> y <a href="tratamiento-de-datos.html" target="_blank" style="color: var(--color-primary); font-weight: 700; text-decoration: underline;">Tratamiento de Datos</a>.
</p>
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
      <div class="legal-modal__header" style="position: relative;">
        <span style="font-size: 28px;">🐷</span>
        <span class="legal-modal__title">Términos y Condiciones</span>
        <button id="btn-close-legal" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 24px; cursor: pointer; color: #9ca3af; padding: 4px;">✕</button>
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
              He leído y acepto los <a href="terminos-y-condiciones.html" target="_blank" class="text-primary font-semibold" style="text-decoration: underline;">Términos y Condiciones</a> de Piggy App.
            </span>
          </label>

          <label class="checkbox" for="check-habeas">
            <input type="checkbox" class="checkbox__input" id="check-habeas" />
            <span class="checkbox__label">
              Autorizo el <a href="tratamiento-de-datos.html" target="_blank" class="text-primary font-semibold" style="text-decoration: underline;">Tratamiento de Datos Personales</a> (Habeas Data).
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

  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) {
    modalRoot.appendChild(modal);
  } else {
    document.body.appendChild(modal);
  }

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

  // Close Icon
  const btnClose = document.getElementById('btn-close-legal');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
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
