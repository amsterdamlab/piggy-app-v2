/* ============================================
   PIGGY APP — Legal Modal Component
   Persistent modal for Terms + Habeas Data
   ============================================ */

import { renderIcon } from '../icons.js';
import { acceptTerms } from '../services/authService.js';
import { AppState } from '../state.js';

/**
 * Render the legal modal (Terms + Habeas Data).
 * This is a persistent modal — cannot be dismissed without accepting.
 */
export function renderLegalModal() {
    // Remove existing modal if any
    const existing = document.getElementById('legal-modal');
    if (existing) existing.remove();

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

        const { error } = await acceptTerms();

        if (error) {
            btnAccept.disabled = false;
            btnAccept.textContent = 'Continuar';
            alert('Error al aceptar términos: ' + error);
            return;
        }

        // Remove modal
        modal.remove();
    });
}

/**
 * Remove the legal modal.
 */
export function removeLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (modal) modal.remove();
}
