/* ============================================
   PIGGY APP — Legal Modal Component
   Persistent modal for Terms + Habeas Data
   Supports callback mode (pre-signup) and
   state mode (post-login session check)
   ============================================ */

import { renderIcon } from '../icons.js';
import { acceptTerms } from '../services/authService.js';
import { AppState } from '../state.js';

/** @type {Function|null} */
let pendingOnAccept = null;

/** @type {Function|null} */
let pendingOnReject = null;

/**
 * Render the legal modal (Terms + Habeas Data).
 * This is a persistent modal — cannot be dismissed without accepting.
 *
 * @param {Object} [options]
 * @param {Function} [options.onAccept] - Called when user accepts. If provided, modal works in "callback mode" (pre-signup).
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
    <div class="modal">
      <div class="modal__handle"></div>
      <div class="modal__title">
        ${renderIcon('shield', '', '24')}
        Términos Legales
      </div>
      <p class="text-sm text-muted mb-md" style="line-height:var(--leading-relaxed);">
        Para continuar usando Piggy App, debes aceptar nuestros términos y autorizar el tratamiento de tus datos personales según la Ley 1581 de 2012.
      </p>

      <div class="legal-checkbox-group">
        <label class="checkbox" for="check-terms">
          <input type="checkbox" class="checkbox__input" id="check-terms" />
          <span class="checkbox__label">
            Acepto los <a href="#" class="text-primary font-semibold">Términos y Condiciones</a> de uso de la plataforma Piggy App.
          </span>
        </label>

        <label class="checkbox" for="check-habeas">
          <input type="checkbox" class="checkbox__input" id="check-habeas" />
          <span class="checkbox__label">
            Autorizo el <a href="#" class="text-primary font-semibold">Tratamiento de Datos Personales</a> (Habeas Data) según la normativa colombiana vigente.
          </span>
        </label>
      </div>

      <button
        class="btn btn--primary btn--block mt-lg"
        id="btn-accept-terms"
        disabled
      >
        Continuar
      </button>

      ${isCallbackMode ? `
        <button class="btn btn--secondary btn--block mt-sm" id="btn-reject-terms">
          Cancelar
        </button>
      ` : ''}

      <p class="text-xs text-muted text-center mt-md" style="line-height:var(--leading-relaxed);">
        Al aceptar, confirmas que has leído y comprendido nuestras políticas de privacidad y tratamiento de datos.
      </p>
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
                btnAccept.textContent = 'Continuar';
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
